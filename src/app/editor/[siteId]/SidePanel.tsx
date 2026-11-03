'use client';

import type { Theme } from '@/lib/schema';
import { useEditor } from '@/store/editor';
import { BlockPanel } from './BlockPanel';

// 남색, 청록, 적색, 보라, 주황, 회색
const PALETTE = ['#1E3A8A', '#236A65', '#B91C1C', '#6D28D9', '#C2410C', '#374151'];
const FONTS: { value: Theme['font']; label: string; css: string }[] = [
  { value: 'pretendard', label: 'Pretendard (고딕)', css: '"Pretendard Variable", Pretendard, sans-serif' },
  { value: 'noto-serif', label: 'Noto Serif KR (명조)', css: '"Noto Serif KR", serif' },
  { value: 'system', label: '시스템 기본', css: 'system-ui, sans-serif' },
];
// GRID_SPEC 5.4 공개 페이지 배경 (사이트 단위). 편집용 격자와는 별개다
const BACKGROUNDS: { value: Theme['background']; label: string }[] = [
  { value: 'plain', label: '없음' },
  { value: 'grid', label: '모눈' },
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
      <section>
        <h3 className="font-semibold">배경</h3>
        <p className="mt-0.5 text-xs text-neutral-500">공개 페이지 바탕이에요. 모눈은 블록이 놓인 칸에 맞춰 옅게 깔려요</p>
        <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-200">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setTheme({ background: b.value })}
              className={`py-2 ${theme.background === b.value ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50'}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
