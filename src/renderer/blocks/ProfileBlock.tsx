import type { BlockProps } from './index';
import { BOX, TEXT, cx, partOf } from './parts';

const SHAPE = { portrait: 'aspect-[3/4] rounded-lg', square: 'aspect-square rounded-lg', circle: 'aspect-square rounded-full' } as const;
// photoSize: 위에 놓으면 안쪽 폭의 1/3 · 1/2 · 전체, 옆에 놓으면 1/4 · 1/3 · 1/2 (GRID_SPEC 7.3)
const TOP_W = { s: 'w-1/3', m: 'w-1/2', l: 'w-full' } as const;
const SIDE_W = { s: '@min-[360px]:w-1/4', m: '@min-[360px]:w-1/3', l: '@min-[360px]:w-1/2' } as const;
// 사진 왼쪽·오른쪽은 블록 폭(컨테이너) 360px 이상일 때만. 좁으면 위에 그린다
const POS = { top: 'flex-col', left: 'flex-col @min-[360px]:flex-row', right: 'flex-col @min-[360px]:flex-row-reverse' } as const;

export function ProfileBlock({ props, look }: BlockProps<'profile'>) {
  const { name, title, dept, email, photoUrl } = props;
  const [photo, nameP, titleP, deptP, emailP] = ['photo', 'name', 'title', 'dept', 'email'].map((k) => partOf(look, k));
  const side = look.photoPos !== 'top';
  const shape = SHAPE[look.photoShape];
  return (
    <section className={`flex gap-x-5 ${POS[look.photoPos]}`}>
      {!photo.hidden && (
        <div data-part="photo" className={cx('mb-4 shrink-0', TOP_W[look.photoSize], side ? `${SIDE_W[look.photoSize]} @min-[360px]:mb-0` : BOX[photo.align])}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={name} className={`w-full object-cover ${shape}`} />
          ) : (
            <div className={`flex w-full items-center justify-center bg-neutral-100 text-5xl font-bold text-(--accent) ${shape}`}>
              {name.trim().slice(0, 1) || '?'}
            </div>
          )}
        </div>
      )}
      <div className={cx('min-w-0', side && '@min-[360px]:flex-1')}>
        <h2 data-part="name" className={cx('text-2xl font-bold', TEXT[nameP.align])}>
          {name}
        </h2>
        {!titleP.hidden && (
          <p data-part="title" className={cx('mt-0.5 text-neutral-700', TEXT[titleP.align])}>
            {title}
          </p>
        )}
        {!deptP.hidden && (
          <p data-part="dept" className={cx('mt-0.5 text-sm text-neutral-500', TEXT[deptP.align])}>
            {dept}
          </p>
        )}
        {email && !emailP.hidden && (
          <p data-part="email" className={cx('mt-3 text-sm', TEXT[emailP.align])}>
            <a href={`mailto:${email}`} className="text-(--accent) underline-offset-4 hover:underline">
              {email}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
