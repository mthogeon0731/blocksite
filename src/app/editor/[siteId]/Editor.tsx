'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { SiteConfig, Slot } from '@/lib/schema';
import { SLOTS } from '@/lib/schema';
import { SLOT_RULES, canPlace } from '@/lib/slots';
import { SiteRenderer } from '@/renderer/SiteRenderer';
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

export function Editor({ initial }: { initial: SiteConfig }) {
  const [store] = useState(() => createEditorStore(initial));

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

function Preview() {
  const config = useEditor((s) => s.config);
  const selectedBlockId = useEditor((s) => s.selectedBlockId);
  const selectedSlot = useEditor((s) => s.selectedSlot);
  const selectBlock = useEditor((s) => s.selectBlock);
  const selectSlot = useEditor((s) => s.selectSlot);
  return (
    <main className="min-w-0 flex-1 overflow-auto p-6 pt-12">
      <div className="mx-auto max-w-5xl rounded-xl bg-neutral-50 shadow-sm ring-1 ring-neutral-200">
        <SiteRenderer
          config={config}
          data={{}}
          mode="edit"
          edit={{
            selectedBlockId,
            selectedSlot,
            onSelectBlock: selectBlock,
            onSelectSlot: selectSlot,
            toolbar: (id, slot) => <Toolbar id={id} slot={slot} />,
          }}
        />
      </div>
    </main>
  );
}

const tb = 'rounded px-2 py-1 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent';

function Toolbar({ id, slot }: { id: string; slot: Slot }) {
  const config = useEditor((s) => s.config);
  const moveBlock = useEditor((s) => s.moveBlock);
  const moveToSlot = useEditor((s) => s.moveToSlot);
  const removeBlock = useEditor((s) => s.removeBlock);
  const block = config.blocks[id];
  if (!block) return null;
  const ids = config.slots[slot];
  const index = ids.indexOf(id);
  const targets = SLOTS.filter((s) => s !== slot && canPlace(config, s, block.type, id).ok);
  return (
    <div className="flex items-center gap-0.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white p-1 text-xs text-neutral-700 shadow-sm">
      <button type="button" className={tb} disabled={index <= 0} onClick={() => moveBlock(id, 'up')}>
        ▲ 위로
      </button>
      <button type="button" className={tb} disabled={index >= ids.length - 1} onClick={() => moveBlock(id, 'down')}>
        ▼ 아래로
      </button>
      <details className="relative">
        <summary className={`${tb} cursor-pointer select-none`}>다른 자리로 ▾</summary>
        <ul className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-md border border-neutral-200 bg-white py-1 shadow-md">
          {targets.length === 0 ? (
            <li className="px-3 py-1 text-neutral-400">옮길 수 있는 자리가 없어요</li>
          ) : (
            targets.map((s) => (
              <li key={s}>
                <button type="button" className="w-full px-3 py-1 text-left hover:bg-neutral-100" onClick={() => moveToSlot(id, s)}>
                  {SLOT_RULES[s].label} 자리로
                </button>
              </li>
            ))
          )}
        </ul>
      </details>
      <button type="button" className={`${tb} text-red-600`} onClick={() => removeBlock(id)}>
        삭제
      </button>
    </div>
  );
}
