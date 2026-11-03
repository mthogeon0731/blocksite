import type { BlockProps } from './index';
import { SELF, cx, partOf } from './parts';

// navLayout: 양쪽 끝(제목 왼쪽·메뉴 오른쪽) / 위아래 / 가운데로 모음. 부품 정렬은 위아래 배치에서 줄마다 적용된다
const LAYOUT = {
  spread: 'flex-row flex-wrap items-center justify-between',
  stack: 'flex-col',
  center: 'flex-row flex-wrap items-center justify-center',
} as const;

// 바탕(포인트 색)·여백은 블록 상자(look)가 준다. 부품마다 data-part (GRID_SPEC 7.3)
export function NavBlock({ props, site, mode, look }: BlockProps<'nav'>) {
  const title = partOf(look, 'title');
  const items = partOf(look, 'items');
  const stack = look.navLayout === 'stack';
  return (
    <header className={`flex gap-x-6 gap-y-2 ${LAYOUT[look.navLayout]}`}>
      {!title.hidden && (
        <span data-part="title" className={cx('text-lg font-semibold tracking-tight', stack && SELF[title.align])}>
          {site.title}
        </span>
      )}
      <nav data-part="items" className={cx('flex flex-wrap gap-x-5 gap-y-1 text-sm', stack && SELF[items.align])}>
        {props.items.map((item, i) => (
          <a
            key={i}
            href={`#${item}`}
            onClick={mode === 'edit' ? (e) => e.preventDefault() : undefined}
            className="opacity-90 underline-offset-4 hover:opacity-100 hover:underline"
          >
            {item}
          </a>
        ))}
      </nav>
    </header>
  );
}
