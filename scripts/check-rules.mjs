// 서버 검증이 실제로 거부·허용하는지 확인하는 한 개짜리 점검 (SPEC 13절 + GRID_SPEC 11.1).
// 사용: 개발 서버(npm run dev)를 켜 두고  node scripts/check-rules.mjs
// 점검용 사이트 site_check(/s/check)를 만들어 쓰고 끝나면 비운다. 시드 사이트는 건드리지 않는다.
// ⚠ Supabase 모드에서 돌리면 site_check를 v2로 쓴다. 그 DB를 읽는 배포본이 v2(grid-layout) 코드일 때만 돌린다.
import { promises as fs } from 'fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null) });
const call = (path, method = 'GET', body) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }).then(json);
const getSite = (id) => call(`/api/sites/${id}`).then((r) => r.body);
const put = (id, config) => call(`/api/sites/${id}`, 'PUT', config);
const clone = (x) => JSON.parse(JSON.stringify(x));
const expect = (name, cond, detail) => {
  if (!cond) {
    console.error(`FAIL ${name}`, JSON.stringify(detail ?? ''));
    process.exitCode = 1;
  } else console.log(`ok   ${name}`);
};

// ---------- A. 판 규칙·스키마 v2 (점검용 사이트에 알려진 배치를 만들고 검사) ----------
console.log('A. 판 규칙·스키마');
const CID = 'site_check';
const BID = 'chk_notic';
const theme = { accent: '#1E3A8A', font: 'pretendard', scale: 'md' }; // background 생략 → plain
const empty = { version: 2, siteId: CID, slug: 'check', title: '점검용', theme, layout: {}, blocks: {} };
const config = clone(empty);
config.layout = {
  chk_nav: { x: 0, y: 0, w: 48, h: 3 },
  chk_prof: { x: 2, y: 4, w: 14, h: 24 },
  chk_text: { x: 2, y: 29, w: 14, h: 8 },
  chk_pubs: { x: 18, y: 4, w: 28, h: 12 },
  [BID]: { x: 18, y: 17, w: 28, h: 12 },
};
config.blocks = {
  chk_nav: { type: 'nav', props: { items: ['소개'] } },
  chk_prof: {
    type: 'profile',
    props: { name: '김OO', title: '교수', dept: 'OO대', email: '', photoUrl: '' },
    look: { photoShape: 'square', parts: { name: { align: 'right' } } },
  },
  chk_text: { type: 'text', props: { heading: '글', body: '' } },
  chk_pubs: { type: 'publications', props: { items: [] } },
  [BID]: { type: 'notices', props: { heading: '공지', limit: 5 }, feature: { key: 'notice-post', connected: false } },
};

let r = await put(CID, config);
expect('PUT v2 config (look 포함) → 200', r.status === 200, r);
let after = await getSite(CID);
expect(
  'GET → v2, 블록 5개, 배경 기본 plain, look 저장',
  after?.version === 2 && Object.keys(after.blocks).length === 5 && after.theme.background === 'plain' && after.blocks.chk_prof.look?.photoShape === 'square',
  after,
);

// 정상 config를 한 군데만 망가뜨려 PUT → 400 (pattern이 있으면 이유 문구까지)
const rejects = async (name, spoil, pattern) => {
  const bad = clone(config);
  spoil(bad);
  const res = await put(CID, bad);
  expect(`${name} → 400`, res.status === 400 && (!pattern || pattern.test(res.body?.error ?? '')), res);
};
await rejects('블록 겹침', (c) => (c.layout.chk_text.y = 20), /블록이 서로 겹쳐요/);
await rejects('x + w > 48', (c) => (c.layout.chk_pubs.x = 30));
await rejects('음수 좌표', (c) => (c.layout.chk_text.x = -1));
await rejects('소수 좌표', (c) => (c.layout.chk_text.y = 29.5));
await rejects('최소 크기 미만', (c) => (c.layout.chk_text.w = 2), /작게 할 수 없어요/);
await rejects('layout에 없는 블록', (c) => delete c.layout.chk_text, /위치가 없어요/);
await rejects('blocks에 없는 layout 키', (c) => (c.layout.ghost = { x: 0, y: 50, w: 6, h: 3 }), /해당하는 블록이 없어요/);
await rejects(
  '싱글턴(탭 메뉴) 2개',
  (c) => {
    c.blocks.zz_nav2 = { type: 'nav', props: { items: ['x'] } };
    c.layout.zz_nav2 = { x: 0, y: 60, w: 48, h: 3 };
  },
  /하나만/,
);
await rejects(
  '블록 30개 초과',
  (c) => {
    for (let i = 0; i < 26; i++) {
      c.blocks[`zz_t${i}`] = { type: 'text', props: { heading: 't', body: '' } };
      c.layout[`zz_t${i}`] = { x: (i % 6) * 8, y: 60 + Math.floor(i / 6) * 4, w: 6, h: 3 };
    }
  },
  /30개/,
);
await rejects('look 정의 밖 값 photoShape: star', (c) => (c.blocks.chk_prof.look = { photoShape: 'star' }));
await rejects('look 정의 밖 값 pad: 9', (c) => (c.blocks.chk_text.look = { pad: 9 }));
await rejects('포인트 색 형식', (c) => (c.theme.accent = 'blue'), /형식/);

