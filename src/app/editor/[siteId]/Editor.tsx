'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { BlockData, SiteConfig } from '@/lib/schema';
import { BASE_W } from '@/lib/grid';
import { CATALOG, lookOf } from '@/lib/catalog';
import { SiteRenderer, cx, gridPlace } from '@/renderer/SiteRenderer';
import { createEditorStore, EditorStoreContext, useEditor, useEditorStore, type EditorStore } from '@/store/editor';
import { BlockPicker } from './BlockPicker';
import { SidePanel } from './SidePanel';

async function saveConfig(store: EditorStore) {
  const { config, setSaveState } = store.getState();
  setSaveState({ kind: 'saving' });
  try {
    const res = await fetch(`/api/sites/${encodeURIComponent(config.siteId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const body: { error?: string } = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `저장에 실패했어요 (${res.status})`);
    }
    setSaveState({
      kind: 'saved',
      at: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    });
  } catch (e) {
    setSaveState({ kind: 'error', message: e instanceof Error ? e.message : '저장에 실패했어요. 네트워크를 확인해 주세요' });
  }
}

export function Editor({ initial, initialData }: { initial: SiteConfig; initialData: BlockData }) {
  const [store] = useState(() => createEditorStore(initial, initialData));

  // ?key=… → 쿠키 (쓰기 API 보호용). 주소에서는 지운다.
  useEffect(() => {
    const url = new URL(window.location.href);
    const key = url.searchParams.get('key');
    if (!key) return;
    document.cookie = `editor_key=${encodeURIComponent(key)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    url.searchParams.delete('key');
    window.history.replaceState(null, '', url.toString());
  }, []);

  // 자동 저장: config가 바뀌고 1초 뒤 PUT
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.config === prev.config) return;
      clearTimeout(timer);
      timer = setTimeout(() => void saveConfig(store), 1000);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [store]);

  return (
    <EditorStoreContext.Provider value={store}>
      <div className="flex h-screen flex-col bg-neutral-100 text-neutral-900">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <BlockPicker />
          <Preview />
          <SidePanel />
        </div>
        <Toast />
      </div>
    </EditorStoreContext.Provider>
  );
}

function TopBar() {
  const title = useEditor((s) => s.config.title);
  const slug = useEditor((s) => s.config.slug);
  const setTitle = useEditor((s) => s.setTitle);
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
      <span className="text-sm font-bold text-indigo-700">블록 홈페이지</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="사이트 제목"
        className="w-56 rounded-md border border-neutral-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
      />
      <SaveStatus />
      <div className="ml-auto flex items-center gap-2 text-sm">
        <a href={`/s/${slug}`} target="_blank" rel="noreferrer" className="rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50">
          공개 페이지 보기 ↗
        </a>
        <PaidButton>배포·도메인 연결</PaidButton>
        <PaidButton>내보내기</PaidButton>
      </div>
    </header>
  );
}

function PaidButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      disabled
      title="시제품에서는 준비 중"
      className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-400"
    >
      {children}
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">유료</span>
    </button>
  );
}

function SaveStatus() {
  const saveState = useEditor((s) => s.saveState);
  const store = useEditorStore();
  switch (saveState.kind) {
    case 'idle':
      return <span className="text-xs text-neutral-400">바꾸면 자동으로 저장돼요</span>;
    case 'saving':
      return <span className="text-xs text-neutral-500">저장 중…</span>;
    case 'saved':
      return <span className="text-xs text-neutral-500">자동 저장됨 {saveState.at}</span>;
    case 'error':
      return (
        <span className="flex items-center gap-2 text-xs text-red-600">
          {saveState.message}
          <button
            type="button"
            onClick={() => void saveConfig(store)}
            className="rounded border border-red-300 px-1.5 py-0.5 hover:bg-red-50"
          >
            다시 시도
          </button>
        </span>
      );
  }
}

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

