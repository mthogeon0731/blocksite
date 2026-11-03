import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { BlockData, Notice, NoticeInput, SiteConfig } from './schema';
import { SEED_SITE } from './seed';

// ponytail: 로컬 JSON 파일 저장소. Supabase 키가 생기면 이 파일의 export만 supabase-js로 교체한다
// (스키마는 supabase/migrations/0001_init.sql). 단일 프로세스 가정, 인스턴스가 여럿이면 DB로.
const FILE = path.join(process.cwd(), '.data', 'db.json');

// R3: 공지는 site_id + block_id로만 묶인다. 위치 정보 없음.
interface StoredNotice extends Notice {
  site_id: string;
  block_id: string;
}
type Db = {
  sites: Record<string, { config: SiteConfig; updated_at: string }>;
  notices: StoredNotice[];
};
type Fail = { error: string; status: number };

const now = () => new Date().toISOString();
const pub = ({ id, title, body, created_at }: StoredNotice): Notice => ({ id, title, body, created_at });

async function load(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(FILE, 'utf8')) as Partial<Db>;
    return { sites: db.sites ?? {}, notices: db.notices ?? [] };
  } catch {
    const db: Db = { sites: { [SEED_SITE.siteId]: { config: SEED_SITE, updated_at: now() } }, notices: [] };
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
function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(async () => {
    const db = await load();
    const out = fn(db);
    await save(db);
    return out;
  });
  chain = run.catch(() => undefined);
  return run;
}

export async function getSite(id: string): Promise<SiteConfig | null> {
  return (await load()).sites[id]?.config ?? null;
}

export async function getSiteBySlug(slug: string): Promise<SiteConfig | null> {
  return Object.values((await load()).sites).find((s) => s.config.slug === slug)?.config ?? null;
}

export function putSite(config: SiteConfig): Promise<{ updatedAt: string } | Fail> {
  return mutate((db) => {
    const prev = db.sites[config.siteId]?.config;
    // R7: 기능 연결 상태는 connectBlock으로만 바뀐다. PUT이 보낸 값은 무시하고 저장된 값을 유지한다.
    for (const [id, block] of Object.entries(config.blocks)) {
      if (!('feature' in block)) continue;
      const old = prev?.blocks[id];
      block.feature.connected = old && 'feature' in old ? old.feature.connected : false;
    }
    // 7절 7번: 데이터가 있는 블록은 지울 수 없다. 정식 버전 TODO: 데이터 보관 후 "이전 공지 n건을 연결할까요?"
    const orphan = db.notices.find((n) => n.site_id === config.siteId && !(n.block_id in config.blocks));
    if (orphan) {
      const count = db.notices.filter((n) => n.site_id === config.siteId && n.block_id === orphan.block_id).length;
      return { error: `이 블록에 공지 ${count}건이 있어요. 시제품에서는 데이터가 있는 블록을 삭제할 수 없어요.`, status: 400 };
    }
    const updatedAt = now();
    db.sites[config.siteId] = { config, updated_at: updatedAt };
    return { updatedAt };
  });
}

export function connectBlock(siteId: string, blockId: string): Promise<{ ok: true } | Fail> {
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

export async function listNotices(siteId: string, blockId: string): Promise<Notice[]> {
  return (await load()).notices
    .filter((n) => n.site_id === siteId && n.block_id === blockId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(pub);
}

export function addNotice(input: NoticeInput): Promise<Notice | Fail> {
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
    return pub(row);
  });
}

export function deleteNotice(id: string): Promise<boolean> {
  return mutate((db) => {
    const i = db.notices.findIndex((n) => n.id === id);
    if (i < 0) return false;
    db.notices.splice(i, 1);
    return true;
  });
}

// 연결된 블록의 데이터를 blockId 기준으로 모은다. 편집기·공개 페이지가 렌더러에 넣어 준다.
export async function loadBlockData(config: SiteConfig): Promise<BlockData> {
  const notices: Record<string, Notice[]> = {};
  for (const [id, block] of Object.entries(config.blocks)) {
    if (block.type === 'notices' && block.feature.connected) notices[id] = await listNotices(config.siteId, id);
  }
  return { notices };
}
