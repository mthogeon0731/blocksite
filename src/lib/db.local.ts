import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { parseSiteConfig, type BlockData, type Notice, type NoticeInput, type Photo, type SiteConfig } from './schema';
import type { Fail, PhotoInput, Store } from './store';
import { SEED_SITE } from './seed';

// ponytail: 로컬 JSON 파일 저장소 + 로컬 업로드 폴더. 단일 프로세스 가정, 인스턴스가 여럿이면 db.supabase.ts로.
const FILE = path.join(process.cwd(), '.data', 'db.json');
export const UPLOAD_DIR = path.join(process.cwd(), '.data', 'uploads');

// R3: 공지·사진은 site_id + block_id로만 묶인다. 위치 정보 없음.
interface StoredNotice extends Notice {
  site_id: string;
  block_id: string;
}
interface StoredPhoto {
  id: string;
  site_id: string;
  block_id: string;
  storage_path: string; // {site_id}/{block_id}/{uuid}.{ext}
  caption: string;
  created_at: string;
}
// 저장된 config는 v1(자리 4개)일 수 있다. 읽을 때 parseSiteConfig가 v2로 바꾸고, 첫 저장 때 v2로 덮인다.
// 여기서 직접 만지는 slug·blocks는 v1·v2 모양이 같다.
type StoredConfig = Pick<SiteConfig, 'slug' | 'blocks'>;
type Db = {
  sites: Record<string, { config: StoredConfig; updated_at: string }>;
  notices: StoredNotice[];
  photos: StoredPhoto[];
};

const now = () => new Date().toISOString();
const byNewest = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);
const pubNotice = ({ id, title, body, created_at }: StoredNotice): Notice => ({ id, title, body, created_at });
const pubPhoto = ({ id, storage_path, caption }: StoredPhoto): Photo => ({ id, url: `/uploads/${storage_path}`, caption });
const noticesOf = (db: Db, siteId: string, blockId: string) =>
  db.notices.filter((n) => n.site_id === siteId && n.block_id === blockId).sort(byNewest).map(pubNotice);
const photosOf = (db: Db, siteId: string, blockId: string) =>
  db.photos.filter((p) => p.site_id === siteId && p.block_id === blockId).sort(byNewest).map(pubPhoto);

async function load(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(FILE, 'utf8')) as Partial<Db>;
    return { sites: db.sites ?? {}, notices: db.notices ?? [], photos: db.photos ?? [] };
  } catch {
    const db: Db = { sites: { [SEED_SITE.siteId]: { config: SEED_SITE, updated_at: now() } }, notices: [], photos: [] };
    await save(db);
    return db;
  }
}

async function save(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, FILE); // 쓰다 죽어도 파일이 반쪽이 되지 않게
}

// 쓰기(읽고-고치고-저장)를 한 번에 하나씩. 자동 저장 PUT과 연결 POST가 겹쳐도 서로 덮어쓰지 않는다.
let chain: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = await load();
    const out = await fn(db);
    await save(db);
    return out;
  });
  chain = run.catch(() => undefined);
  return run;
}

async function getSite(id: string): Promise<SiteConfig | null> {
  const config = (await load()).sites[id]?.config;
  return config ? parseSiteConfig(config) : null;
}

async function getSiteBySlug(slug: string): Promise<SiteConfig | null> {
  const config = Object.values((await load()).sites).find((s) => s.config.slug === slug)?.config;
  return config ? parseSiteConfig(config) : null;
}

function putSite(config: SiteConfig): Promise<{ updatedAt: string } | Fail> {
  return mutate((db) => {
    const prev = db.sites[config.siteId]?.config;
    // R7: 기능 연결 상태는 connectBlock으로만 바뀐다. PUT이 보낸 값은 무시하고 저장된 값을 유지한다.
    for (const [id, block] of Object.entries(config.blocks)) {
      if (!('feature' in block)) continue;
      const old = prev?.blocks[id];
      block.feature.connected = old && 'feature' in old ? old.feature.connected : false;
    }
    // 7절 7번: 데이터가 있는 블록은 지울 수 없다. 정식 버전 TODO: 데이터 보관 후 "이전 공지 n건을 연결할까요?"
    for (const [kind, rows, unit] of [
      ['공지', db.notices, '건'],
      ['사진', db.photos, '장'],
    ] as const) {
      const orphan = rows.find((r) => r.site_id === config.siteId && !(r.block_id in config.blocks));
      if (!orphan) continue;
      const count = rows.filter((r) => r.site_id === config.siteId && r.block_id === orphan.block_id).length;
      return { error: `이 블록에 ${kind} ${count}${unit}이 있어요. 시제품에서는 데이터가 있는 블록을 삭제할 수 없어요.`, status: 400 };
    }
    const updatedAt = now();
    db.sites[config.siteId] = { config, updated_at: updatedAt };
    return { updatedAt };
  });
}

