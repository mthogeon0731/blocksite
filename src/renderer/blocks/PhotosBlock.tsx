import type { Photo } from '@/lib/schema';
import { SAMPLE_PHOTOS } from '@/lib/sample';
import type { BlockProps } from './index';
import { TEXT, cx, partOf } from './parts';

// 블록이 좁으면(컨테이너 24rem 미만) 최대 2열. 화면 폭이 아니라 블록 폭 기준
const GRID_COLS = { 2: 'grid-cols-2', 3: 'grid-cols-2 @sm:grid-cols-3' } as const;
const RATIO = { '4:3': 'aspect-[4/3]', '1:1': 'aspect-square', '3:4': 'aspect-[3/4]' } as const;

export function PhotosBlock({ props, data, connected, look }: BlockProps<'photos', Photo[]>) {
  // R7: 연결 전에는 샘플을 그린다
  const list = connected ? (data ?? []) : SAMPLE_PHOTOS;
  const heading = partOf(look, 'heading');
  const align = TEXT[partOf(look, 'grid').align];
  return (
    <section>
      {!heading.hidden && (
        <h2 data-part="heading" className={cx('mb-3 text-lg font-bold', TEXT[heading.align])}>
          {props.heading}
        </h2>
      )}
      {list.length === 0 ? (
        <p data-part="grid" className={cx('text-sm text-neutral-400', align)}>
          아직 사진이 없어요
        </p>
      ) : (
        <div data-part="grid" className={cx('grid gap-3', GRID_COLS[props.columns], align)}>
          {list.map((p) => (
            <figure key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption || '사진'} loading="lazy" className={`w-full rounded-lg bg-neutral-100 object-cover ${RATIO[look.ratio]}`} />
              {p.caption && <figcaption className="mt-1 text-xs text-neutral-500">{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
