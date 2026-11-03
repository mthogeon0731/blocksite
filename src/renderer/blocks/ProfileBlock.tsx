import type { PropsOf } from '@/lib/schema';
import type { BlockProps } from './index';

export function ProfileBlock({ props }: BlockProps<PropsOf<'profile'>>) {
  const { name, title, dept, email, photoUrl } = props;
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="mb-4 aspect-[3/4] w-full rounded-lg object-cover" />
      ) : (
        <div className="mb-4 flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-neutral-100 text-5xl font-bold text-(--accent)">
          {name.trim().slice(0, 1) || '?'}
        </div>
      )}
      <h2 className="text-2xl font-bold">{name}</h2>
      <p className="mt-0.5 text-neutral-700">{title}</p>
      <p className="mt-0.5 text-sm text-neutral-500">{dept}</p>
      {email && (
        <a href={`mailto:${email}`} className="mt-3 inline-block text-sm text-(--accent) underline-offset-4 hover:underline">
          {email}
        </a>
      )}
    </section>
  );
}
