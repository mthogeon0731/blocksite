'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { CATALOG, CATALOG_LIST, lookOf } from '@/lib/catalog';
import { BASE_W, CELL, COLS, bottom, canAdd, clampRect, liftUp, overlaps, resizeRect, resolve, type Dir, type Layout, type Rect } from '@/lib/grid';
import type { BlockType } from '@/lib/schema';
import { SiteRenderer, cx, gridPlace } from '@/renderer/SiteRenderer';
import type { Align } from '@/renderer/blocks/parts';
import { NEW_ID, useEditor, useEditorStore, type Cell, type EditorStore } from '@/store/editor';

// 요소 크기 (ResizeObserver, transform 전 값). 상태는 관찰 콜백에서만 바꾼다
function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// 판 위 y(px, 축소 전) → 행. 내용 때문에 늘어난 행이 있을 수 있어 실제 트랙 크기를 누적한다 (GRID_SPEC 5.3)
function rowAt(board: HTMLElement, y: number) {
  let top = 0;
  let row = 0;
  for (const track of getComputedStyle(board).gridTemplateRows.split(' ')) {
    const h = parseFloat(track);
    if (!(h > 0)) break;
    if (y < top + h) return row;
    top += h;
    row++;
  }
  return row + Math.floor((y - top) / CELL); // 블록 아래 여유 줄은 24px
}

// 화면 좌표 → 판 칸. 축소 배율은 판의 화면 폭 ÷ 실제 폭. 판 밖이면 가장 가까운 칸 + inside: false.
// px·py는 판 위 위치(축소 전 px)
export function cellAt(board: HTMLElement, clientX: number, clientY: number): Cell & { inside: boolean; px: number; py: number } {
  const r = board.getBoundingClientRect();
  const k = r.width / board.offsetWidth;
  const px = (clientX - r.left) / k;
  const py = (clientY - r.top) / k;
  return {
    x: Math.min(COLS - 1, Math.max(0, Math.floor(px / CELL))),
    y: rowAt(board, Math.max(0, py)),
    inside: px >= 0 && px < board.offsetWidth && py >= 0 && py < board.offsetHeight,
    px,
    py,
  };
}

export const boardEl = () => document.querySelector<HTMLElement>('.editor-stage .board');
const frameEl = (id: string) => document.querySelector<HTMLElement>(`.editor-stage [data-block-id="${id}"]`);

// 블록 내용 높이(안쪽 여백·테두리 포함, 축소 전 px) → 필요한 줄 수 (6.5)
export function contentRows(frame: HTMLElement) {
  const cs = getComputedStyle(frame);
  const content = frame.firstElementChild as HTMLElement | null;
  const px =
    (content?.offsetHeight ?? 0) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  return Math.ceil(px / CELL - 1e-6);
}

// 7절 7번: 데이터가 있는 블록은 시제품에서 삭제하지 않는다 (서버도 거부한다)
function removeChecked(store: EditorStore, id: string) {
  const { data, removeBlock } = store.getState();
  const notices = data.notices?.[id]?.length ?? 0;
  const photos = data.photos?.[id]?.length ?? 0;
  const has = notices > 0 ? `공지 ${notices}건` : photos > 0 ? `사진 ${photos}장` : null;
  if (has) window.alert(`이 블록에 ${has}이 있어요. 시제품에서는 데이터가 있는 블록을 삭제할 수 없어요.`);
  else removeBlock(id);
}

// 판 위 끌기 한 번: 블록 이동 / 손잡이 크기 조절 / 빈 칸에서 자리 그리기
interface Gesture {
  kind: 'move' | 'resize' | 'draw';
  id: string; // 블록 id, 자리 그리기는 NEW_ID
  dir?: Dir;
  from: Cell & { px: number; py: number };
  start: Layout; // 누른 순간의 배치. 매번 여기서 다시 계산해 밀림이 쌓이지 않는다
  active: boolean; // 1칸 이상 움직였나 (아니면 클릭)
  last?: string;
  part?: string; // 이미 선택된 블록 안에서 누른 부품 (클릭이면 부품 선택, 6.1)
}

