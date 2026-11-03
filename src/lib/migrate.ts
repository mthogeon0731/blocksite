import type { SiteConfigInput } from './schema';
import { CATALOG } from './catalog';
import { COLS, type Layout } from './grid';

// v1(자리 4개) config 모양. 변환에만 쓴다
type Slot = 'header' | 'main-left' | 'main-right' | 'footer';
export type V1Config = Omit<SiteConfigInput, 'version' | 'layout'> & { version: 1; slots: Record<Slot, string[]> };

// GRID_SPEC 4.1 v1 → v2. 블록 id·props·feature는 그대로, look은 넣지 않는다(기본값).
// h는 종류별 기본 높이. 내용이 더 길면 공개 페이지는 행이 늘어나고(R10), 편집기는 자동 맞춤이 고친다.
export function migrateV1(v1: V1Config): SiteConfigInput {
  const { slots, ...rest } = v1;
  const layout: Layout = {};
  const ids = (slot: Slot) => slots[slot].filter((id) => rest.blocks[id]);
  const h = (id: string) => CATALOG[rest.blocks[id].type].size.h;
  // 열 하나를 위에서 아래로 1칸 간격으로 쌓고, 다음 블록이 올 줄을 돌려준다
  const column = (slot: Slot, x: number, w: number, y: number) => {
    for (const id of ids(slot)) {
      layout[id] = { x, y, w, h: h(id) };
      y += h(id) + 1;
    }
    return y;
  };
  let y = 0;
  for (const id of ids('header')) {
    layout[id] = { x: 0, y, w: COLS, h: h(id) };
    y += h(id);
  }
  const top = y + 1; // header 끝 아래 1칸 띄운 줄부터
  // footer는 두 열 중 더 아래쪽 끝에서 1칸 띄운다
  column('footer', 2, 44, Math.max(column('main-left', 2, 14, top), column('main-right', 18, 28, top)));
  return { ...rest, version: 2, layout };
}
