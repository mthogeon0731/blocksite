import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BlockData, Notice, NoticeInput, Photo, SiteConfig } from './schema';
import { MIME, type Fail, type PhotoInput, type Store } from './store';

// Supabase(Postgres + Storage) 저장소. 스키마: supabase/migrations/0001_init.sql, 버킷 photos(공개 읽기).
// 서버 라우트에서만 쓴다(service role). 클라이언트에 이 키를 노출하지 않는다.
// ⚠ 2026-11-03 기준 실제 프로젝트로 검증하지 못함(키 없음). 키를 넣은 뒤 `node scripts/check-rules.mjs` 33건으로 확인할 것.
const BUCKET = 'photos';

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

type NoticeRow = { id: string; title: string; body: string; created_at: string };
type PhotoRow = { id: string; storage_path: string; caption: string };

const now = () => new Date().toISOString();
const fail = (e: { message: string }): never => {
  throw new Error(`Supabase: ${e.message}`);
};
const toNotice = ({ id, title, body, created_at }: NoticeRow): Notice => ({ id, title, body, created_at });
const toPhoto = ({ id, storage_path, caption }: PhotoRow): Photo => ({
  id,
  url: sb().storage.from(BUCKET).getPublicUrl(storage_path).data.publicUrl,
  caption,
});

async function getSite(id: string): Promise<SiteConfig | null> {
  const { data, error } = await sb().from('sites').select('config').eq('id', id).maybeSingle();
  if (error) fail(error);
  return (data?.config as SiteConfig | undefined) ?? null;
}

async function getSiteBySlug(slug: string): Promise<SiteConfig | null> {
  const { data, error } = await sb().from('sites').select('config').eq('slug', slug).maybeSingle();
  if (error) fail(error);
  return (data?.config as SiteConfig | undefined) ?? null;
}

// 7절 7번: 사라지는 블록에 묶인 공지·사진이 있으면 거부
async function orphanCheck(config: SiteConfig): Promise<Fail | null> {
  const ids = Object.keys(config.blocks);
  for (const [table, kind, unit] of [
    ['notices', '공지', '건'],
    ['photos', '사진', '장'],
  ] as const) {
    let q = sb().from(table).select('block_id').eq('site_id', config.siteId);
    if (ids.length) q = q.not('block_id', 'in', `(${ids.join(',')})`); // 블록 id는 [\w-]+ 라서 그대로 넣어도 된다
    const { data, error } = await q;
    if (error) fail(error);
    const rows = (data ?? []) as { block_id: string }[];
    if (rows.length === 0) continue;
    const count = rows.filter((r) => r.block_id === rows[0].block_id).length;
    return { error: `이 블록에 ${kind} ${count}${unit}이 있어요. 시제품에서는 데이터가 있는 블록을 삭제할 수 없어요.`, status: 400 };
  }
  return null;
}

async function putSite(config: SiteConfig): Promise<{ updatedAt: string } | Fail> {
  const prev = await getSite(config.siteId);
  // R7: 기능 연결 상태는 connectBlock으로만 바뀐다
  for (const [id, block] of Object.entries(config.blocks)) {
    if (!('feature' in block)) continue;
    const old = prev?.blocks[id];
    block.feature.connected = old && 'feature' in old ? old.feature.connected : false;
  }
  const orphan = await orphanCheck(config);
  if (orphan) return orphan;
  const updated_at = now();
  const { error } = await sb().from('sites').upsert({ id: config.siteId, slug: config.slug, config, updated_at });
  if (error) fail(error);
  return { updatedAt: updated_at };
}

async function connectBlock(siteId: string, blockId: string): Promise<{ ok: true } | Fail> {
  const config = await getSite(siteId);
  if (!config) return { error: '사이트를 찾을 수 없어요', status: 404 };
  const block = config.blocks[blockId];
  if (!block || !('feature' in block)) return { error: '기능을 연결할 수 있는 블록이 아니에요', status: 400 };
  block.feature.connected = true;
  const { error } = await sb().from('sites').update({ config, updated_at: now() }).eq('id', siteId);
  if (error) fail(error);
  return { ok: true };
}

