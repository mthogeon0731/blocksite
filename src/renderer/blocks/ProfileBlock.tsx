import type { PropsOf } from '@/lib/schema';
import type { BlockProps } from './index';

export function ProfileBlock({ props }: BlockProps<PropsOf<'profile'>>) {
  const { name, title, dept, email, photoUrl } = props;
  return (
    <section>
      <div data-part="photo" className="mb-4 w-full">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="aspect-[3/4] w-full rounded-lg object-cover" />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-neutral-100 text-5xl font-bold text-(--accent)">
            {name.trim().slice(0, 1) || '?'}
          </div>
        )}
      </div>
      <h2 data-part="name" className="text-2xl font-bold">
        {name}
      </h2>
      <p data-part="title" className="mt-0.5 text-neutral-700">
        {title}
      </p>
      <p data-part="dept" className="mt-0.5 text-sm text-neutral-500">
        {dept}
      </p>
      {email && (
        <a data-part="email" href={`mailto:${email}`} className="mt-3 inline-block text-sm text-(--accent) underline-offset-4 hover:underline">
          {email}
        </a>
      )}
    </section>
  );
}