// GRID_SPEC 5.3 편집기 판: 기준 폭 1152px(칸 24px)로 그리고 미리보기 영역에 맞게 축소한다(k ≤ 1). 공개 페이지와 같은 줄바꿈(R9).
// 끌기·크기 조절·자리 그리기·키보드·자동 높이 맞춤은 여기서만 다룬다. 렌더러와 블록 컴포넌트는 모른다(R6).
export function Board() {
  const store = useEditorStore();
  const config = useEditor((s) => s.config);
  const data = useEditor((s) => s.data);
  const draft = useEditor((s) => s.draft);
  const menuRect = useEditor((s) => s.menuRect);
  const showGrid = useEditor((s) => s.showGrid);
  const selectedId = useEditor((s) => s.selectedBlockId);
  const selectedPart = useEditor((s) => s.selectedPart);
  const areaRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const area = useSize(areaRef);
  const stage = useSize(stageRef);
  const k = Math.min(1, area.width / BASE_W);
  const layout = draft?.layout ?? config.layout;
  const screenRows = k ? Math.ceil(area.height / (CELL * k)) : 0;
  // 판 높이 = max(가장 아래 블록 끝 + 12줄, 미리보기 영역을 채우는 줄, 40줄). 격자를 끄면 여유 줄 없이 완성 모습만
  const rows = showGrid ? Math.max(bottom(layout) + 12, screenRows, 40) : 0;
  useAutoFit(stageRef);
  useKeys(gesture);

  // 종류 메뉴 바깥을 누르면 취소 (6.6-1)
  useEffect(() => {
    if (!menuRect) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest('[data-menu]')) return;
      store.getState().setMenuRect(null);
      store.getState().setDraft(null);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [menuRect, store]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    const board = boardEl();
    // 툴바·메뉴 버튼은 그대로 눌린다. 메뉴가 열려 있을 때 바깥 클릭은 취소만 한다
    if (e.button !== 0 || menuRect || !board || target.closest('[data-ui]')) return;
    const s = store.getState();
    const from = cellAt(board, e.clientX, e.clientY);
    const dir = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as Dir | undefined;
    const blockId = dir ? s.selectedBlockId : target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId;
    if (!blockId && !from.inside) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setHover(null);
    const wasSelected = blockId === s.selectedBlockId;
    if (blockId && !wasSelected) s.selectBlock(blockId);
    // 블록 위에서 시작하면 이동, 손잡이는 크기 조절, 빈 칸에서 시작해야 자리 그리기
    gesture.current = {
      kind: dir ? 'resize' : blockId ? 'move' : 'draw',
      id: blockId ?? NEW_ID,
      dir,
      from,
      start: s.config.layout,
      active: false,
      part: wasSelected && !dir ? target.closest<HTMLElement>('[data-part]')?.dataset.part : undefined,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const board = boardEl();
    if (!board) return;
    const cell = cellAt(board, e.clientX, e.clientY);
    const g = gesture.current;
    const s = store.getState();
    if (!g) {
      // 빈 칸에 마우스를 올리면 그 칸을 옅게 강조한다
      const empty = cell.inside && !Object.values(s.config.layout).some((r) => overlaps(r, { ...cell, w: 1, h: 1 }));
      setHover((h) => (!empty ? null : h?.x === cell.x && h.y === cell.y ? h : { x: cell.x, y: cell.y }));
      return;
    }
    const dx = cell.x - g.from.x;
    const dy = cell.y - g.from.y;
    if (!g.active && !dx && !dy) return; // 1칸 이상 움직여야 끌기다 (그 전에는 클릭)
    g.active = true;
    const block = s.config.blocks[g.id];
    let rect: Rect;
    let note: string | undefined;
    if (g.kind === 'draw') {
      rect = { x: Math.min(g.from.x, cell.x), y: Math.min(g.from.y, cell.y), w: Math.abs(dx) + 1, h: Math.abs(dy) + 1 };
    } else if (!block) {
      return;
    } else if (g.kind === 'move') {
      rect = clampRect({ ...g.start[g.id], x: g.start[g.id].x + dx, y: g.start[g.id].y + dy }, block.type);
    } else {
      // 손잡이는 칸 경계선 위에 있으므로 칸이 아니라 가장 가까운 경계선까지 움직인 줄 수로 잰다 (판 끝 48번 선까지 닿게)
      const lx = Math.round((cell.px - g.from.px) / CELL);
      const ly = Math.round((cell.py - g.from.py) / CELL);
      rect = resizeRect(g.start[g.id], g.dir ?? 'se', lx, ly, block.type);
      const frame = frameEl(g.id);
      if (frame && rect.h < contentRows(frame)) note = '내용보다 낮게 줄일 수 없어요'; // 놓는 순간 자동 맞춤이 되돌린다
    }
    const key = `${rect.x},${rect.y},${rect.w},${rect.h},${note}`;
    if (key === g.last) return;
    g.last = key;
    // 밀려날 블록까지 포함한 결과를 실시간으로 그린다 (저장하지 않음)
    s.setDraft({ layout: resolve({ ...g.start, [g.id]: rect }, g.id), id: g.id, note });
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    const s = store.getState();
    if (!g) return;
    if (g.kind === 'draw' && s.draft) return s.setMenuRect(s.draft.layout[NEW_ID]); // 그린 자리 옆에 종류 메뉴
    if (g.kind === 'draw') s.setDropAt({ x: g.from.x, y: g.from.y }); // 빈 칸 클릭: 선택 해제 + 놓을 자리 (6.6-3)
    else if (s.draft) s.setLayout(s.draft.layout); // 끈 결과를 한 단계로 확정
    else if (g.kind === 'move') s.selectPart(g.part ?? null); // 선택된 블록 안 클릭: 부품 선택(부품 밖이면 블록 선택으로)
    s.setDraft(null);
  };

  const cancel = () => {
    gesture.current = null;
    store.getState().setDraft(null);
    store.getState().setMenuRect(null);
  };

  const choose = (type: BlockType) => {
    const { menuRect: rect, addBlock } = store.getState();
    if (rect) addBlock(type, rect); // 최소 크기보다 작으면 키우고 판 밖이면 안으로 (store.addBlock)
  };

  return (
    // 스크롤바 자리를 늘 비워 둔다: 끄는 중에 판이 길어져 스크롤바가 생겨도 축소 배율 k가 바뀌지 않게
    <main ref={areaRef} className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 pt-12 [scrollbar-gutter:stable]">
      {selectedId && (
        // 선택된 블록의 부품: 올리면 옅은 점선, 고르면 포인트 색 점선 (블록 컴포넌트는 data-part만 단다)
        <style>{`.editor-stage [data-block-id="${selectedId}"] [data-part]:hover { outline: 1px dashed var(--color-neutral-400); outline-offset: 2px; cursor: pointer; }${
          selectedPart ? ` .editor-stage [data-block-id="${selectedId}"] [data-part="${selectedPart}"] { outline: 2px dashed var(--accent); outline-offset: 2px; }` : ''
        }`}</style>
      )}
      <div className="mx-auto" style={{ width: BASE_W * k, height: stage.height * k, visibility: k ? undefined : 'hidden' }}>
        <div
          ref={stageRef}
          className="editor-stage origin-top-left select-none"
          data-grid={showGrid || undefined}
          style={{ width: BASE_W, transform: `scale(${k})`, '--rows': rows } as CSSProperties}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={cancel}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            if ((e.target as Element).closest('a')) e.preventDefault(); // 편집 중에는 링크를 따라가지 않는다
          }}
          onDragStart={(e) => e.preventDefault()} // 그림·링크의 기본 끌기 대신 블록 끌기
        >
          <SiteRenderer
            config={draft ? { ...config, layout } : config}
            data={data}
            mode="edit"
            overlay={<Overlay k={k} layout={layout} hover={hover} guideRow={Math.max(1, Math.floor(screenRows / 2) - 1)} onChoose={choose} />}
          />
        </div>
      </div>
    </main>
  );
}

