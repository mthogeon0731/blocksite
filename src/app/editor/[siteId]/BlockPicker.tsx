'use client';

import { CATALOG_LIST } from '@/lib/catalog';
import type { BlockType, SiteConfig, Slot } from '@/lib/schema';
import { SLOT_RULES, canPlace } from '@/lib/slots';
import { useEditor } from '@/store/editor';

// 선택된 자리에 들어갈 수 있으면 그 자리. 아니면 오른쪽 → 왼쪽 → 상단 → 하단 순으로 규칙상 들어갈 수 있는 첫 자리.
const FALLBACK: Slot[] = ['main-right', 'main-left', 'header', 'footer'];

function pickSlot(config: SiteConfig, selected: Slot | null, type: BlockType): { slot: Slot } | { reason: string } {
  if (selected && canPlace(config, selected, type).ok) return { slot: selected };
  let reason = '넣을 수 있는 자리가 없어요';
  for (const slot of FALLBACK) {
    if (!SLOT_RULES[slot].allow.includes(type)) continue;
    const check = canPlace(config, slot, type);
    if (check.ok) return { slot };
    reason = check.reason;
  }
  return { reason };
}

export function BlockPicker() {
  const config = useEditor((s) => s.config);
  const selectedSlot = useEditor((s) => s.selectedSlot);
  const addBlock = useEditor((s) => s.addBlock);
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-bold">블록 고르기</h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          {selectedSlot ? `${SLOT_RULES[selectedSlot].label} 자리가 선택됐어요` : '미리보기에서 자리를 먼저 고를 수도 있어요'}
        </p>
      </div>
      <ul className="flex-1 space-y-2 overflow-auto p-3">
        {CATALOG_LIST.map((def) => {
          const target = pickSlot(config, selectedSlot, def.type);
          const disabled = 'reason' in target;
          return (
            <li key={def.type}>
              <button
                type="button"
                disabled={disabled}
                title={disabled ? target.reason : `${def.label} 블록 추가`}
                onClick={() => {
                  if ('slot' in target) addBlock(def.type, target.slot);
                }}
                className="flex w-full items-start gap-3 rounded-lg border border-neutral-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:bg-transparent"
              >
                <span className="text-xl leading-none">{def.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{def.label}</span>
                  <span className="block text-xs leading-snug text-neutral-500">{def.description}</span>
                </span>
              </button>
              <p className="mt-1 px-1 text-[11px] text-neutral-400">
                {'slot' in target ? `${SLOT_RULES[target.slot].label} 자리에 들어가요` : target.reason}
              </p>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
