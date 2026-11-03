import type { BlockType, LayoutRect, SiteConfig } from './schema';
import { CATALOG } from './catalog';

// GRID_SPEC 5.1 판 상수. COLS를 바꾸면 저장된 layout이 모두 어긋난다 (시제품 기간 고정)
export const COLS = 48; // 판 가로 칸 수
export const CELL = 24; // 기준 칸 크기(px)
export const BASE_W = COLS * CELL; // 기준 판 폭 1152px
export const MAX_ROWS = 600; // 판 세로 최대 칸 수
export const MOBILE_BP = 768; // 판 바깥 상자가 이보다 좁으면 모바일 규칙(8절). globals.css의 컨테이너 쿼리와 같은 값
export const MAX_BLOCKS = 30;
// 사이트당 1개만
export const SINGLETON: readonly BlockType[] = ['nav', 'profile', 'notices', 'photos'];

export type Rect = LayoutRect;
export type Layout = Record<string, Rect>;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// 경계가 닿는 것은 겹침이 아니다
export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// 가장 아래 블록의 끝 줄 (빈 판이면 0)
export const bottom = (layout: Layout) => Math.max(0, ...Object.values(layout).map((r) => r.y + r.h));

// (y, x, id) 오름차순: DOM·읽기 순서, 모바일 세로 쌓기, resolve 처리 순서 (5.2·6.3·8절)
export const orderedIds = (layout: Layout) =>
  Object.keys(layout).sort((a, b) => layout[a].y - layout[b].y || layout[a].x - layout[b].x || (a < b ? -1 : a > b ? 1 : 0));

// 6.3 겹침 해결: movedId가 자리를 차지하고, 겹친 블록은 곧장 아래로 겹치지 않을 만큼만 내려간다(연쇄).
// 옆으로 옮기거나 위로 당기지 않는다. 같은 입력이면 같은 결과.
export function resolve(layout: Layout, movedId: string): Layout {
  const out: Layout = { [movedId]: layout[movedId] };
  const placed = [layout[movedId]];
  for (const id of orderedIds(layout)) {
    if (id === movedId) continue;
    const r = { ...layout[id] };
    for (let hit = placed.find((p) => overlaps(p, r)); hit; hit = placed.find((p) => overlaps(p, r))) r.y = hit.y + hit.h;
    placed.push(r);
    out[id] = r;
  }
  return out;
}

// 판 안으로, 종류별 최소 크기 이상, 정수로
export function clampRect(r: Rect, type: BlockType): Rect {
  const { min } = CATALOG[type];
  const w = clamp(Math.round(r.w), min.w, COLS);
  const h = clamp(Math.round(r.h), min.h, MAX_ROWS);
  return { x: clamp(Math.round(r.x), 0, COLS - w), y: clamp(Math.round(r.y), 0, MAX_ROWS - h), w, h };
}

// 6.6-4 카드만 클릭: y = 0부터 아래로, 각 y에서 x = 2, 3, …, 48 − w 다음 0, 1 순서로 훑어
// 다른 블록과 1칸 이상 떨어진 첫 자리
export function findFreeSpot(layout: Layout, w: number, h: number): Rect {
  const xs = [...Array.from({ length: Math.max(0, COLS - 1 - w) }, (_, i) => i + 2), 0, 1].filter((x) => x + w <= COLS);
  const rects = Object.values(layout);
  for (let y = 0; y + h <= MAX_ROWS; y++)
    for (const x of xs) if (!rects.some((r) => overlaps({ x: x - 1, y: y - 1, w: w + 2, h: h + 2 }, r))) return { x, y, w, h };
  return { x: 0, y: bottom(layout), w, h }; // ponytail: 판이 꽉 찬 경우. MAX_ROWS를 넘으면 저장에서 거부된다
}

// 위로 붙이기: 같은 열 범위에서 위에 있는 블록(없으면 판 맨 위)에 닿을 때까지 올린다
export function liftUp(layout: Layout, id: string): Layout {
  const r = layout[id];
  const above = Object.entries(layout).filter(([k, o]) => k !== id && o.x < r.x + r.w && r.x < o.x + o.w && o.y + o.h <= r.y);
  return { ...layout, [id]: { ...r, y: Math.max(0, ...above.map(([, o]) => o.y + o.h)) } };
}

// 빈 줄 정리: 어떤 블록도 지나가지 않는 가로 띠를 맨 위는 0줄, 블록 사이는 1줄로 줄인다. 상대 배치는 그대로
export function collapseEmptyRows(layout: Layout): Layout {
  const used = new Set<number>();
  for (const r of Object.values(layout)) for (let y = r.y; y < r.y + r.h; y++) used.add(y);
  const cutAbove: Record<number, number> = {}; // 블록이 지나가는 줄 y → 그 위에서 없앤 줄 수
  let removed = 0;
  let run = 0; // 지금까지 이어진 빈 줄 수
  for (let y = 0; y < bottom(layout); y++) {
    if (!used.has(y)) {
      run++;
      continue;
    }
    if (run) removed += run === y ? run : run - 1; // run === y ⇔ 판 맨 위부터 이어진 띠
    run = 0;
    cutAbove[y] = removed;
  }
  return Object.fromEntries(Object.entries(layout).map(([id, r]) => [id, { ...r, y: r.y - cutAbove[r.y] }]));
}

export function countType(config: SiteConfig, type: BlockType) {
  return Object.values(config.blocks).filter((b) => b.type === type).length;
}

// 새 블록을 넣을 수 있나. 안 되면 카드에 보일 이유
export function canAdd(config: SiteConfig, type: BlockType): string | null {
  if (SINGLETON.includes(type) && countType(config, type) >= 1) return '이미 하나 있어요';
  if (Object.keys(config.blocks).length >= MAX_BLOCKS) return `블록은 ${MAX_BLOCKS}개까지 넣을 수 있어요`;
  return null;
}

// 판 규칙 (R4′). 서버 PUT이 쓴다. 위반이면 한국어 이유, 정상이면 null.
// 정수·판 범위는 schema의 LayoutRectSchema가 먼저 거른다.
export function validateConfig(config: SiteConfig): string | null {
  const ids = Object.keys(config.blocks);
  if (ids.length > MAX_BLOCKS) return `블록은 사이트당 ${MAX_BLOCKS}개까지 넣을 수 있어요`;
  for (const id of ids) if (!config.layout[id]) return `블록(${id})의 위치가 없어요`;
  for (const id of Object.keys(config.layout)) if (!config.blocks[id]) return `위치(${id})에 해당하는 블록이 없어요`;
  for (const type of SINGLETON) if (countType(config, type) > 1) return `${CATALOG[type].label} 블록은 하나만 넣을 수 있어요`;
  for (const id of ids) {
    const { label, min } = CATALOG[config.blocks[id].type];
    const r = config.layout[id];
    if (r.w < min.w || r.h < min.h) return `${label} 블록은 ${min.w}×${min.h}칸보다 작게 할 수 없어요`;
  }
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) if (overlaps(config.layout[ids[i]], config.layout[ids[j]])) return '블록이 서로 겹쳐요';
  return null;
}