// 6.5 내용 높이 자동 맞춤: 내용이 h칸보다 길면 늘리고 아래 블록을 민다(자동으로는 늘리기만).
// ResizeObserver·config 변경을 requestAnimationFrame으로 묶어 한 프레임에 한 번. 끄는 중에는 쉬었다가 놓은 뒤에 잰다.
// 첫 측정은 글꼴이 다 온 뒤(대체 글꼴로 잰 높이가 저장되지 않게)
function useAutoFit(stageRef: RefObject<HTMLDivElement | null>) {
  const store = useEditorStore();
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let frame = 0;
    let ready = false;
    const seen = new WeakSet<Element>();
    const fit = () => {
      frame = 0;
      const s = store.getState();
      const need: Record<string, number> = {};
      for (const el of stage.querySelectorAll<HTMLElement>('[data-block-id]')) {
        const content = el.firstElementChild;
        if (content && !seen.has(content)) {
          seen.add(content);
          ro.observe(content);
        }
        const id = el.dataset.blockId ?? '';
        const rows = contentRows(el);
        if (rows > (s.config.layout[id]?.h ?? Infinity)) need[id] = rows;
      }
      if (ready && !s.draft && Object.keys(need).length) s.autoFit(need);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(fit);
    };
    const ro = new ResizeObserver(schedule);
    const unsubscribe = store.subscribe((s, prev) => {
      if (s.config !== prev.config || s.draft !== prev.draft) schedule();
    });
    void document.fonts.ready.then(() => {
      ready = true;
      schedule();
    });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      unsubscribe();
    };
  }, [store, stageRef]);
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const ALIGNS: Align[] = ['left', 'center', 'right'];

