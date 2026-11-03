import type { PropsOf } from '@/lib/schema';
import type { BlockProps } from './index';

export function NavBlock({ props, site, mode }: BlockProps<PropsOf<'nav'>>) {
  return (
    <header className="bg-(--accent) text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
        <span className="text-lg font-semibold tracking-tight">{site.title}</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
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
      </div>
    </header>
  );
}
