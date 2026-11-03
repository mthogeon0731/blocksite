import type { CSSProperties, ReactNode } from 'react';
import type { SiteConfig, Slot, Theme } from '@/lib/schema';
import { SLOT_RULES } from '@/lib/slots';
import { CATALOG } from '@/lib/catalog';
import { renderBlock, type BlockData, type Mode } from './blocks';

export type { BlockData, Mode };

// 편집기 전용 장식·콜백. 렌더러는 상태를 갖지 않고(R6) 여기서 받은 것만 쓴다.
export interface EditChrome {
  selectedBlockId: string | null;
  selectedSlot: Slot | null;
  onSelectBlock: (id: string, slot: Slot) => void;
  onSelectSlot: (slot: Slot) => void;
  toolbar: (id: string, slot: Slot) => ReactNode;
}

const FONT_STACK: Record<Theme['font'], string> = {
  pretendard: '"Pretendard Variable", Pretendard, system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  'noto-serif': '"Noto Serif KR", "Apple SD Gothic Neo", serif',
  system: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
};
const SCALE: Record<Theme['scale'], number> = { sm: 0.9, md: 1, lg: 1.15 };

// theme → CSS 변수 (R5: 사이트 단위). --s는 globals.css의 .site 규칙이 글자 크기에 반영한다.
export function themeStyle(theme: Theme): CSSProperties {
  return { '--accent': theme.accent, '--s': SCALE[theme.scale], fontFamily: FONT_STACK[theme.font] } as CSSProperties;
}

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

interface RenderProps {
  config: SiteConfig;
  data: BlockData;
  mode: Mode;
  edit?: EditChrome;
}

// (config, data, mode) → UI. 편집기와 공개 페이지가 같이 쓴다 (R1).
export function SiteRenderer({ config, data, mode, edit }: RenderProps) {
  const common = { config, data, mode, edit: mode === 'edit' ? edit : undefined };
  return (
    <div className="site min-h-full bg-neutral-50 text-neutral-900" style={themeStyle(config.theme)}>
      <SlotArea slot="header" {...common} />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-3">
        <SlotArea slot="main-left" {...common} className="md:col-span-1" />
        <SlotArea slot="main-right" {...common} className="md:col-span-2" />
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-8">
        <SlotArea slot="footer" {...common} />
      </div>
    </div>
  );
}

function SlotArea({ slot, config, data, mode, edit, className }: RenderProps & { slot: Slot; className?: string }) {
  const ids = config.slots[slot];
  const frames = ids.map((id) => <BlockFrame key={id} id={id} slot={slot} config={config} data={data} mode={mode} edit={edit} />);
  if (!edit) return <div className={cx(className, 'flex flex-col gap-6')}>{frames}</div>;

  const selected = edit.selectedSlot === slot && !edit.selectedBlockId;
  return (
    <div
      className={cx(
        className,
        'relative flex flex-col gap-4 rounded-lg p-2 pt-4 outline-1 outline-dashed',
        selected ? 'bg-white/60 outline-(--accent)' : 'outline-neutral-300',
      )}
      onClick={() => edit.onSelectSlot(slot)}
    >
      <span className="absolute -top-2 left-3 rounded bg-white px-1 text-[10px] text-neutral-400">{SLOT_RULES[slot].label}</span>
      {frames}
      {ids.length === 0 && (
        <button
          type="button"
          className="rounded-md border border-dashed border-neutral-300 py-6 text-sm text-neutral-400 hover:border-(--accent) hover:text-(--accent)"
        >
          + 블록 고르기
        </button>
      )}
    </div>
  );
}

function BlockFrame({ id, slot, config, data, mode, edit }: RenderProps & { id: string; slot: Slot }) {
  const block = config.blocks[id];
  if (!block) return null;
  // 탭 메뉴 앵커용 id: 제목이 있으면 제목, 프로필은 "소개", 논문은 "논문"
  const anchor =
    'heading' in block.props ? block.props.heading : block.type === 'profile' ? '소개' : block.type === 'publications' ? '논문' : undefined;
  const content = renderBlock(id, block, data, { theme: config.theme, mode, site: { title: config.title } });
  if (!edit) return <div id={anchor}>{content}</div>;

  const selected = edit.selectedBlockId === id;
  const feature = 'feature' in block ? block.feature : undefined;
  return (
    <div
      id={anchor}
      className={cx('relative rounded-xl', selected ? 'outline-2 outline-(--accent)' : 'hover:outline-1 hover:outline-neutral-300')}
      onClick={(e) => {
        e.stopPropagation();
        edit.onSelectBlock(id, slot);
      }}
    >
      {selected && (
        <div className="absolute -top-9 left-0 z-10" onClick={(e) => e.stopPropagation()}>
          {edit.toolbar(id, slot)}
        </div>
      )}
      {content}
      {feature && !feature.connected && (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          <span>{CATALOG[block.type].feature?.label} 기능이 아직 연결되지 않았어요</span>
          <span className="rounded bg-amber-200 px-1.5 py-0.5 font-medium">기능 연결 (유료)</span>
        </div>
      )}
    </div>
  );
}