// 6.2 키보드(블록 선택 상태, 입력칸에 포커스가 없을 때) + 6.7 되돌리기·다시 하기
function useKeys(gesture: RefObject<Gesture | null>) {
  const store = useEditorStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element).closest('input, textarea, select, dialog, [contenteditable="true"]')) return;
      const s = store.getState();
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'y')) {
        e.preventDefault();
        return e.shiftKey || key === 'y' ? s.redo() : s.undo();
      }
      if (e.key === 'Escape') {
        gesture.current = null;
        s.setDraft(null);
        s.setMenuRect(null);
        s.setDropAt(null);
        return s.selectedPart ? s.selectPart(null) : s.selectBlock(null); // 부품 선택 → 블록 선택 → 해제
      }
      const id = s.selectedBlockId;
      const r = id ? s.config.layout[id] : undefined;
      const block = id ? s.config.blocks[id] : undefined;
      if (!id || !r || !block) return;
      const arrow = ARROWS[e.key];
      const part = s.selectedPart;
      if (part && arrow?.[0] && !e.altKey) {
        // 부품 선택 상태의 ← →: 정렬을 왼쪽 ↔ 가운데 ↔ 오른쪽으로 한 단계
        e.preventDefault();
        const cur = (lookOf(block).parts as Record<string, { align?: Align } | undefined>)[part]?.align ?? 'left';
        const next = ALIGNS[Math.max(0, Math.min(2, ALIGNS.indexOf(cur) + arrow[0]))];
        if (next !== cur) s.setPart(id, part, { align: next }, `key:${id}`);
      } else if (arrow) {
        e.preventDefault();
        const [ax, ay] = arrow;
        const n = e.shiftKey ? 4 : 1;
        // 화살표 1칸, Shift 4칸 이동. Alt는 오른쪽 변·아래 변 크기 조절. 같은 블록 연속 입력은 0.8초 단위로 한 단계
        const next = e.altKey ? resizeRect(r, ax ? 'e' : 's', ax, ay, block.type) : { ...r, x: r.x + ax * n, y: r.y + ay * n };
        s.setRect(id, next, `key:${id}`);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !part) {
        e.preventDefault();
        removeChecked(store, id); // 부품을 고른 상태에서는 블록을 지우지 않는다
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, gesture]);
}