// 블록 존재 + 종류 + 연결됨
async function requireConnected(siteId: string, blockId: string, type: 'notices' | 'photos'): Promise<Fail | null> {
  const config = await getSite(siteId);
  if (!config) return { error: '사이트를 찾을 수 없어요', status: 404 };
  const block = config.blocks[blockId];
  if (!block || block.type !== type) return { error: type === 'notices' ? '공지사항 블록이 아니에요' : '사진 블록이 아니에요', status: 400 };
  if (!block.feature.connected)
    return { error: type === 'notices' ? '공지 올리기 기능이 아직 연결되지 않았어요' : '사진 올리기 기능이 아직 연결되지 않았어요', status: 403 };
  return null;
}

async function listNotices(siteId: string, blockId: string): Promise<Notice[]> {
  const { data, error } = await sb()
    .from('notices')
    .select('id,title,body,created_at')
    .eq('site_id', siteId)
    .eq('block_id', blockId)
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return ((data ?? []) as NoticeRow[]).map(toNotice);
}

async function addNotice(input: NoticeInput): Promise<Notice | Fail> {
  const denied = await requireConnected(input.siteId, input.blockId, 'notices');
  if (denied) return denied;
  const { data, error } = await sb()
    .from('notices')
    .insert({ site_id: input.siteId, block_id: input.blockId, title: input.title, body: input.body })
    .select('id,title,body,created_at')
    .single();
  if (error) fail(error);
  return toNotice(data as NoticeRow);
}

async function deleteNotice(id: string): Promise<boolean> {
  const { data, error } = await sb().from('notices').delete().eq('id', id).select('id');
  if (error) fail(error);
  return (data?.length ?? 0) > 0;
}

async function listPhotos(siteId: string, blockId: string): Promise<Photo[]> {
  const { data, error } = await sb()
    .from('photos')
    .select('id,storage_path,caption')
    .eq('site_id', siteId)
    .eq('block_id', blockId)
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return ((data ?? []) as PhotoRow[]).map(toPhoto);
}

async function addPhoto(input: PhotoInput): Promise<Photo | Fail> {
  const denied = await requireConnected(input.siteId, input.blockId, 'photos');
  if (denied) return denied;
  const id = randomUUID();
  const storage_path = `${input.siteId}/${input.blockId}/${id}.${input.ext}`;
  const up = await sb().storage.from(BUCKET).upload(storage_path, input.bytes, { contentType: MIME[input.ext], upsert: false });
  if (up.error) fail(up.error);
  const { data, error } = await sb()
    .from('photos')
    .insert({ id, site_id: input.siteId, block_id: input.blockId, storage_path, caption: input.caption })
    .select('id,storage_path,caption')
    .single();
  if (error) fail(error);
  return toPhoto(data as PhotoRow);
}

async function deletePhoto(id: string): Promise<boolean> {
  const { data, error } = await sb().from('photos').delete().eq('id', id).select('storage_path');
  if (error) fail(error);
  const row = (data ?? [])[0] as { storage_path: string } | undefined;
  if (!row) return false;
  await sb().storage.from(BUCKET).remove([row.storage_path]);
  return true;
}

async function loadBlockData(config: SiteConfig): Promise<BlockData> {
  const notices: Record<string, Notice[]> = {};
  const photos: Record<string, Photo[]> = {};
  for (const [id, block] of Object.entries(config.blocks)) {
    if (block.type === 'notices' && block.feature.connected) notices[id] = await listNotices(config.siteId, id);
    if (block.type === 'photos' && block.feature.connected) photos[id] = await listPhotos(config.siteId, id);
  }
  return { notices, photos };
}

export const store: Store = {
  getSite,
  getSiteBySlug,
  putSite,
  connectBlock,
  listNotices,
  addNotice,
  deleteNotice,
  listPhotos,
  addPhoto,
  deletePhoto,
  loadBlockData,
};
