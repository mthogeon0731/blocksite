-- SPEC 4.2. 시제품에서는 RLS를 끈다. 쓰기는 모두 서버 라우트(service role) 경유.
create table sites (
  id text primary key,
  slug text unique not null,
  config jsonb not null,
  updated_at timestamptz default now()
);
create table notices (
  id uuid primary key default gen_random_uuid(),
  site_id text references sites(id) on delete cascade,
  block_id text not null,
  title text not null,
  body text not null default '',
  created_at timestamptz default now()
);
create table photos (
  id uuid primary key default gen_random_uuid(),
  site_id text references sites(id) on delete cascade,
  block_id text not null,
  storage_path text not null,
  caption text default '',
  created_at timestamptz default now()
);
create index on notices (site_id, block_id, created_at desc);
create index on photos (site_id, block_id, created_at desc);
-- Storage 버킷 photos: 공개 읽기, 경로 {site_id}/{block_id}/{uuid}.{ext}
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
