import type { PropsOf } from '@/lib/schema';
import type { BlockProps } from './index';

export function PublicationsBlock({ props }: BlockProps<PropsOf<'publications'>>) {
  return (
    <section>
      <h2 data-part="heading" className="text-lg font-bold">
        논문
      </h2>
      {props.items.length === 0 ? (
        <p data-part="list" className="mt-2 text-sm text-neutral-400">
          아직 논문이 없어요
        </p>
      ) : (
        <ol data-part="list" className="mt-2 divide-y divide-neutral-100">
          {props.items.map((p, i) => (
            <li key={i} className="flex gap-4 py-3">
              <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold text-(--accent)">{p.year}</span>
              <div className="min-w-0">
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
