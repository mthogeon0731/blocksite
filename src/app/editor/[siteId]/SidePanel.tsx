'use client';

import { CATALOG } from '@/lib/catalog';
import type { Theme } from '@/lib/schema';
import { useEditor } from '@/store/editor';

// 남색, 청록, 적색, 보라, 주황, 회색
const PALETTE = ['#1E3A8A', '#236A65', '#B91C1C', '#6D28D9', '#C2410C', '#374151'];
const FONTS: { value: Theme['font']; label: string; css: string }[] = [
  { value: 'pretendard', label: 'Pretendard (고딕)', css: '"Pretendard Variable", Pretendard, sans-serif' },
  { value: 'noto-serif', label: 'Noto Serif KR (명조)', css: '"Noto Serif KR", serif' },
  { value: 'system', label: '시스템 기본', css: 'system-ui, sans-serif' },
];
const SCALES: { value: Theme['scale']; label: string }[] = [
  { value: 'sm', label: '작게' },
  { value: 'md', label: '보통' },
  { value: 'lg', label: '크게' },
];

export function SidePanel() {
  const tab = useEditor((s) => s.panelTab);
  const setTab = useEditor((s) => s.setPanelTab);
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-neutral-200 bg-white">
      <div role="tablist" className="flex border-b border-neutral-100 text-sm">
        {(['style', 'block'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 font-medium ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            {t === 'style' ? '스타일' : '블록'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">{tab === 'style' ? <StylePanel /> : <BlockPanel />}</div>
    </aside>
  );
}

function StylePanel() {
  const theme = useEditor((s) => s.config.theme);
  const setTheme = useEditor((s) => s.setTheme);
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="font-semibold">포인트 색</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setTheme({ accent: c })}
              className={`h-8 w-8 rounded-full ring-offset-2 ${theme.accent.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-neutral-800' : 'hover:ring-2 hover:ring-neutral-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="ml-1 flex items-center gap-1.5 text-xs text-neutral-500">
            직접 입력
            <input
              type="color"
              value={theme.accent}
              onChange={(e) => setTheme({ accent: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded border border-neutral-200"
            />
          </label>
        </div>
      </section>
      <section>
        <h3 className="font-semibold">글꼴</h3>
        <div className="mt-2 space-y-1.5">
          {FONTS.map((f) => (
            <label
              key={f.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${theme.font === f.value ? 'border-indigo-500 bg-indigo-50/50' : 'border-neutral-200 hover:bg-neutral-50'}`}
            >
              <span className="flex items-center gap-2">
                <input type="radio" name="font" checked={theme.font === f.value} onChange={() => setTheme({ font: f.value })} />
                {f.label}
              </span>
              <span className="text-base" style={{ fontFamily: f.css }}>
                가나다 Aa
              </span>
            </label>
          ))}
        </div>
      </section>
      <section>
        <h3 className="font-semibold">글자 크기</h3>
        <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-lg border border-neutral-200">
          {SCALES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setTheme({ scale: s.value })}
              className={`py-2 ${theme.scale === s.value ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BlockPanel() {
  const id = useEditor((s) => s.selectedBlockId);
  const block = useEditor((s) => (s.selectedBlockId ? s.config.blocks[s.selectedBlockId] : undefined));
  if (!id || !block) return <p className="text-sm text-neutral-500">미리보기에서 블록을 클릭하면 여기서 편집할 수 있어요.</p>;
  const def = CATALOG[block.type];
  const feature = 'feature' in block ? block.feature : undefined;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">{def.icon}</span>
        <div>
          <p className="font-semibold">{def.label}</p>
          <p className="text-xs text-neutral-400">블록 id {id} · 옮겨도 바뀌지 않아요</p>
        </div>
      </div>
      <p className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">내용 편집 폼은 2단계(11/4)에서 추가돼요.</p>
      {def.feature && feature && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="font-medium text-amber-900">
            {feature.connected ? `${def.feature.label} 기능이 연결되어 있어요` : `${def.feature.label} 기능이 아직 연결되지 않았어요`}
          </p>
          <p className="mt-1 text-xs text-amber-800">{def.feature.description}</p>
          {!feature.connected && (
            <button
              type="button"
              disabled
              title="2단계에서 결제 모달이 붙어요"
              className="mt-3 w-full rounded-md bg-amber-200/70 py-2 font-medium text-amber-900/60"
            >
              기능 연결 (유료)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