const HANDLES: { dir: Dir; left: string; top: string; cursor: string }[] = [
  { dir: 'nw', left: '0%', top: '0%', cursor: 'nwse-resize' },
  { dir: 'n', left: '50%', top: '0%', cursor: 'ns-resize' },
  { dir: 'ne', left: '100%', top: '0%', cursor: 'nesw-resize' },
  { dir: 'e', left: '100%', top: '50%', cursor: 'ew-resize' },
  { dir: 'se', left: '100%', top: '100%', cursor: 'nwse-resize' },
  { dir: 's', left: '50%', top: '100%', cursor: 'ns-resize' },
  { dir: 'sw', left: '0%', top: '100%', cursor: 'nesw-resize' },
  { dir: 'w', left: '0%', top: '50%', cursor: 'ew-resize' },
];

const tip = 'pointer-events-none absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium shadow-sm';

// 편집 장식: 판(CSS Grid)의 같은 칸 위에 겹친다. 행이 늘어나도 블록 영역과 정확히 맞는다.
// 판은 축소되어 보이므로 툴바·말풍선·손잡이·메뉴는 1/k로 되돌려 원래 크기로 보이게 한다.
function Overlay({ k, layout, hover, guideRow, onChoose }: { k: number; layout: Layout; hover: Cell | null; guideRow: number; onChoose: (type: BlockType) => void }) {
  const config = useEditor((s) => s.config);
  const draft = useEditor((s) => s.draft);
  const menuRect = useEditor((s) => s.menuRect);
  const dropAt = useEditor((s) => s.dropAt);
  const selectedId = useEditor((s) => s.selectedBlockId);
  const inv = k ? 1 / k : 1;
  const unscale = (origin: string): CSSProperties => ({ transform: `scale(${inv})`, transformOrigin: origin });
  const moving = draft ? layout[draft.id] : undefined;
  const selected = selectedId && !draft ? layout[selectedId] : undefined;
  const items: ReactNode[] = [];

  for (const [id, block] of Object.entries(config.blocks)) {
    const feature = 'feature' in block && !block.feature.connected ? CATALOG[block.type].feature : undefined;
    if (feature && layout[id])
      items.push(
        <div key={`badge-${id}`} className="pointer-events-none relative z-10" style={gridPlace(layout[id])}>
          <span className={`${tip} right-2 top-2 bg-amber-100 text-amber-800`} style={unscale('top right')}>
            {feature.label} 연결 전 · 유료
          </span>
        </div>,
      );
  }
  if (hover && !draft) items.push(<div key="hover" className="pointer-events-none bg-(--accent)/10" style={gridPlace({ ...hover, w: 1, h: 1 })} />);
  if (dropAt && !draft)
    items.push(
      <div key="drop" className="pointer-events-none relative z-10 bg-(--accent)/20 outline-2 outline-(--accent)" style={gridPlace({ ...dropAt, w: 1, h: 1 })}>
        <span className={`${tip} bottom-full left-0 mb-1 origin-bottom-left bg-(--accent) text-white`} style={unscale('bottom left')}>
          놓을 자리 · 카드를 누르세요
        </span>
      </div>,
    );
  if (selected && selectedId)
    items.push(
      <div
        key="selected"
        className={cx('pointer-events-none relative z-20 outline-2 outline-(--accent)', lookOf(config.blocks[selectedId]).corner === 'round' && 'rounded-xl')}
        style={gridPlace(selected)}
      >
        {HANDLES.map((h) => (
          <span
            key={h.dir}
            data-handle={h.dir}
            className="pointer-events-auto absolute rounded-sm border border-(--accent) bg-white"
            style={{ left: h.left, top: h.top, width: 10 * inv, height: 10 * inv, transform: 'translate(-50%, -50%)', cursor: h.cursor }}
          />
        ))}
        <div data-ui className="pointer-events-auto absolute bottom-full left-0 mb-2 origin-bottom-left" style={unscale('bottom left')}>
          <Toolbar id={selectedId} />
        </div>
      </div>,
    );
  if (draft && moving)
    items.push(
      <div
        key="draft"
        className={cx('pointer-events-none relative z-20 rounded-md border-2 border-dashed border-(--accent)', draft.id === NEW_ID && 'bg-(--accent)/10')}
        style={gridPlace(moving)}
      >
        <span className={`${tip} bottom-full left-0 mb-1 origin-bottom-left bg-neutral-900 text-white`} style={unscale('bottom left')}>
          x {moving.x} · y {moving.y} · {moving.w}×{moving.h}칸{draft.note && <b className="ml-1.5 text-amber-300">{draft.note}</b>}
        </span>
        {menuRect && <TypeMenu rect={menuRect} inv={inv} onChoose={onChoose} />}
      </div>,
    );
  if (Object.keys(config.blocks).length === 0 && !draft)
    items.push(
      <p
        key="guide"
        className="pointer-events-none flex items-center justify-center text-2xl text-neutral-400"
        style={{ gridColumn: '1 / -1', gridRow: `${guideRow} / span 3` }}
      >
        판 위를 끌어서 블록 자리를 그리거나, 왼쪽 카드를 원하는 칸에 끌어다 놓으세요
      </p>,
    );
  return items;
}

