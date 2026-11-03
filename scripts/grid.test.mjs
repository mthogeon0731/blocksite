// GRID_SPEC 11.2 판 규칙 단위 확인 (의존성 없음). 사용: node --test scripts/grid.test.mjs
// Node 24는 .ts를 그대로 읽는다(타입 제거, MODULE_TYPELESS 경고 1줄은 무해). src/lib의 확장자 없는 상대 import만 .ts로 풀어 준다.
import { registerHooks } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

registerHooks({ resolve: (spec, ctx, next) => next(/^\.\.?\/(.*\/)?[^./]+$/.test(spec) ? `${spec}.ts` : spec, ctx) });
const { resolve, collapseEmptyRows, findFreeSpot, liftUp } = await import('../src/lib/grid.ts');
const { migrateV1 } = await import('../src/lib/migrate.ts');

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
