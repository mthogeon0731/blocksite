import { promises as fs } from 'fs';
import path from 'path';
import type { SiteConfig } from './schema';
import { SEED_SITE } from './seed';

// ponytail: 로컬 JSON 파일 저장소. Supabase 키가 생기면 이 파일의 export 3개만 supabase-js로 교체한다
// (스키마는 supabase/migrations/0001_init.sql). 단일 사용자 시제품이라 잠금 없음, 마지막 저장이 이긴다.
const FILE = path.join(process.cwd(), '.data', 'db.json');

type Db = { sites: Record<string, { config: SiteConfig; updated_at: string }> };

async function load(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Db;
  } catch {
    const db: Db = { sites: { [SEED_SITE.siteId]: { config: SEED_SITE, updated_at: new Date().toISOString() } } };
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

export async function getSite(id: string): Promise<SiteConfig | null> {
  return (await load()).sites[id]?.config ?? null;
}

export async function getSiteBySlug(slug: string): Promise<SiteConfig | null> {
  return Object.values((await load()).sites).find((s) => s.config.slug === slug)?.config ?? null;
}

export async function putSite(config: SiteConfig): Promise<string> {
  const db = await load();
  const updated_at = new Date().toISOString();
  db.sites[config.siteId] = { config, updated_at };
  await save(db);
  return updated_at;
}
