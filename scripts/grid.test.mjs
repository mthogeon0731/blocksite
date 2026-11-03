// GRID_SPEC 11.2 판 규칙 + 6.7 되돌리기 단위 확인 (의존성 없음). 사용: node --test scripts/grid.test.mjs
// Node 24는 .ts를 그대로 읽는다(타입 제거, MODULE_TYPELESS 경고는 무해). 확장자 없는 상대 import와 @/ 경로만 .ts로 풀어 준다.
import { registerHooks } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

registerHooks({
  resolve: (spec, ctx, next) =>
    next(spec.startsWith('@/') ? new URL(`../src/${spec.slice(2)}.ts`, import.meta.url).href : /^\.\.?\/(.*\/)?[^./]+$/.test(spec) ? `${spec}.ts` : spec, ctx),
});
const { resolve, collapseEmptyRows, findFreeSpot, liftUp, resizeRect } = await import('../src/lib/grid.ts');
const { migrateV1 } = await import('../src/lib/migrate.ts');
const { emptyConfig } = await import('../src/lib/seed.ts');
const { createEditorStore } = await import('../src/store/editor.ts');

const R = (x, y, w, h) => ({ x, y, w, h });

test('순서 바꾸기: 아래 블록 B를 y = 0으로 올리면 A가 y = 5로 내려간다', () => {
  const out = resolve({ A: R(0, 0, 10, 5), B: R(0, 0, 10, 5) }, 'B');
  assert.deepEqual(out, { A: R(0, 5, 10, 5), B: R(0, 0, 10, 5) });
});

test('연쇄: 세로로 붙은 A·B·C에서 A의 h +4 → B·C가 4칸씩 내려간다', () => {
  const out = resolve({ A: R(0, 0, 10, 9), B: R(0, 5, 10, 5), C: R(0, 10, 10, 5) }, 'A');
  assert.equal(out.B.y, 9);
  assert.equal(out.C.y, 14);
});

test('겹치지 않는 옆 블록은 그대로, 같은 입력이면 같은 결과', () => {
  const layout = { A: R(0, 0, 10, 9), B: R(0, 5, 10, 5), S: R(20, 0, 10, 20) };
  const out = resolve(layout, 'A');
  assert.deepEqual(out.S, R(20, 0, 10, 20));
  assert.deepEqual(resolve(layout, 'A'), out);
});

test('collapseEmptyRows: 맨 위 빈 띠 → 0줄, 블록 사이 3줄 빈 띠 → 1줄', () => {
  const out = collapseEmptyRows({ A: R(0, 4, 10, 2), B: R(0, 9, 10, 2), S: R(20, 4, 5, 2) });
  assert.deepEqual(out, { A: R(0, 0, 10, 2), B: R(0, 3, 10, 2), S: R(20, 0, 5, 2) });
});

test('findFreeSpot: 빈 판은 (2, 0), 탭 메뉴 아래는 1칸 띄운 (2, 4)', () => {
  assert.deepEqual(findFreeSpot({}, 14, 8), R(2, 0, 14, 8));
  assert.deepEqual(findFreeSpot({ N: R(0, 0, 48, 3) }, 14, 8), R(2, 4, 14, 8));
});

test('liftUp: 같은 열의 위 블록 끝까지 올린다', () => {
  assert.equal(liftUp({ A: R(0, 0, 10, 5), B: R(5, 12, 10, 3), S: R(30, 0, 5, 30) }, 'B').B.y, 5);
});

test('migrateV1: 4.1 배치 (상단 → 두 열 → 하단)', () => {
  const text = (heading) => ({ type: 'text', props: { heading, body: '' } });
  const v2 = migrateV1({
    version: 1,
    siteId: 's',
    slug: 's',
    title: 't',
    theme: { accent: '#1E3A8A', font: 'pretendard', scale: 'md' },
    slots: { header: ['n'], 'main-left': ['l1', 'l2'], 'main-right': ['r1'], footer: ['f'] },
    blocks: { n: { type: 'nav', props: { items: [] } }, l1: text('a'), l2: text('b'), r1: text('c'), f: text('d') },
  });
  assert.equal(v2.version, 2);
  // 글 기본 높이 5칸: 왼쪽 4·10, 오른쪽 4, 하단은 더 아래쪽 열 끝(15) + 1칸
  assert.deepEqual(v2.layout, { n: R(0, 0, 48, 3), l1: R(2, 4, 14, 5), l2: R(2, 10, 14, 5), r1: R(18, 4, 28, 5), f: R(2, 16, 44, 5) });
  assert.equal('slots' in v2, false);
});

test('resizeRect: 왼쪽·위 손잡이는 반대쪽 변을 지키고, 최소 크기·판 밖에서 멈춘다', () => {
  assert.deepEqual(resizeRect(R(10, 10, 14, 8), 'nw', -3, -2, 'text'), R(7, 8, 17, 10));
  assert.deepEqual(resizeRect(R(10, 10, 14, 8), 'w', 20, 0, 'text'), R(18, 10, 6, 8)); // 글 최소 6칸
  assert.deepEqual(resizeRect(R(40, 0, 6, 3), 'e', 10, 0, 'text'), R(40, 0, 8, 3)); // 판 오른쪽 끝(48)
});

test('되돌리기: 블록 추가 → 되돌리기 → 다시 하기', () => {
  const st = createEditorStore(emptyConfig('t'), {});
  st.getState().addBlock('text');
  const id = Object.keys(st.getState().config.blocks)[0];
  st.getState().undo();
  assert.equal(st.getState().config.blocks[id], undefined);
  st.getState().redo();
  assert.ok(st.getState().config.blocks[id]);
});

test('되돌리기: 같은 블록 키보드 이동은 한 단계, 자동 맞춤은 그 조작에 합친다', () => {
  const st = createEditorStore(emptyConfig('t'), {});
  const s = () => st.getState();
  s().addBlock('text'); // 빈 판 → (2, 0, 14, 5)
  const id = Object.keys(s().config.blocks)[0];
  s().setRect(id, R(2, 1, 14, 5), `key:${id}`);
  s().setRect(id, R(2, 2, 14, 5), `key:${id}`);
  s().autoFit({ [id]: 9 });
  assert.equal(s().past.length, 2); // 추가 1 + 키보드 이동 묶음 1
  assert.equal(s().config.layout[id].h, 9);
  s().undo();
  assert.deepEqual(s().config.layout[id], R(2, 0, 14, 5));
});

test('되돌리기: 기능 연결 상태는 유지, 공지가 있는 블록이 사라지는 단계는 건너뛴다', () => {
  const st = createEditorStore(emptyConfig('t'), {});
  const s = () => st.getState();
  s().addBlock('notices');
  const id = Object.keys(s().config.blocks)[0];
  s().connectBlock(id);
  s().setRect(id, R(2, 10, 28, 13));
  s().undo(); // 이동만 되돌린다
  assert.equal(s().config.layout[id].y, 0);
  assert.equal(s().config.blocks[id].feature.connected, true);
  s().addItem('notices', id, { id: 'n1', title: '공지', body: '', created_at: '2026-11-03' });
  s().undo(); // "추가"를 되돌리면 공지가 있는 블록이 사라진다 → 건너뜀
  assert.ok(s().config.blocks[id]);
  assert.match(s().toast, /건너뛰었어요/);
});
