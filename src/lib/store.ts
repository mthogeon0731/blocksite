import type { BlockData, Notice, NoticeInput, Photo, SiteConfig } from './schema';

// 저장소 인터페이스. db.local.ts(JSON 파일)와 db.supabase.ts(Postgres + Storage)가 같은 모양을 구현한다.
export type Fail = { error: string; status: number };

export interface PhotoInput {
  siteId: string;
  blockId: string;
  caption: string;
  ext: string; // jpg | png | gif | webp
  bytes: Buffer;
}

export interface Store {
  getSite(id: string): Promise<SiteConfig | null>;
  getSiteBySlug(slug: string): Promise<SiteConfig | null>;
  // 기능 연결 상태 유지(R7) + 데이터 있는 블록 삭제 거부(7절 7번)까지 책임진다
  putSite(config: SiteConfig): Promise<{ updatedAt: string } | Fail>;
  connectBlock(siteId: string, blockId: string): Promise<{ ok: true } | Fail>;
  listNotices(siteId: string, blockId: string): Promise<Notice[]>;
  addNotice(input: NoticeInput): Promise<Notice | Fail>; // 블록 존재 + 연결됨 검사 포함
  deleteNotice(id: string): Promise<boolean>;
  listPhotos(siteId: string, blockId: string): Promise<Photo[]>;
  addPhoto(input: PhotoInput): Promise<Photo | Fail>; // 블록 존재 + 연결됨 검사 포함
  deletePhoto(id: string): Promise<boolean>; // 행 + 파일
  loadBlockData(config: SiteConfig): Promise<BlockData>;
}

export const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
