import type { CSSProperties, ReactNode } from 'react';
import type { Block, SiteConfig, Theme } from '@/lib/schema';
import { COLS, orderedIds, type Rect } from '@/lib/grid';
import { lookOf } from '@/lib/catalog';
import { renderBlock, type BlockData, type Mode } from './blocks';

export type { BlockData, Mode };

const FONT_STACK: Record<Theme['font'], string> = {
  pretendard: '"Pretendard Variable", Pretendard, system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  'noto-serif': '"Noto Serif KR", "Apple SD Gothic Neo", serif',
  system: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
};
const SCALE: Record<Theme['scale'], number> = { sm: 0.9, md: 1, lg: 1.15 };

// theme → CSS 변수 (R5: 사이트 단위). --s는 globals.css의 .site 규칙이 글자 크기에 반영한다.
export function themeStyle(theme: Theme): CSSProperties {
  return { '--accent': theme.accent, '--s': SCALE[theme.scale], fontFamily: FONT_STACK[theme.font] } as CSSProperties;
}

export const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

// 칸 직사각형 → 판(CSS Grid) 위 자리. 편집기 장식도 같은 자리에 겹친다
export const gridPlace = (r: Rect): CSSProperties => ({ gridColumn: `${r.x + 1} / span ${r.w}`, gridRow: `${r.y + 1} / span ${r.h}` });

interface RenderProps {
  config: SiteConfig;
  data: BlockData;
  mode: Mode;
  overlay?: ReactNode; // 편집기 장식(선택 테두리·툴바 등). 판의 같은 칸 위에 겹친다. 렌더러는 내용을 모른다 (R6)
}

// (config, data, mode) → UI. 편집기와 공개 페이지가 같이 쓴다 (R1·R9).
// 판은 48칸 CSS Grid(globals.css .board). 블록 DOM 순서는 (y, x, id)라 모바일 세로 쌓기와 읽기 순서가 맞는다.
export function SiteRenderer({ config, data, mode, overlay }: RenderProps) {
  return (
    <div
      className={cx('site @container min-h-full bg-neutral-50 text-neutral-900', mode === 'public' && 'overflow-x-clip')}
      style={themeStyle(config.theme)}
    >
      <div className="board" data-mode={mode}>
        {orderedIds(config.layout).map((id) => {
          const block = config.blocks[id];
          if (!block) return null;
          return (
            <BlockFrame key={id} id={id} block={block} rect={config.layout[id]}>
              {renderBlock(id, block, data, { theme: config.theme, mode, site: { title: config.title } })}
            </BlockFrame>
          );
        })}
        {overlay}
      </div>
    </div>
  );
}

const FRAME = {
  card: 'border border-neutral-200 bg-white [--bw:1px]',
  plain: '',
  fill: 'bg-(--accent) text-white',
} as const;
const PAD = ['p-0', 'p-2', 'p-5', 'p-8'] as const; // 0 / 8 / 20 / 32px. 글자 크기 배율은 적용하지 않는다
const VALIGN = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' } as const;

// 탭 메뉴 앵커용 id: 제목이 있으면 제목, 프로필은 "소개", 논문은 "논문"
const anchorOf = (block: Block) =>
  'heading' in block.props ? block.props.heading : block.type === 'profile' ? '소개' : block.type === 'publications' ? '논문' : undefined;

// 블록 상자: 자기 칸 영역을 꽉 채우고(stretch) 내용은 valign에 따라 놓는다 (5.2). 안쪽 반응은 블록 폭 기준(@container)
function BlockFrame({ id, block, rect, children }: { id: string; block: Block; rect: Rect; children: ReactNode }) {
  const look = lookOf(block);
  // bleed: 그쪽 벽에 닿아 있고 바탕이 있을 때만 바탕을 화면 끝까지 잇는다 (7.1, globals.css .bleed-*)
  const left = look.frame !== 'plain' && rect.x === 0 && (look.bleed === 'left' || look.bleed === 'both');
  const right = look.frame !== 'plain' && rect.x + rect.w === COLS && (look.bleed === 'right' || look.bleed === 'both');
  const round = look.corner === 'round';
  return (
    <div
      id={anchorOf(block)}
      data-block-id={id}
      className={cx(
        '@container relative flex min-w-0 flex-col',
        FRAME[look.frame],
        PAD[look.pad],
        VALIGN[look.valign],
        round && 'rounded-xl',
        left && 'bleed-l rounded-l-none border-l-0',
        right && 'bleed-r rounded-r-none border-r-0',
      )}
      style={gridPlace(rect)}
    >
      {children}
    </div>
  );
}
