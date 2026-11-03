import { createContext, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { nanoid } from 'nanoid';
import type { Block, BlockData, BlockType, Notice, Photo, SiteConfig, Theme } from '@/lib/schema';
import { CATALOG, newBlock } from '@/lib/catalog';
import {
  COLS,
  MAX_ROWS,
  canAdd,
  clampRect,
  collapseEmptyRows,
  findFreeSpot,
  liftUp,
  orderedIds,
  resolve,
  sameLayout,
  type Layout,
  type Rect,
} from '@/lib/grid';

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'error'; message: string };

export type DataKind = 'notices' | 'photos';
type ItemOf<K extends DataKind> = K extends 'notices' ? Notice : Photo;

export type Cell = { x: number; y: number };
export const NEW_ID = '__new'; // 놓기 전 새 블록 자리(고스트). config에는 들어가지 않는다

// 끄는 동안의 결과 배치(밀려날 블록 포함). 저장·되돌리기 대상이 아니다 (GRID_SPEC 6.2)
export interface Draft {
  layout: Layout;
  id: string; // 움직이는 블록 id 또는 NEW_ID
  note?: string; // 말풍선에 덧붙일 말
}

export interface EditorState {
  config: SiteConfig;
  data: BlockData; // 연결된 블록의 공지·사진. blockId 기준이라 블록을 옮겨도 그대로 (R3)
  past: SiteConfig[]; // 되돌리기 스냅샷 (최대 50, 6.7)
  future: SiteConfig[]; // 다시 하기
  draft: Draft | null;
  menuRect: Rect | null; // 끌어서 그린 자리. 블록 종류를 고르면 그 크기로 생긴다 (6.6-1)
  dropAt: Cell | null; // 빈 칸 클릭으로 고른 "놓을 자리" (6.6-3)
  showGrid: boolean; // 상단 바 "격자 보기"
  selectedBlockId: string | null;
  panelTab: 'style' | 'block';
  saveState: SaveState;
  toast: string | null;
  selectBlock: (id: string | null) => void;
  setPanelTab: (tab: 'style' | 'block') => void;
  // at이 없으면 빈 자리 자동(6.6-4). {x, y}면 그 칸이 왼쪽 위, {x, y, w, h}면 그 사각형 그대로. 실패하면 이유
  addBlock: (type: BlockType, at?: Cell & Partial<Pick<Rect, 'w' | 'h'>>) => string | null;
  removeBlock: (id: string) => void;
  setRect: (id: string, rect: Rect, group?: string) => void; // 위치·크기만 바뀐다. 블록 id와 데이터는 그대로 (R2′/R3)
  setLayout: (layout: Layout) => void; // 끌기를 놓을 때 한 단계로
  liftUp: (id: string) => void;
  collapseRows: () => void;
  autoFit: (rows: Record<string, number>) => void;
  setDraft: (draft: Draft | null) => void;
  setMenuRect: (rect: Rect | null) => void;
  setDropAt: (cell: Cell | null) => void;
  toggleGrid: () => void;
  undo: () => void;
  redo: () => void;
  updateProps: (id: string, patch: Partial<Block['props']>) => void;
  connectBlock: (id: string) => void; // 서버가 연결을 확인한 뒤 로컬 상태 반영
  setList: <K extends DataKind>(kind: K, blockId: string, list: ItemOf<K>[]) => void;
  addItem: <K extends DataKind>(kind: K, blockId: string, item: ItemOf<K>) => void;
  removeItem: (kind: DataKind, blockId: string, id: string) => void;
  setTheme: (patch: Partial<Theme>) => void;
  setTitle: (title: string) => void;
  setSaveState: (s: SaveState) => void;
  showToast: (message: string) => void;
}

const withList = (data: BlockData, kind: DataKind, blockId: string, list: Notice[] | Photo[]): BlockData =>
  ({ ...data, [kind]: { ...data[kind], [blockId]: list } }) as BlockData;

const HISTORY = 50;
// 같은 블록 키보드 이동은 0.8초, 입력칸 타이핑은 멈춘 지 1초 안이면 한 단계로 묶는다 (6.7)
const GROUP_MS = { key: 800, type: 1000 };

