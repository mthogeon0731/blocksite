import type { Notice, PropsOf } from '@/lib/schema';
import { SAMPLE_NOTICES } from '@/lib/sample';
import type { BlockProps } from './index';

export function NoticesBlock({ props, data, connected }: BlockProps<PropsOf<'notices'>, Notice[]>) {
  // R7: 연결 전에는 샘플을 그린다
  const list = (connected ? (data ?? []) : SAMPLE_NOTICES).slice(0, props.limit);
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-bold">{props.heading}</h2>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">아직 공지가 없어요</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100">
          {list.map((n) => (
            <li key={n.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{n.title}</p>
                <time className="shrink-0 text-xs text-neutral-400" dateTime={n.created_at}>
                  {n.created_at.slice(0, 10)}
                </time>
              </div>
              {n.body && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
