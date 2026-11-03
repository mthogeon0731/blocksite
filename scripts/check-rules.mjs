// 서버 검증이 실제로 거부·허용하는지 확인하는 한 개짜리 점검 (SPEC 13절).
// 사용: 개발 서버(npm run dev)를 켜 두고  node scripts/check-rules.mjs
// 점검용 사이트 site_check(/s/check)를 만들어 쓰고 끝나면 비운다. 시드 사이트는 건드리지 않는다.
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

// ---------- A. 규칙표·스키마 (점검용 사이트에 알려진 배치를 만들고 검사) ----------
console.log('A. 규칙표·스키마');
const CID = 'site_check';
const BID = 'chk_notic';
const theme = { accent: '#1E3A8A', font: 'pretendard', scale: 'md' };
const empty = { version: 1, siteId: CID, slug: 'check', title: '점검용', theme, slots: { header: [], 'main-left': [], 'main-right': [], footer: [] }, blocks: {} };
const config = clone(empty);
config.slots = { header: ['chk_nav'], 'main-left': ['chk_prof', 'chk_text'], 'main-right': ['chk_pubs', BID], footer: [] };
config.blocks = {
  chk_nav: { type: 'nav', props: { items: ['소개'] } },
  chk_prof: { type: 'profile', props: { name: '김OO', title: '교수', dept: 'OO대', email: '', photoUrl: '' } },
  chk_text: { type: 'text', props: { heading: '글', body: '' } },
  chk_pubs: { type: 'publications', props: { items: [] } },
  [BID]: { type: 'notices', props: { heading: '공지', limit: 5 }, feature: { key: 'notice-post', connected: false } },
};

let r = await put(CID, config);
expect('PUT full config → 200', r.status === 200, r);
let after = await getSite(CID);
expect('GET config', after?.siteId === CID && Object.keys(after.blocks).length === 5, after);

let bad = clone(config);
bad.slots['main-right'].push(bad.slots.header.pop());
r = await put(CID, bad);
expect('nav in main-right → 400', r.status === 400 && /탭 메뉴/.test(r.body.error), r);

bad = clone(config);
bad.slots.footer.push(bad.slots['main-right'][0]);
r = await put(CID, bad);
expect('same id in two slots → 400', r.status === 400, r);

bad = clone(config);
bad.blocks.zz_new_1 = { type: 'text', props: { heading: 'a', body: '' } };
bad.blocks.zz_new_2 = { type: 'text', props: { heading: 'b', body: '' } };
bad.slots.footer = ['zz_new_1', 'zz_new_2'];
r = await put(CID, bad);
expect('footer over max → 400', r.status === 400 && /하단/.test(r.body.error), r);

bad = clone(config);
bad.blocks.zz_nav2 = { type: 'nav', props: { items: ['x'] } };
bad.slots.footer = ['zz_nav2'];
r = await put(CID, bad);
expect('second nav (singleton) → 400', r.status === 400, r);

bad = clone(config);
bad.theme.accent = 'blue';
r = await put(CID, bad);
expect('bad accent → 400', r.status === 400 && /형식/.test(r.body.error), r);

bad = clone(config);
bad.blocks[BID].feature.connected = true;
r = await put(CID, bad);
after = await getSite(CID);
expect('PUT cannot flip connected', r.status === 200 && after.blocks[BID].feature.connected === false, after.blocks[BID]);

const moved = clone(config);
moved.slots['main-right'] = ['chk_pubs'];
moved.slots['main-left'].push(BID);
r = await put(CID, moved);
after = await getSite(CID);
expect('move notices to main-left → 200, id kept', r.status === 200 && after.slots['main-left'].includes(BID) && !!after.blocks[BID], r);

// ---------- B. 기능 연결 + 공지 (점검용 사이트) ----------
console.log('B. 기능 연결 + 공지');
const withBlock = clone(empty);
withBlock.slots['main-right'] = [BID];
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

// 핵심: 블록을 다른 자리로 옮겨도 공지는 블록 id에 묶여 그대로 (R2/R3, 데모 4번)
const movedCheck = clone(after);
movedCheck.slots['main-right'] = [];
movedCheck.slots['main-left'] = [BID];
r = await put(CID, movedCheck);
list = (await call(`/api/notices?siteId=${CID}&blockId=${BID}`)).body;
after = await getSite(CID);
expect('move block → notices kept, still connected', r.status === 200 && list.length === 2 && after.blocks[BID].feature.connected === true, { r, list });

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
withPhotos.slots['main-right'] = [PID];
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
expect('upload → 201 with url', p1.status === 201 && typeof p1.body?.url === 'string' && p1.body.url.startsWith('/uploads/'), p1);

let img = await fetch(`${BASE}${p1.body.url}`);
expect('GET uploaded file → 200 image/png', img.status === 200 && img.headers.get('content-type') === 'image/png', img.status);

img = await fetch(`${BASE}/uploads/..%2F..%2Fpackage.json`);
expect('path traversal → rejected', img.status === 404 || img.status === 400, img.status);

list = (await call(`/api/photos?siteId=${CID}&blockId=${PID}`)).body;
expect('GET photos → 1 with caption', Array.isArray(list) && list.length === 1 && list[0].caption === '첫 사진', list);

after = await getSite(CID);
const movedPhotos = clone(after);
movedPhotos.slots['main-right'] = [];
movedPhotos.slots['main-left'] = [PID];
r = await put(CID, movedPhotos);
list = (await call(`/api/photos?siteId=${CID}&blockId=${PID}`)).body;
expect('move block → photos kept', r.status === 200 && list.length === 1, { r, list });

r = await put(CID, empty);
expect('remove block with photos → 400', r.status === 400 && /사진 1장/.test(r.body.error), r);

r = await call(`/api/photos/${p1.body.id}`, 'DELETE');
img = await fetch(`${BASE}${p1.body.url}`);
const r4 = await call(`/api/photos/${p1.body.id}`, 'DELETE');
expect('DELETE photo → 200, file 404, again 404', r.status === 200 && img.status === 404 && r4.status === 404, [r.status, img.status, r4.status]);

r = await put(CID, empty);
expect('cleanup: empty check site → 200', r.status === 200, r);

console.log(process.exitCode ? '\n일부 실패' : '\n전부 통과');
