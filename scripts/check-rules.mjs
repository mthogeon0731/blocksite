// 규칙표·스키마 검증이 서버에서 실제로 거부하는지 확인하는 한 개짜리 점검 (SPEC 13절).
// 사용: 개발 서버(npm run dev)를 켜 두고  node scripts/check-rules.mjs
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ID = 'site_kimlab';

const get = async () => (await fetch(`${BASE}/api/sites/${ID}`)).json();
const put = async (body) => {
  const res = await fetch(`${BASE}/api/sites/${ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};
const clone = (x) => JSON.parse(JSON.stringify(x));
const expect = (name, cond, detail) => {
  if (!cond) {
    console.error(`FAIL ${name}`, detail ?? '');
    process.exitCode = 1;
  } else console.log(`ok   ${name}`);
};

const config = await get();
expect('GET config', config.siteId === ID, config);

// 1. 원본 그대로 → 200
let r = await put(config);
expect('PUT same config → 200', r.status === 200, r);

// 2. nav를 main-right로 → 400 (허용 블록 위반)
let bad = clone(config);
bad.slots['main-right'].push(bad.slots.header.pop());
r = await put(bad);
expect('nav in main-right → 400', r.status === 400 && /탭 메뉴/.test(r.body.error), r);

// 3. 같은 블록 id가 두 자리에 → 400
bad = clone(config);
bad.slots.footer.push(bad.slots['main-right'][0]);
r = await put(bad);
expect('same id in two slots → 400', r.status === 400, r);

// 4. 최대 개수 초과 (footer에 text 2개) → 400
bad = clone(config);
bad.blocks.zz_new_1 = { type: 'text', props: { heading: 'a', body: '' } };
bad.blocks.zz_new_2 = { type: 'text', props: { heading: 'b', body: '' } };
bad.slots.footer = ['zz_new_1', 'zz_new_2'];
r = await put(bad);
expect('footer over max → 400', r.status === 400 && /하단/.test(r.body.error), r);

// 5. 형식 오류 (색이 #RRGGBB가 아님) → 400
bad = clone(config);
bad.theme.accent = 'blue';
r = await put(bad);
expect('bad accent → 400', r.status === 400 && /형식/.test(r.body.error), r);

// 6. PUT으로 connected=true 를 보내도 서버가 무시
bad = clone(config);
const noticesId = Object.keys(bad.blocks).find((k) => bad.blocks[k].type === 'notices');
bad.blocks[noticesId].feature.connected = true;
r = await put(bad);
const after = await get();
expect('PUT cannot flip connected', r.status === 200 && after.blocks[noticesId].feature.connected === false, after.blocks[noticesId]);

// 7. 유효한 이동: notices → main-left (데모 4번) → 200, 블록 id 유지
const moved = clone(config);
moved.slots['main-right'] = moved.slots['main-right'].filter((k) => k !== noticesId);
moved.slots['main-left'].push(noticesId);
r = await put(moved);
const after2 = await get();
expect('move notices to main-left → 200, id kept', r.status === 200 && after2.slots['main-left'].includes(noticesId) && after2.blocks[noticesId], r);

// 원복
r = await put(config);
expect('restore original', r.status === 200, r);
console.log(process.exitCode ? '\n일부 실패' : '\n전부 통과');
