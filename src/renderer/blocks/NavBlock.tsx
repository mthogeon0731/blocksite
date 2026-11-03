import type { PropsOf } from '@/lib/schema';
import type { BlockProps } from './index';

// 바탕(포인트 색)·여백은 블록 상자(look)가 준다. 부품마다 data-part (GRID_SPEC 7.3)
export function NavBlock({ props, site, mode }: BlockProps<PropsOf<'nav'>>) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <span data-part="title" className="text-lg font-semibold tracking-tight">
        {site.title}
      </span>
      <nav data-part="items" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
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
