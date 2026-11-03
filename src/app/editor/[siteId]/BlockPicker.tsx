'use client';

import { CATALOG_LIST } from '@/lib/catalog';
import { canAdd } from '@/lib/grid';
import { useEditor } from '@/store/editor';

export function BlockPicker() {
  const config = useEditor((s) => s.config);
  const addBlock = useEditor((s) => s.addBlock);
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-bold">블록 고르기</h2>
        <p className="mt-0.5 text-xs text-neutral-500">카드를 누르면 판의 빈 자리에 들어가요</p>
      </div>
      <ul className="flex-1 space-y-2 overflow-auto p-3">
        {CATALOG_LIST.map((def) => {
          const reason = canAdd(config, def.type); // 규칙상 불가하면 비활성 + 이유
          return (
            <li key={def.type}>
              <button
                type="button"
                disabled={!!reason}
                title={reason ?? `${def.label} 블록 추가`}
                onClick={() => addBlock(def.type)}
                className="flex w-full items-start gap-3 rounded-lg border border-neutral-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:bg-transparent"
              >
                <span className="text-xl leading-none">{def.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{def.label}</span>
                  <span className="block text-xs leading-snug text-neutral-500">{def.description}</span>
                </span>
              </button>
              {reason && <p className="mt-1 px-1 text-[11px] text-neutral-400">{reason}</p>}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
