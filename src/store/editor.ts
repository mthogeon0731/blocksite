import { createContext, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { nanoid } from 'nanoid';
import type { Block, BlockData, BlockType, Notice, SiteConfig, Slot, Theme } from '@/lib/schema';
import { newBlock } from '@/lib/catalog';
import { canPlace, findSlotOf } from '@/lib/slots';

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'error'; message: string };

export interface EditorState {
  config: SiteConfig;
  data: BlockData; // 연결된 블록의 공지·사진. blockId 기준이라 블록을 옮겨도 그대로 (R3)
  selectedBlockId: string | null;
  selectedSlot: Slot | null;
  panelTab: 'style' | 'block';
  saveState: SaveState;
  toast: string | null;
  selectBlock: (id: string, slot: Slot) => void;
  selectSlot: (slot: Slot | null) => void;
  setPanelTab: (tab: 'style' | 'block') => void;
  addBlock: (type: BlockType, slot: Slot) => string | null; // 실패하면 이유
  removeBlock: (id: string) => void;
  moveBlock: (id: string, dir: 'up' | 'down') => void;
  moveToSlot: (id: string, slot: Slot) => string | null; // 실패하면 이유
  updateProps: (id: string, patch: Partial<Block['props']>) => void;
  connectBlock: (id: string) => void; // 서버가 연결을 확인한 뒤 로컬 상태 반영
  setNotices: (blockId: string, list: Notice[]) => void;
  addNotice: (blockId: string, notice: Notice) => void;
  removeNotice: (blockId: string, noticeId: string) => void;
  setTheme: (patch: Partial<Theme>) => void;
  setTitle: (title: string) => void;
  setSaveState: (s: SaveState) => void;
  showToast: (message: string) => void;
}

const withoutId = (slots: SiteConfig['slots'], id: string) =>
  Object.fromEntries(Object.entries(slots).map(([k, ids]) => [k, ids.filter((x) => x !== id)])) as SiteConfig['slots'];

// 편집기 인스턴스마다 스토어 하나 (Editor.tsx가 만들어 Context로 내려준다)
export function createEditorStore(initial: SiteConfig, initialData: BlockData) {
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  return createStore<EditorState>()((set, get) => ({
    config: initial,
    data: initialData,
    selectedBlockId: null,
    selectedSlot: null,
    panelTab: 'style',
    saveState: { kind: 'idle' },
    toast: null,

    selectBlock: (id, slot) => set({ selectedBlockId: id, selectedSlot: slot, panelTab: 'block' }),
    selectSlot: (slot) => set({ selectedSlot: slot, selectedBlockId: null }),
    setPanelTab: (panelTab) => set({ panelTab }),

    addBlock: (type, slot) => {
      const { config } = get();
      const check = canPlace(config, slot, type);
      if (!check.ok) return check.reason;
      const id = nanoid(8); // R2: 생성 시 발급, 이후 불변
      set({
        config: {
          ...config,
          slots: { ...config.slots, [slot]: [...config.slots[slot], id] },
          blocks: { ...config.blocks, [id]: newBlock(type) },
        },
        selectedBlockId: id,
        selectedSlot: slot,
        panelTab: 'block',
      });
      return null;
    },

    removeBlock: (id) => {
      const { config, selectedBlockId } = get();
      const blocks = { ...config.blocks };
      delete blocks[id];
      set({
        config: { ...config, slots: withoutId(config.slots, id), blocks },
        selectedBlockId: selectedBlockId === id ? null : selectedBlockId,
      });
    },

    moveBlock: (id, dir) => {
      const { config } = get();
      const slot = findSlotOf(config, id);
      if (!slot) return;
      const ids = [...config.slots[slot]];
      const i = ids.indexOf(id);
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      set({ config: { ...config, slots: { ...config.slots, [slot]: ids } } });
    },

    // 위치만 바뀐다. 블록 id와 그 id에 묶인 데이터는 그대로 (R2/R3)
    moveToSlot: (id, slot) => {
      const { config } = get();
      const block = config.blocks[id];
      if (!block) return '블록이 없어요';
      const check = canPlace(config, slot, block.type, id);
      if (!check.ok) return check.reason;
      const slots = withoutId(config.slots, id);
      set({ config: { ...config, slots: { ...slots, [slot]: [...slots[slot], id] } }, selectedSlot: slot });
      return null;
    },

    updateProps: (id, patch) =>
      set((s) => {
        const block = s.config.blocks[id];
        if (!block) return s;
        const next = { ...block, props: { ...block.props, ...patch } } as Block;
        return { config: { ...s.config, blocks: { ...s.config.blocks, [id]: next } } };
      }),

    connectBlock: (id) =>
      set((s) => {
        const block = s.config.blocks[id];
        if (!block || !('feature' in block)) return s;
        const next = { ...block, feature: { ...block.feature, connected: true } } as Block;
        return { config: { ...s.config, blocks: { ...s.config.blocks, [id]: next } } };
      }),

    setNotices: (blockId, list) => set((s) => ({ data: { ...s.data, notices: { ...s.data.notices, [blockId]: list } } })),
    addNotice: (blockId, notice) =>
      set((s) => ({
        data: { ...s.data, notices: { ...s.data.notices, [blockId]: [notice, ...(s.data.notices?.[blockId] ?? [])] } },
      })),
    removeNotice: (blockId, noticeId) =>
      set((s) => ({
        data: {
          ...s.data,
          notices: { ...s.data.notices, [blockId]: (s.data.notices?.[blockId] ?? []).filter((n) => n.id !== noticeId) },
        },
      })),

    setTheme: (patch) => set((s) => ({ config: { ...s.config, theme: { ...s.config.theme, ...patch } } })),
    setTitle: (title) => set((s) => ({ config: { ...s.config, title } })),
    setSaveState: (saveState) => set({ saveState }),

    showToast: (message) => {
      clearTimeout(toastTimer);
      set({ toast: message });
      toastTimer = setTimeout(() => set({ toast: null }), 3000);
    },
  }));
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
