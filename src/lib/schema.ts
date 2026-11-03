import { z } from 'zod';

export const BLOCK_TYPES = ['nav', 'profile', 'text', 'publications', 'notices', 'photos'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const SLOTS = ['header', 'main-left', 'main-right', 'footer'] as const;
export type Slot = (typeof SLOTS)[number];

export const FEATURE_KEYS = ['notice-post', 'photo-upload'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const ThemeSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, '포인트 색은 #RRGGBB 형식이어야 해요'),
  font: z.enum(['pretendard', 'noto-serif', 'system']),
  scale: z.enum(['sm', 'md', 'lg']),
});
export type Theme = z.infer<typeof ThemeSchema>;

// 블록 종류별 props. 서버 저장 시 여기서 거부되므로 블록 컴포넌트는 props를 믿고 그린다.
const Short = z.string().max(80);
export const BlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('nav'), props: z.object({ items: z.array(z.string().max(20)).max(8) }) }),
  z.object({
    type: z.literal('profile'),
    props: z.object({ name: Short, title: Short, dept: Short, email: Short, photoUrl: z.string().max(500) }),
  }),
  z.object({ type: z.literal('text'), props: z.object({ heading: Short, body: z.string().max(5000) }) }),
  z.object({
    type: z.literal('publications'),
    props: z.object({
      items: z
        .array(
          z.object({
            title: z.string().max(300),
            venue: z.string().max(120),
            year: z.number().int().min(1900).max(2100),
            url: z.string().max(500),
          }),
        )
        .max(100),
    }),
  }),
  z.object({
    type: z.literal('notices'),
    props: z.object({ heading: Short, limit: z.number().int().min(1).max(20) }),
    feature: z.object({ key: z.literal('notice-post'), connected: z.boolean() }),
  }),
  z.object({
    type: z.literal('photos'),
    props: z.object({ heading: Short, columns: z.union([z.literal(2), z.literal(3)]) }),
    feature: z.object({ key: z.literal('photo-upload'), connected: z.boolean() }),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type PropsOf<T extends BlockType> = BlockOf<T>['props'];

const IdList = z.array(z.string().min(1));

export const SiteConfigSchema = z.object({
  version: z.literal(1),
  siteId: z.string().min(1).max(64),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/, '주소(slug)는 영문 소문자·숫자·하이픈만 쓸 수 있어요'),
  title: z.string().min(1, '사이트 제목을 입력해 주세요').max(60, '사이트 제목은 60자까지예요'),
  theme: ThemeSchema,
  slots: z.object({ header: IdList, 'main-left': IdList, 'main-right': IdList, footer: IdList }),
  // R2: 블록 id는 생성 시 발급(nanoid 8자). 슬롯·순서·타입에서 파생하지 않는다.
  blocks: z.record(z.string().regex(/^[\w-]{1,32}$/), BlockSchema),
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

// 백엔드 데이터 (R3: site_id + block_id로만 묶인다. 위치 정보 없음)
export interface Notice {
  id: string;
  title: string;
  body: string;
  created_at: string;
}
export interface Photo {
  id: string;
  url: string;
  caption: string;
}
