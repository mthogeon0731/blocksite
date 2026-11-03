import type { Photo, PropsOf } from '@/lib/schema';
import { SAMPLE_PHOTOS } from '@/lib/sample';
import type { BlockProps } from './index';

// 블록이 좁으면(컨테이너 24rem 미만) 최대 2열. 화면 폭이 아니라 블록 폭 기준
const GRID_COLS = { 2: 'grid-cols-2', 3: 'grid-cols-2 @sm:grid-cols-3' } as const;

export function PhotosBlock({ props, data, connected }: BlockProps<PropsOf<'photos'>, Photo[]>) {
  // R7: 연결 전에는 샘플을 그린다
  const list = connected ? (data ?? []) : SAMPLE_PHOTOS;
  return (
    <section>
      <h2 data-part="heading" className="text-lg font-bold">
        {props.heading}
      </h2>
      {list.length === 0 ? (
        <p data-part="grid" className="mt-2 text-sm text-neutral-400">
          아직 사진이 없어요
        </p>
      ) : (
        <div data-part="grid" className={`mt-3 grid gap-3 ${GRID_COLS[props.columns]}`}>
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
