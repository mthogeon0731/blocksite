export const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

// GRID_SPEC 7.2 부품 정렬·숨기기. 정렬은 블록 안쪽 폭 기준 (pad 0이면 블록 가장자리에 닿는다)
export type Align = 'left' | 'center' | 'right';
export const TEXT: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };
export const BOX: Record<Align, string> = { left: 'mr-auto', center: 'mx-auto', right: 'ml-auto' }; // 블록보다 좁은 부품
export const SELF: Record<Align, string> = { left: 'self-start', center: 'self-center', right: 'self-end' }; // 세로 flex 안의 부품
export const JUSTIFY: Record<Align, string> = { left: 'justify-start', center: 'justify-center', right: 'justify-end' };

export function partOf(look: { parts: object }, key: string) {
  const p = (look.parts as Record<string, { align?: Align; hidden?: boolean } | undefined>)[key];
  return { align: p?.align ?? 'left', hidden: p?.hidden === true };
}
