import type { BlockProps } from './index';
import { JUSTIFY, TEXT, cx, partOf } from './parts';

export function PublicationsBlock({ props, look }: BlockProps<'publications'>) {
  const heading = partOf(look, 'heading');
  const list = partOf(look, 'list');
  return (
    <section>
      {/* 제목은 "논문" 고정, 부품으로는 정렬·숨기기만 (GRID_SPEC 7.3) */}
      {!heading.hidden && (
        <h2 data-part="heading" className={cx('mb-2 text-lg font-bold', TEXT[heading.align])}>
          논문
        </h2>
      )}
      {props.items.length === 0 ? (
        <p data-part="list" className={cx('text-sm text-neutral-400', TEXT[list.align])}>
          아직 논문이 없어요
        </p>
      ) : (
        <ol data-part="list" className="divide-y divide-neutral-100">
          {props.items.map((p, i) => (
            <li key={i} className={cx('flex gap-4 py-3', JUSTIFY[list.align])}>
              {look.yearPos === 'left' && <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold text-(--accent)">{p.year}</span>}
              <div className={cx('min-w-0', TEXT[list.align])}>
                <p className="text-xs text-neutral-500">{p.venue}</p>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
                    {p.title} ↗
                  </a>
                ) : (
                  <p className="font-medium">{p.title}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