// 자리 그리기 뒤 블록 종류 메뉴 (카탈로그 6종). 규칙상 안 되는 종류는 비활성 + 이유
function TypeMenu({ rect, inv, onChoose }: { rect: Rect; inv: number; onChoose: (type: BlockType) => void }) {
  const config = useEditor((s) => s.config);
  const right = rect.x + rect.w <= 36; // 오른쪽 벽 가까이면 왼쪽에 연다
  return (
    <div
      data-ui
      data-menu
      className="pointer-events-auto absolute top-0 z-30 mx-2 w-52 rounded-lg border border-neutral-200 bg-white p-1 text-sm text-neutral-800 shadow-lg"
      style={{ [right ? 'left' : 'right']: '100%', transform: `scale(${inv})`, transformOrigin: right ? 'top left' : 'top right' }}
    >
      <p className="px-2 py-1 text-[11px] text-neutral-500">
        {rect.w}×{rect.h}칸에 넣을 블록
      </p>
      {CATALOG_LIST.map((def) => {
        const why = canAdd(config, def.type);
        return (
          <button
            key={def.type}
            type="button"
            disabled={!!why}
            title={why ?? `${def.label} 블록 넣기`}
            onClick={() => onChoose(def.type)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <span>{def.icon}</span>
            <span className="flex-1">{def.label}</span>
            {why && <span className="text-[10px] text-neutral-400">{why}</span>}
          </button>
        );
      })}
    </div>
  );
}

const tb = 'rounded px-2 py-1 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent';

// 6.4 블록 위 툴바. 모두 결과에 resolve를 적용한다 (store.setRect·liftUp)
function Toolbar({ id }: { id: string }) {
  const store = useEditorStore();
  const layout = useEditor((s) => s.config.layout);
  const setRect = useEditor((s) => s.setRect);
  const lift = useEditor((s) => s.liftUp);
  const r = layout[id];
  if (!r) return null;
  // 높이 맞춤: h = 내용 높이 (줄이기도 한다. 최소 크기까지)
  const fitHeight = () => {
    const frame = frameEl(id);
    if (frame) setRect(id, { ...r, h: contentRows(frame) });
  };
  const buttons: [string, boolean, () => void][] = [
    ['왼쪽 벽', r.x === 0, () => setRect(id, { ...r, x: 0 })],
    ['가로 꽉', r.x === 0 && r.w === COLS, () => setRect(id, { ...r, x: 0, w: COLS })],
    ['오른쪽 벽', r.x + r.w === COLS, () => setRect(id, { ...r, x: COLS - r.w })],
    ['위로 붙이기', liftUp(layout, id)[id].y === r.y, () => lift(id)],
    ['높이 맞춤', false, fitHeight],
  ];
  return (
    <div className="flex items-center gap-0.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white p-1 text-xs text-neutral-700 shadow-sm">
      {buttons.map(([label, off, run]) => (
        <button key={label} type="button" className={tb} disabled={off} onClick={run}>
          {label}
        </button>
      ))}
      <button type="button" className={`${tb} text-red-600`} onClick={() => removeChecked(store, id)}>
        삭제
      </button>
    </div>
  );
}
