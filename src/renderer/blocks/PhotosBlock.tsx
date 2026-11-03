import type { Photo, PropsOf } from '@/lib/schema';
import { SAMPLE_PHOTOS } from '@/lib/sample';
import type { BlockProps } from './index';

// 좁은 화면(모바일)에서는 최대 2열
const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3' } as const;

export function PhotosBlock({ props, data, connected }: BlockProps<PropsOf<'photos'>, Photo[]>) {
  // R7: 연결 전에는 샘플을 그린다
  const list = connected ? (data ?? []) : SAMPLE_PHOTOS;
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-bold">{props.heading}</h2>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">아직 사진이 없어요</p>
      ) : (
        <div className={`mt-3 grid gap-3 ${COLS[props.columns]}`}>
          {list.map((p) => (
            <figure key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption || '사진'} loading="lazy" className="aspect-[4/3] w-full rounded-lg bg-neutral-100 object-cover" />
              {p.caption && <figcaption className="mt-1 text-xs text-neutral-500">{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
