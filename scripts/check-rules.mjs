// 서버 검증이 실제로 거부·허용하는지 확인하는 한 개짜리 점검 (SPEC 13절).
// 사용: 개발 서버(npm run dev)를 켜 두고  node scripts/check-rules.mjs
// B절은 점검용 사이트 site_check(/s/check)를 만들어 쓰고 끝나면 비운다.
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ID = 'site_kimlab';

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

// ---------- A. 규칙표·스키마 (시드 사이트, 끝나면 원복) ----------
console.log('A. 규칙표·스키마');
const config = await getSite(ID);
expect('GET config', config?.siteId === ID, config);

let r = await put(ID, config);
expect('PUT same config → 200', r.status === 200, r);

let bad = clone(config);
bad.slots['main-right'].push(bad.slots.header.pop());
r = await put(ID, bad);
expect('nav in main-right → 400', r.status === 400 && /탭 메뉴/.test(r.body.error), r);

bad = clone(config);
bad.slots.footer.push(bad.slots['main-right'][0]);
r = await put(ID, bad);
expect('same id in two slots → 400', r.status === 400, r);

bad = clone(config);
bad.blocks.zz_new_1 = { type: 'text', props: { heading: 'a', body: '' } };
bad.blocks.zz_new_2 = { type: 'text', props: { heading: 'b', body: '' } };
bad.slots.footer = ['zz_new_1', 'zz_new_2'];
r = await put(ID, bad);
expect('footer over max → 400', r.status === 400 && /하단/.test(r.body.error), r);

bad = clone(config);
bad.theme.accent = 'blue';
r = await put(ID, bad);
expect('bad accent → 400', r.status === 400 && /형식/.test(r.body.error), r);

bad = clone(config);
const noticesId = Object.keys(bad.blocks).find((k) => bad.blocks[k].type === 'notices');
bad.blocks[noticesId].feature.connected = true;
r = await put(ID, bad);
let after = await getSite(ID);
expect('PUT cannot flip connected', r.status === 200 && after.blocks[noticesId].feature.connected === false, after.blocks[noticesId]);

const moved = clone(config);
moved.slots['main-right'] = moved.slots['main-right'].filter((k) => k !== noticesId);
moved.slots['main-left'].push(noticesId);
r = await put(ID, moved);
after = await getSite(ID);
expect('move notices to main-left → 200, id kept', r.status === 200 && after.slots['main-left'].includes(noticesId) && !!after.blocks[noticesId], r);

r = await put(ID, config);
expect('restore original', r.status === 200, r);

// ---------- B. 기능 연결 + 공지 (점검용 사이트) ----------
console.log('B. 기능 연결 + 공지');
const CID = 'site_check';
const BID = 'chk_notic';
const theme = { accent: '#1E3A8A', font: 'pretendard', scale: 'md' };
const empty = { version: 1, siteId: CID, slug: 'check', title: '점검용', theme, slots: { header: [], 'main-left': [], 'main-right': [], footer: [] }, blocks: {} };
const withBlock = clone(empty);
withBlock.slots['main-right'] = [BID];
withBlock.blocks[BID] = { type: 'notices', props: { heading: '공지', limit: 5 }, feature: { key: 'notice-post', connected: false } };

r = await put(CID, withBlock);
expect('create check site → 200', r.status === 200, r);

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

console.log(process.exitCode ? '\n일부 실패' : '\n전부 통과');
