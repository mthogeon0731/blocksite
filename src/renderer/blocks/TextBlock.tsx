import type { PropsOf } from '@/lib/schema';
import type { BlockProps } from './index';

export function TextBlock({ props }: BlockProps<PropsOf<'text'>>) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-bold">{props.heading}</h2>
      <p className="mt-2 whitespace-pre-line leading-relaxed text-neutral-700">{props.body}</p>
    </section>
  );
}
