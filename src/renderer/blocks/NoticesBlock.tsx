import type { Notice } from '@/lib/schema';
import { SAMPLE_NOTICES } from '@/lib/sample';
import type { BlockProps } from './index';
import { TEXT, cx, partOf } from './parts';

export function NoticesBlock({ props, data, connected, look }: BlockProps<'notices', Notice[]>) {
  // R7: 연결 전에는 샘플을 그린다
  const list = (connected ? (data ?? []) : SAMPLE_NOTICES).slice(0, props.limit);
  const heading = partOf(look, 'heading');
  const align = TEXT[partOf(look, 'list').align];
  return (
    <section>
      {!heading.hidden && (
        <h2 data-part="heading" className={cx('mb-2 text-lg font-bold', TEXT[heading.align])}>
          {props.heading}
        </h2>
      )}
      {list.length === 0 ? (
        <p data-part="list" className={cx('text-sm text-neutral-400', align)}>
          아직 공지가 없어요
        </p>
      ) : (
        <ul data-part="list" className="divide-y divide-neutral-100">
          {list.map((n) => (
            <li key={n.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className={cx('min-w-0 flex-1 font-medium', align)}>{n.title}</p>
                {look.showDate && (
                  <time className="shrink-0 text-xs text-neutral-400" dateTime={n.created_at}>
                    {n.created_at.slice(0, 10)}
                  </time>
                )}
              </div>
              {n.body && <p className={cx('mt-1 line-clamp-2 text-sm text-neutral-600', align)}>{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
