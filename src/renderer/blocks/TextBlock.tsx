import type { BlockProps } from './index';
import { TEXT, cx, partOf } from './parts';

export function TextBlock({ props, look }: BlockProps<'text'>) {
  const heading = partOf(look, 'heading');
  const body = partOf(look, 'body');
  return (
    <section>
      {!heading.hidden && (
        <h2 data-part="heading" className={cx('mb-2 text-lg font-bold', TEXT[heading.align])}>
          {props.heading}
        </h2>
      )}
      <p data-part="body" className={cx('whitespace-pre-line leading-relaxed text-neutral-700', TEXT[body.align])}>
        {props.body}
      </p>
    </section>
  );
}