function connectBlock(siteId: string, blockId: string): Promise<{ ok: true } | Fail> {
  return mutate((db) => {
    const site = db.sites[siteId];
    if (!site) return { error: '사이트를 찾을 수 없어요', status: 404 };
    const block = site.config.blocks[blockId];
    if (!block || !('feature' in block)) return { error: '기능을 연결할 수 있는 블록이 아니에요', status: 400 };
    block.feature.connected = true;
    site.updated_at = now();
    return { ok: true };
  });
}

async function listNotices(siteId: string, blockId: string): Promise<Notice[]> {
  return noticesOf(await load(), siteId, blockId);
}

function addNotice(input: NoticeInput): Promise<Notice | Fail> {
  return mutate((db) => {
    const site = db.sites[input.siteId];
    if (!site) return { error: '사이트를 찾을 수 없어요', status: 404 };
    const block = site.config.blocks[input.blockId];
    if (!block || block.type !== 'notices') return { error: '공지사항 블록이 아니에요', status: 400 };
    if (!block.feature.connected) return { error: '공지 올리기 기능이 아직 연결되지 않았어요', status: 403 };
    const row: StoredNotice = {
      id: randomUUID(),
      site_id: input.siteId,
      block_id: input.blockId,
      title: input.title,
      body: input.body,
      created_at: now(),
    };
    db.notices.push(row);
    return pubNotice(row);
  });
}

function deleteNotice(id: string): Promise<boolean> {
  return mutate((db) => {
    const i = db.notices.findIndex((n) => n.id === id);
    if (i < 0) return false;
    db.notices.splice(i, 1);
    return true;
  });
}

async function listPhotos(siteId: string, blockId: string): Promise<Photo[]> {
  return photosOf(await load(), siteId, blockId);
}

function addPhoto(input: PhotoInput): Promise<Photo | Fail> {
  return mutate(async (db) => {
    const site = db.sites[input.siteId];
    if (!site) return { error: '사이트를 찾을 수 없어요', status: 404 };
    const block = site.config.blocks[input.blockId];
    if (!block || block.type !== 'photos') return { error: '사진 블록이 아니에요', status: 400 };
    if (!block.feature.connected) return { error: '사진 올리기 기능이 아직 연결되지 않았어요', status: 403 };
    const id = randomUUID();
    const storage_path = `${input.siteId}/${input.blockId}/${id}.${input.ext}`;
    const full = path.join(UPLOAD_DIR, storage_path);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.bytes);
    const row: StoredPhoto = { id, site_id: input.siteId, block_id: input.blockId, storage_path, caption: input.caption, created_at: now() };
    db.photos.push(row);
    return pubPhoto(row);
  });
}

// 행을 지우고 파일도 지운다. 없으면 false.
async function deletePhoto(id: string): Promise<boolean> {
  const storagePath = await mutate((db) => {
    const i = db.photos.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const [row] = db.photos.splice(i, 1);
    return row.storage_path;
  });
  if (!storagePath) return false;
  await fs.unlink(path.join(UPLOAD_DIR, storagePath)).catch(() => undefined);
  return true;
}

// 연결된 블록의 데이터를 blockId 기준으로 모은다. 편집기·공개 페이지가 렌더러에 넣어 준다.
async function loadBlockData(config: SiteConfig): Promise<BlockData> {
  const db = await load();
  const notices: Record<string, Notice[]> = {};
  const photos: Record<string, Photo[]> = {};
  for (const [id, block] of Object.entries(config.blocks)) {
    if (block.type === 'notices' && block.feature.connected) notices[id] = noticesOf(db, config.siteId, id);
    if (block.type === 'photos' && block.feature.connected) photos[id] = photosOf(db, config.siteId, id);
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
