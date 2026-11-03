'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { BlockData, SiteConfig } from '@/lib/schema';
import { collapseEmptyRows, sameLayout } from '@/lib/grid';
import { cx } from '@/renderer/SiteRenderer';
import { createEditorStore, EditorStoreContext, useEditor, useEditorStore, type EditorStore } from '@/store/editor';
import { BlockPicker } from './BlockPicker';
import { Board } from './Board';
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
          <Board />
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
      <BoardButtons />
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

const bar = 'rounded-md px-2 py-1.5 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent';

// GRID_SPEC 6.4 상단 바: 되돌리기·다시 하기·빈 줄 정리·격자 보기
function BoardButtons() {
  const store = useEditorStore();
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const canTidy = useEditor((s) => !sameLayout(collapseEmptyRows(s.config.layout), s.config.layout));
  const showGrid = useEditor((s) => s.showGrid);
  const { undo, redo, collapseRows, toggleGrid } = store.getState(); // 액션은 바뀌지 않는다
  return (
    <div className="flex items-center gap-0.5 border-l border-neutral-200 pl-2 text-sm text-neutral-700">
      <button type="button" className={bar} disabled={!canUndo} onClick={undo} title="되돌리기 (Ctrl+Z)">
        ↶ 되돌리기
      </button>
      <button type="button" className={bar} disabled={!canRedo} onClick={redo} title="다시 하기 (Ctrl+Shift+Z)">
        ↷ 다시 하기
      </button>
      <button type="button" className={bar} disabled={!canTidy} onClick={collapseRows} title="블록이 없는 가로 줄을 맨 위는 없애고, 블록 사이는 1줄로 줄여요">
        빈 줄 정리
      </button>
      <button type="button" aria-pressed={showGrid} className={cx(bar, showGrid && 'bg-indigo-50 text-indigo-700')} onClick={toggleGrid}>
        격자 보기
      </button>
    </div>
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
