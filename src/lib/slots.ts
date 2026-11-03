import { SLOTS, type BlockType, type SiteConfig, type Slot } from './schema';
import { CATALOG } from './catalog';

// 6절 슬롯 규칙표 (R4). UI와 서버가 같은 표를 쓴다.
// main-left에 notices·photos를 추가함: 데모 4번·2단계 완료 기준("notices를 main-left로 이동")이 원래 표와 모순이라 데모를 따른다.
export const SLOT_RULES: Record<Slot, { label: string; allow: readonly BlockType[]; max: number }> = {
  header: { label: '상단', allow: ['nav'], max: 1 },
  'main-left': { label: '왼쪽', allow: ['profile', 'text', 'publications', 'notices', 'photos'], max: 3 },
  'main-right': { label: '오른쪽', allow: ['text', 'notices', 'photos', 'publications'], max: 4 },
  footer: { label: '하단', allow: ['text'], max: 1 },
};

// 사이트당 1개만 허용
export const SINGLETON: readonly BlockType[] = ['nav', 'profile', 'notices', 'photos'];

export function countType(config: SiteConfig, type: BlockType) {
  return Object.values(config.blocks).filter((b) => b.type === type).length;
}

export function findSlotOf(config: SiteConfig, id: string): Slot | null {
  return SLOTS.find((s) => config.slots[s].includes(id)) ?? null;
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

// type 블록을 slot에 넣을 수 있나. movingId가 있으면 "이동" (자기 자신은 세지 않음)
export function canPlace(config: SiteConfig, slot: Slot, type: BlockType, movingId?: string): PlaceCheck {
  const rule = SLOT_RULES[slot];
  if (!rule.allow.includes(type)) return { ok: false, reason: '이 자리에는 넣을 수 없어요' };
  if (!movingId && SINGLETON.includes(type) && countType(config, type) >= 1) return { ok: false, reason: '이미 하나 있어요' };
  if (config.slots[slot].filter((id) => id !== movingId).length >= rule.max)
    return { ok: false, reason: `이 자리는 ${rule.max}개까지만 넣을 수 있어요` };
  return { ok: true };
}

// 전체 검증 (서버 PUT + 클라 공용). 위반이면 한국어 이유, 정상이면 null
export function validateConfig(config: SiteConfig): string | null {
  const seen = new Set<string>();
  for (const slot of SLOTS) {
    const rule = SLOT_RULES[slot];
    const ids = config.slots[slot];
    if (ids.length > rule.max) return `${rule.label} 자리에는 블록을 ${rule.max}개까지만 넣을 수 있어요`;
    for (const id of ids) {
      const block = config.blocks[id];
      if (!block) return `자리에 있는 블록(${id})의 내용이 없어요`;
      if (seen.has(id)) return `블록(${id})이 두 자리에 동시에 있어요`;
      seen.add(id);
      if (!rule.allow.includes(block.type)) return `${CATALOG[block.type].label} 블록은 ${rule.label} 자리에 넣을 수 없어요`;
    }
  }
  for (const id of Object.keys(config.blocks)) if (!seen.has(id)) return `블록(${id})이 어느 자리에도 없어요`;
  for (const type of SINGLETON) if (countType(config, type) > 1) return `${CATALOG[type].label} 블록은 하나만 넣을 수 있어요`;
  return null;
}
