import type { PropsOf } from '@/lib/schema';
import type { BlockProps } from './index';

export function TextBlock({ props }: BlockProps<PropsOf<'text'>>) {
  return (
    <section>
      <h2 data-part="heading" className="text-lg font-bold">
        {props.heading}
      </h2>
      <p data-part="body" className="mt-2 whitespace-pre-line leading-relaxed text-neutral-700">
        {props.body}
      </p>
    </section>
  );
}
