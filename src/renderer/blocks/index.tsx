import type { ReactNode } from 'react';
import type { Block, Notice, Photo, Theme } from '@/lib/schema';
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
export interface BlockProps<P, D = undefined> extends BlockCtx {
  props: P;
  data?: D;
  connected: boolean;
}

// blockId → 백엔드 데이터 (연결된 블록만 채워진다)
export interface BlockData {
  notices?: Record<string, Notice[]>;
  photos?: Record<string, Photo[]>;
}

export function renderBlock(id: string, block: Block, data: BlockData, ctx: BlockCtx): ReactNode {
  const connected = 'feature' in block ? block.feature.connected : false;
  const base = { ...ctx, connected };
  switch (block.type) {
    case 'nav':
      return <NavBlock {...base} props={block.props} />;
    case 'profile':
      return <ProfileBlock {...base} props={block.props} />;
    case 'text':
      return <TextBlock {...base} props={block.props} />;
    case 'publications':
      return <PublicationsBlock {...base} props={block.props} />;
    case 'notices':
      return <NoticesBlock {...base} props={block.props} data={data.notices?.[id]} />;
    case 'photos':
      return <PhotosBlock {...base} props={block.props} data={data.photos?.[id]} />;
  }
}