// 공지·사진은 되돌리기 대상이 아니다: 스냅샷을 복원해도 기능 연결 상태는 지금 값을 유지한다
function keepConnected(snap: SiteConfig, now: SiteConfig): SiteConfig {
  const blocks = { ...snap.blocks };
  for (const [id, b] of Object.entries(blocks)) {
    const cur = now.blocks[id];
    if ('feature' in b && cur && 'feature' in cur) blocks[id] = { ...b, feature: { ...b.feature, connected: cur.feature.connected } } as Block;
  }
  return { ...snap, blocks };
}

// 이 스냅샷으로 가면 공지·사진이 있는 블록이 사라지나
const dropsData = (snap: SiteConfig, data: BlockData) =>
  [data.notices, data.photos].some((byBlock) => Object.entries(byBlock ?? {}).some(([id, list]) => list.length > 0 && !snap.blocks[id]));

// 편집기 인스턴스마다 스토어 하나 (Editor.tsx가 만들어 Context로 내려준다)
export function createEditorStore(initial: SiteConfig, initialData: BlockData) {
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let lastGroup: string | undefined;
  let lastAt = 0;

  return createStore<EditorState>()((set, get) => {
    // config를 바꾸고 되돌리기 단계를 쌓는다. 같은 group이 시간 안에 이어지면 한 단계로 묶는다
    const commit = (config: SiteConfig, group?: string) => {
      const { past, config: prev } = get();
      const now = Date.now();
      const merge = !!group && group === lastGroup && now - lastAt < GROUP_MS[group.split(':')[0] as keyof typeof GROUP_MS];
      lastGroup = group;
      lastAt = now;
      set({ config, past: merge ? past : [...past, prev].slice(-HISTORY), future: [] });
    };
    const commitLayout = (layout: Layout, group?: string) => {
      const { config } = get();
      if (!sameLayout(layout, config.layout)) commit({ ...config, layout }, group);
    };
    // 되돌리기·다시 하기 공통: 데이터 있는 블록이 사라지는 단계는 건너뛰고 알린다
    const travel = (from: SiteConfig[], to: SiteConfig[], back: boolean) => {
      const { config, data, selectedBlockId, showToast } = get();
      if (!from.length) return;
      const stack = back ? [...from].reverse() : from; // 가까운 단계부터
      const skip = stack.findIndex((snap) => !dropsData(snap, data));
      if (skip !== 0) showToast('공지·사진이 있는 블록이 사라지는 단계는 되돌릴 수 없어서 건너뛰었어요');
      if (skip < 0) return back ? set({ past: [] }) : set({ future: [] });
      const next = keepConnected(stack[skip], config);
      const rest = stack.slice(skip + 1);
      lastGroup = undefined;
      set({
        config: next,
        ...(back ? { past: rest.reverse(), future: [config, ...to] } : { future: rest, past: [...to, config].slice(-HISTORY) }),
        draft: null,
        menuRect: null,
        selectedBlockId: selectedBlockId && next.blocks[selectedBlockId] ? selectedBlockId : null,
      });
    };

    return {
      config: initial,
      data: initialData,
      past: [],
      future: [],
      draft: null,
      menuRect: null,
      dropAt: null,
      showGrid: true,
      selectedBlockId: null,
      panelTab: 'style',
      saveState: { kind: 'idle' },
      toast: null,

      selectBlock: (id) => set(id ? { selectedBlockId: id, panelTab: 'block', dropAt: null } : { selectedBlockId: null }),
      setPanelTab: (panelTab) => set({ panelTab }),

      addBlock: (type, at) => {
        const { config } = get();
        const why = canAdd(config, type);
        if (why) return why;
        const id = nanoid(8); // R2: 생성 시 발급, 이후 불변
        const { w, h } = CATALOG[type].size;
        // 고른 자리: 최소 크기보다 작으면 키우고 판 밖이면 안으로 당긴다. 카드만 클릭: 빈 자리 자동, 탭 메뉴는 맨 위 가로 꽉
        const rect = at ? clampRect({ w, h, ...at }, type) : type === 'nav' ? { x: 0, y: 0, w: COLS, h } : findFreeSpot(config.layout, w, h);
        commit({ ...config, layout: resolve({ ...config.layout, [id]: rect }, id), blocks: { ...config.blocks, [id]: newBlock(type) } });
        set({ selectedBlockId: id, panelTab: 'block', dropAt: null, draft: null, menuRect: null });
        return null;
      },

      removeBlock: (id) => {
        const { config, selectedBlockId } = get();
        const blocks = { ...config.blocks };
        const layout = { ...config.layout };
        delete blocks[id];
        delete layout[id];
        commit({ ...config, layout, blocks });
        if (selectedBlockId === id) set({ selectedBlockId: null });
      },

      // 칸에 맞추고(정수·판 안·최소 크기) 그 자리를 차지한다. 겹친 블록은 아래로 밀린다 (6.3)
      setRect: (id, rect, group) => {
        const block = get().config.blocks[id];
        if (block) commitLayout(resolve({ ...get().config.layout, [id]: clampRect(rect, block.type) }, id), group);
      },
      setLayout: (layout) => {
        const clean = { ...layout };
        delete clean[NEW_ID];
        commitLayout(clean);
      },
      liftUp: (id) => commitLayout(resolve(liftUp(get().config.layout, id), id)),
      collapseRows: () => commitLayout(collapseEmptyRows(get().config.layout)),

      // 6.5 자동 맞춤: 늘리기만 하고, 되돌리기 단계를 따로 만들지 않는다(그 맞춤을 일으킨 조작에 합친다)
      autoFit: (rows) =>
        set((s) => {
          let layout = s.config.layout;
          for (const id of orderedIds(layout)) {
            const r = layout[id];
            if (rows[id] > r.h) layout = resolve({ ...layout, [id]: { ...r, h: Math.min(rows[id], MAX_ROWS - r.y) } }, id);
          }
          return layout === s.config.layout ? s : { config: { ...s.config, layout } };
        }),

      setDraft: (draft) => set({ draft }),
      setMenuRect: (menuRect) => set({ menuRect }),
      setDropAt: (dropAt) => set(dropAt ? { dropAt, selectedBlockId: null } : { dropAt: null }),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      undo: () => travel(get().past, get().future, true),
      redo: () => travel(get().future, get().past, false),

      updateProps: (id, patch) => {
        const { config } = get();
        const block = config.blocks[id];
        if (!block) return;
        const next = { ...block, props: { ...block.props, ...patch } } as Block;
        commit({ ...config, blocks: { ...config.blocks, [id]: next } }, `type:${id}`);
      },

      // 연결은 되돌리기 대상이 아니므로 단계를 쌓지 않는다
      connectBlock: (id) =>
        set((s) => {
          const block = s.config.blocks[id];
          if (!block || !('feature' in block)) return s;
          const next = { ...block, feature: { ...block.feature, connected: true } } as Block;
          return { config: { ...s.config, blocks: { ...s.config.blocks, [id]: next } } };
        }),

      setList: (kind, blockId, list) => set((s) => ({ data: withList(s.data, kind, blockId, list as Notice[] | Photo[]) })),
      addItem: (kind, blockId, item) =>
        set((s) => ({ data: withList(s.data, kind, blockId, [item, ...(s.data[kind]?.[blockId] ?? [])] as Notice[] | Photo[]) })),
      removeItem: (kind, blockId, id) =>
        set((s) => ({
          data: withList(s.data, kind, blockId, (s.data[kind]?.[blockId] ?? []).filter((x) => x.id !== id) as Notice[] | Photo[]),
        })),

      setTheme: (patch) => commit({ ...get().config, theme: { ...get().config.theme, ...patch } }, 'type:theme'),
      setTitle: (title) => commit({ ...get().config, title }, 'type:title'),
      setSaveState: (saveState) => set({ saveState }),

      showToast: (message) => {
        clearTimeout(toastTimer);
        set({ toast: message });
        toastTimer = setTimeout(() => set({ toast: null }), 3000);
      },
    };
  });
}

export type EditorStore = ReturnType<typeof createEditorStore>;

export const EditorStoreContext = createContext<EditorStore | null>(null);

export function useEditorStore(): EditorStore {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('EditorStoreContext.Provider 안에서만 쓸 수 있어요');
  return store;
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useStore(useEditorStore(), selector);
}