let bad = clone(config);
bad.blocks[BID].feature.connected = true;
r = await put(CID, bad);
after = await getSite(CID);
expect('PUT으로 connected를 바꿀 수 없음', r.status === 200 && after.blocks[BID].feature.connected === false, after.blocks[BID]);

const moved = clone(config);
moved.layout[BID] = { x: 2, y: 38, w: 14, h: 12 }; // 공지를 왼쪽 아래로 (위치만 바꿈)
r = await put(CID, moved);
after = await getSite(CID);
expect('layout만 바꾼 PUT(공지 이동) → 200, 블록 id 그대로', r.status === 200 && after.layout[BID].x === 2 && !!after.blocks[BID], r);

// ---------- B. 기능 연결 + 공지 (점검용 사이트) ----------
console.log('B. 기능 연결 + 공지');
const withBlock = clone(empty);
withBlock.layout[BID] = { x: 18, y: 4, w: 28, h: 12 };
withBlock.blocks[BID] = { type: 'notices', props: { heading: '공지', limit: 5 }, feature: { key: 'notice-post', connected: false } };

r = await put(CID, withBlock);
expect('notices-only config → 200', r.status === 200, r);

r = await call('/api/notices', 'POST', { siteId: CID, blockId: BID, title: '미연결', body: '' });
expect('POST notice before connect → 403', r.status === 403, r);

r = await call(`/api/sites/${CID}/connect`, 'POST', { blockId: 'nope' });
expect('connect unknown block → 400', r.status === 400, r);

r = await call(`/api/sites/${CID}/connect`, 'POST', { blockId: BID });
after = await getSite(CID);
expect('connect → 200, connected=true', r.status === 200 && after.blocks[BID].feature.connected === true, r);

r = await call('/api/notices', 'POST', { siteId: CID, blockId: BID, title: '   ', body: '' });
expect('empty title → 400', r.status === 400, r);

const n1 = await call('/api/notices', 'POST', { siteId: CID, blockId: BID, title: '첫 공지', body: '내용 1' });
const n2 = await call('/api/notices', 'POST', { siteId: CID, blockId: BID, title: '둘째 공지', body: '' });
expect('POST 2 notices → 201', n1.status === 201 && n2.status === 201 && n1.body.id && n2.body.id, [n1, n2]);

let list = (await call(`/api/notices?siteId=${CID}&blockId=${BID}`)).body;
expect('GET list → 2, newest first', Array.isArray(list) && list.length === 2 && list[0].id === n2.body.id, list);

// 핵심(E6): 블록을 다른 곳으로 옮겨도 공지는 블록 id에 묶여 그대로 (R2′/R3)
const movedCheck = clone(after);
movedCheck.layout[BID] = { x: 2, y: 30, w: 14, h: 12 };
r = await put(CID, movedCheck);
list = (await call(`/api/notices?siteId=${CID}&blockId=${BID}`)).body;
after = await getSite(CID);
expect(
  'move block (layout만) → notices kept, still connected',
  r.status === 200 && list.length === 2 && after.layout[BID].y === 30 && after.blocks[BID].feature.connected === true,
  { r, list },
);

r = await put(CID, empty);
expect('remove block with notices → 400', r.status === 400 && /공지 2건/.test(r.body.error), r);

r = await call(`/api/notices/${n1.body.id}`, 'DELETE');
const r2 = await call(`/api/notices/${n2.body.id}`, 'DELETE');
const r3 = await call(`/api/notices/${n1.body.id}`, 'DELETE');
expect('DELETE both → 200, again → 404', r.status === 200 && r2.status === 200 && r3.status === 404, [r, r2, r3]);

r = await put(CID, empty);
expect('cleanup: empty check site → 200', r.status === 200, r);

// ---------- C. 사진 업로드 (점검용 사이트, 끝나면 비운다) ----------
console.log('C. 사진 업로드');
const PID = 'chk_photo';
const withPhotos = clone(empty);
withPhotos.layout[PID] = { x: 18, y: 4, w: 28, h: 14 };
withPhotos.blocks[PID] = { type: 'photos', props: { heading: '사진', columns: 3 }, feature: { key: 'photo-upload', connected: false } };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'); // 1x1
const upload = (fields) => {
  const fd = new FormData();
  fd.append('siteId', CID);
  fd.append('blockId', PID);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fetch(`${BASE}/api/photos`, { method: 'POST', body: fd }).then(json);
};

r = await put(CID, withPhotos);
expect('photos block → 200', r.status === 200, r);

r = await upload({ file: new Blob([PNG], { type: 'image/png' }) });
expect('upload before connect → 403', r.status === 403, r);

r = await call(`/api/sites/${CID}/connect`, 'POST', { blockId: PID });
expect('connect photos → 200', r.status === 200, r);

r = await upload({ file: new Blob(['hello'], { type: 'text/plain' }) });
expect('non-image → 400', r.status === 400, r);