// GRID_SPEC 5.3: 판을 기준 폭 1152px(칸 24px)로 그리고 미리보기 영역에 맞게 축소한다(k ≤ 1).
// 공개 페이지와 같은 폭이라 줄바꿈이 같다(R9). 바깥 상자는 축소된 크기로 잡아 스크롤 길이를 맞춘다.
function Preview() {
  const config = useEditor((s) => s.config);
  const data = useEditor((s) => s.data);
  const selectBlock = useEditor((s) => s.selectBlock);
  const areaRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const area = useSize(areaRef);
  const stage = useSize(stageRef);
  const k = Math.min(1, area.width / BASE_W);
  return (
    <main ref={areaRef} className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 pt-12">
      <div className="mx-auto" style={{ width: BASE_W * k, height: stage.height * k, visibility: k ? undefined : 'hidden' }}>
        <div
          ref={stageRef}
          className="editor-stage origin-top-left"
          style={{ width: BASE_W, transform: `scale(${k})` }}
          onClick={(e) => {
            const target = e.target as Element;
            if (target.closest('a')) e.preventDefault(); // 편집 중에는 링크를 따라가지 않는다
            selectBlock(target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId ?? null);
          }}
        >
          <SiteRenderer config={config} data={data} mode="edit" overlay={<Overlay k={k} />} />
        </div>
      </div>
    </main>
  );
}

// 편집 장식: 판(CSS Grid)의 같은 칸 위에 겹친다. 행이 늘어나도 블록 영역과 정확히 맞는다.
// 판은 축소되어 보이므로 툴바·배지는 1/k로 되돌려 원래 글자 크기로 보이게 한다.
function Overlay({ k }: { k: number }) {
  const config = useEditor((s) => s.config);
  const selectedBlockId = useEditor((s) => s.selectedBlockId);
  const unscale = { transform: `scale(${k ? 1 / k : 1})` };
  return Object.entries(config.blocks).map(([id, block]) => {
    const rect = config.layout[id];
    const feature = 'feature' in block && !block.feature.connected ? CATALOG[block.type].feature : undefined;
    const selected = id === selectedBlockId;
    if (!rect || (!selected && !feature)) return null;
    return (
      <div
        key={id}
        className={cx('pointer-events-none relative z-10', selected && 'outline-2 outline-(--accent)', selected && lookOf(block).corner === 'round' && 'rounded-xl')}
        style={gridPlace(rect)}
      >
        {feature && (
          <span
            className="absolute right-2 top-2 origin-top-right whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
            style={unscale}
          >
            {feature.label} 연결 전 · 유료
          </span>
        )}
        {selected && (
          <div className="pointer-events-auto absolute bottom-full left-0 mb-1 origin-bottom-left" style={unscale} onClick={(e) => e.stopPropagation()}>
            <Toolbar id={id} />
          </div>
        )}
      </div>
    );
  });
}

const tb = 'rounded px-2 py-1 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent';

function Toolbar({ id }: { id: string }) {
  const noticeCount = useEditor((s) => s.data.notices?.[id]?.length ?? 0);
  const photoCount = useEditor((s) => s.data.photos?.[id]?.length ?? 0);
  const removeBlock = useEditor((s) => s.removeBlock);

  // 7절 7번: 데이터가 있는 블록은 시제품에서 삭제하지 않는다 (서버도 거부한다)
  const remove = () => {
    const has = noticeCount > 0 ? `공지 ${noticeCount}건` : photoCount > 0 ? `사진 ${photoCount}장` : null;
    if (has) {
      window.alert(`이 블록에 ${has}이 있어요. 시제품에서는 데이터가 있는 블록을 삭제할 수 없어요.`);
      return;
    }
    removeBlock(id);
  };

  return (
    <div className="flex items-center gap-0.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white p-1 text-xs text-neutral-700 shadow-sm">
      <button type="button" className={`${tb} text-red-600`} onClick={remove}>
        삭제
      </button>
    </div>
  );
}

function Toast() {
  const toast = useEditor((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg"
    >
      {toast}
    </div>
  );
}
