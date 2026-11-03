import type { ReactNode } from 'react';
import type { Block, BlockData, BlockType, LookOf, PropsOf, Theme } from '@/lib/schema';
import { lookOf } from '@/lib/catalog';
import { NavBlock } from './NavBlock';
import { ProfileBlock } from './ProfileBlock';
import { TextBlock } from './TextBlock';
import { PublicationsBlock } from './PublicationsBlock';
import { NoticesBlock } from './NoticesBlock';
import { PhotosBlock } from './PhotosBlock';

export type Mode = 'edit' | 'public';

// 모든 블록 컴포넌트가 받는 공통 props. data는 바깥에서 넣어 준다 (R6: 렌더러 안에서 fetch 금지).
export interface BlockCtx {
  theme: Theme;
  mode: Mode;
  site: { title: string };
}
// look은 기본값에 블록의 look을 덮어쓴 것. 편집·공개 모드 모두 같은 마크업을 그린다 (R6)
export interface BlockProps<T extends BlockType, D = undefined> extends BlockCtx {
  props: PropsOf<T>;
  look: LookOf<T>;
  data?: D;
  connected: boolean;
}

export type { BlockData };

export function renderBlock(id: string, block: Block, data: BlockData, ctx: BlockCtx): ReactNode {
  const connected = 'feature' in block ? block.feature.connected : false;
  const base = { ...ctx, connected };
  switch (block.type) {
    case 'nav':
      return <NavBlock {...base} props={block.props} look={lookOf(block) as LookOf<'nav'>} />;
    case 'profile':
      return <ProfileBlock {...base} props={block.props} look={lookOf(block) as LookOf<'profile'>} />;
    case 'text':
      return <TextBlock {...base} props={block.props} look={lookOf(block) as LookOf<'text'>} />;
    case 'publications':
      return <PublicationsBlock {...base} props={block.props} look={lookOf(block) as LookOf<'publications'>} />;
    case 'notices':
      return <NoticesBlock {...base} props={block.props} look={lookOf(block) as LookOf<'notices'>} data={data.notices?.[id]} />;
    case 'photos':
      return <PhotosBlock {...base} props={block.props} look={lookOf(block) as LookOf<'photos'>} data={data.photos?.[id]} />;
  }
}