r = await upload({ file: new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/png' }) });
expect('over 10MB → 400', r.status === 400, r);

const p1 = await upload({ file: new Blob([PNG], { type: 'image/png' }), caption: '첫 사진' });
expect('upload → 201 with url', p1.status === 201 && typeof p1.body?.url === 'string' && p1.body.url.endsWith('.png'), p1);

// 로컬 저장소는 /uploads/... 상대 경로, Supabase는 Storage 절대 URL
const local = !p1.body.url.startsWith('http');
const fileUrl = local ? `${BASE}${p1.body.url}` : p1.body.url;
let img = await fetch(fileUrl);
expect('GET uploaded file → 200 image/png', img.status === 200 && img.headers.get('content-type') === 'image/png', img.status);

img = await fetch(`${BASE}/uploads/..%2F..%2Fpackage.json`);
expect('path traversal → rejected', img.status === 404 || img.status === 400, img.status);

list = (await call(`/api/photos?siteId=${CID}&blockId=${PID}`)).body;
expect('GET photos → 1 with caption', Array.isArray(list) && list.length === 1 && list[0].caption === '첫 사진', list);

after = await getSite(CID);
const movedPhotos = clone(after);
movedPhotos.layout[PID] = { x: 2, y: 30, w: 14, h: 14 };
r = await put(CID, movedPhotos);
list = (await call(`/api/photos?siteId=${CID}&blockId=${PID}`)).body;
expect('move block (layout만) → photos kept', r.status === 200 && list.length === 1, { r, list });

r = await put(CID, empty);
expect('remove block with photos → 400', r.status === 400 && /사진 1장/.test(r.body.error), r);

r = await call(`/api/photos/${p1.body.id}`, 'DELETE');
img = await fetch(`${fileUrl}${fileUrl.includes('?') ? '&' : '?'}v=${Date.now()}`); // Supabase CDN 캐시를 피해 원본에 묻는다
const r4 = await call(`/api/photos/${p1.body.id}`, 'DELETE');
expect('DELETE photo → 200, file gone, again 404', r.status === 200 && img.status !== 200 && r4.status === 404, [r.status, img.status, r4.status]);

r = await put(CID, empty);
expect('cleanup: empty check site → 200', r.status === 200, r);

// ---------- D. v1 → v2 변환 (GRID_SPEC 4.1) ----------
console.log('D. v1 → v2 변환');
if (local) {
  // 로컬 저장소 파일에 v1 사이트를 직접 넣고 API로 읽는다. 끝나면 지운다
  const FILE = '.data/db.json';
  const VID = 'site_v1chk';
  const v1 = {
    version: 1,
    siteId: VID,
    slug: 'v1chk',
    title: 'v1 점검',
    theme,
    slots: { header: ['v1_nav'], 'main-left': ['v1_prof'], 'main-right': ['v1_note'], footer: ['v1_foot'] },
    blocks: {
      v1_nav: { type: 'nav', props: { items: ['소개', '연락처'] } },
      v1_prof: { type: 'profile', props: { name: '김OO', title: '교수', dept: 'OO대', email: '', photoUrl: '' } },
      v1_note: { type: 'notices', props: { heading: '공지', limit: 5 }, feature: { key: 'notice-post', connected: true } },
      v1_foot: { type: 'text', props: { heading: '연락처', body: 'OO관 000호' } },
    },
  };
  const db = JSON.parse(await fs.readFile(FILE, 'utf8'));
  db.sites[VID] = { config: v1, updated_at: new Date().toISOString() };
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
  const got = await getSite(VID);
  const ids = Object.keys(v1.blocks);
  expect(
    'v1 GET → v2, 블록 id·props·connected 그대로',
    got?.version === 2 &&
      !('slots' in got) &&
      ids.every((id) => JSON.stringify(got.blocks[id]?.props) === JSON.stringify(v1.blocks[id].props) && got.layout[id]) &&
      got.blocks.v1_note.feature.connected === true,
    got,
  );
  const L = got?.layout ?? {};
  expect(
    'v1 배치 → 상단 가로 꽉, 왼쪽 x2·w14, 오른쪽 x18·w28, 하단 x2·w44',
    L.v1_nav?.x === 0 && L.v1_nav.w === 48 && L.v1_prof?.x === 2 && L.v1_prof.w === 14 && L.v1_note?.x === 18 && L.v1_note.w === 28 && L.v1_foot?.w === 44,
    L,
  );
  const clean = JSON.parse(await fs.readFile(FILE, 'utf8'));
  delete clean.sites[VID];
  await fs.writeFile(FILE, JSON.stringify(clean, null, 2));
} else {
  // Supabase: 저장소에 v1을 직접 넣지 않는다. 기존 행이 v2로 읽히는지만 본다 (읽기 전용)
  const kim = await getSite('site_kimlab');
  expect('기존 사이트 GET → v2 (읽기 전용)', kim?.version === 2 && Object.keys(kim.blocks).every((id) => kim.layout[id]), kim?.version);
}

console.log(process.exitCode ? '\n일부 실패' : '\n전부 통과');
