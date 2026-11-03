'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CATALOG_LIST, type BlockDef } from '@/lib/catalog';
import { canAdd, clampRect, resolve } from '@/lib/grid';
import { NEW_ID, useEditor, useEditorStore } from '@/store/editor';
import { boardEl, cellAt } from './Board';

export function BlockPicker() {
  const config = useEditor((s) => s.config);
  const dropAt = useEditor((s) => s.dropAt);
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-bold">블록 고르기</h2>
        <p className={`mt-0.5 text-xs ${dropAt ? 'font-medium text-indigo-700' : 'text-neutral-500'}`}>
          {dropAt ? `선택한 칸 (x ${dropAt.x} · y ${dropAt.y})에 놓여요` : '카드를 판의 원하는 칸에 끌어다 놓거나, 누르면 빈 자리에 들어가요'}
        </p>
      </div>
      <ul className="flex-1 space-y-2 overflow-auto p-3">
        {CATALOG_LIST.map((def) => (
          <Card key={def.type} def={def} reason={canAdd(config, def.type)} />
        ))}
      </ul>
    </aside>
  );
}

// GRID_SPEC 6.6 카드: 끌면 기본 크기 고스트가 칸에 맞춰 따라오고 놓은 칸이 블록의 왼쪽 위(2).
// 누르면 놓을 자리가 있으면 그 칸(3), 없으면 빈 자리 자동(4). 규칙상 불가하면 비활성 + 이유
function Card({ def, reason }: { def: BlockDef; reason: string | null }) {
  const store = useEditorStore();
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [chip, setChip] = useState<{ x: number; y: number } | null>(null);

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5)) return;
    d.moved = true;
    setChip({ x: e.clientX, y: e.clientY });
    const s = store.getState();
    const board = boardEl();
    const cell = board && cellAt(board, e.clientX, e.clientY);
    if (!cell?.inside) return s.setDraft(null);
    const rect = clampRect({ x: cell.x, y: cell.y, ...def.size }, def.type); // 오른쪽 벽을 넘으면 x를 안으로 당긴다
    s.setDraft({ layout: resolve({ ...s.config.layout, [NEW_ID]: rect }, NEW_ID), id: NEW_ID }); // 밀려날 결과까지 미리 보여 준다
  };
  const onPointerUp = () => {
    setChip(null);
    if (!drag.current?.moved) return;
    const s = store.getState();
    const rect = s.draft?.layout[NEW_ID];
    s.setDraft(null);
    if (rect) s.addBlock(def.type, rect); // 판 밖에서 놓으면 취소
  };
  const onCancel = () => {
    drag.current = null;
    setChip(null);
    store.getState().setDraft(null);
  };
  const onClick = () => {
    const moved = drag.current?.moved;
    drag.current = null;
    if (moved) return; // 끌어서 놓은 뒤 따라오는 클릭
    const s = store.getState();
    s.addBlock(def.type, s.dropAt ?? undefined);
  };

  return (
    <li>
      <button
        type="button"
        disabled={!!reason}
        title={reason ?? `${def.label} 블록 추가`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onCancel}
        onClick={onClick}
        className="flex w-full touch-none items-start gap-3 rounded-lg border border-neutral-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:bg-transparent"
      >
        <span className="text-xl leading-none">{def.icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{def.label}</span>
          <span className="block text-xs leading-snug text-neutral-500">{def.description}</span>
        </span>
      </button>
      {reason && <p className="mt-1 px-1 text-[11px] text-neutral-400">{reason}</p>}
      {chip && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium shadow-md ring-1 ring-neutral-200"
          style={{ left: chip.x + 12, top: chip.y + 12 }}
        >
          {def.icon} {def.label}
        </div>
      )}
    </li>
  );
}
