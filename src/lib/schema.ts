import { z } from 'zod';
import { COLS, MAX_ROWS } from './grid';
import { migrateV1, type V1Config } from './migrate';

export const BLOCK_TYPES = ['nav', 'profile', 'text', 'publications', 'notices', 'photos'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const FEATURE_KEYS = ['notice-post', 'photo-upload'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const ThemeSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, '포인트 색은 #RRGGBB 형식이어야 해요'),
  font: z.enum(['pretendard', 'noto-serif', 'system']),
  scale: z.enum(['sm', 'md', 'lg']),
  background: z.enum(['plain', 'grid']).default('plain'), // 공개 페이지 배경 (GRID_SPEC 5.4). 생략하면 plain
});
export type Theme = z.infer<typeof ThemeSchema>;

// GRID_SPEC 7절 블록 모양. 정해진 선택지만 고른다 — 숫자·색·CSS 자유 입력 없음 (R5′)
const Align = z.enum(['left', 'center', 'right']);
const Part = z.object({ align: Align, hidden: z.boolean() }).partial();
const RequiredPart = z.object({ align: Align }).partial(); // 필수 부품은 숨길 수 없다
const common = {
  frame: z.enum(['card', 'plain', 'fill']),
  corner: z.enum(['round', 'square']),
  pad: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  valign: z.enum(['top', 'middle', 'bottom']),
  bleed: z.enum(['none', 'left', 'right', 'both']),
};
export const LookSchemas = {
  nav: z.object({
    ...common,
    navLayout: z.enum(['spread', 'stack', 'center']),
    parts: z.object({ title: Part, items: RequiredPart }).partial(),
  }),
  profile: z.object({
    ...common,
    photoShape: z.enum(['portrait', 'square', 'circle']),
    photoPos: z.enum(['top', 'left', 'right']),
    photoSize: z.enum(['s', 'm', 'l']),
    parts: z.object({ photo: Part, name: RequiredPart, title: Part, dept: Part, email: Part }).partial(),
  }),
  text: z.object({ ...common, parts: z.object({ heading: Part, body: RequiredPart }).partial() }),
  publications: z.object({
    ...common,
    yearPos: z.enum(['left', 'hidden']),
    parts: z.object({ heading: Part, list: RequiredPart }).partial(),
  }),
  notices: z.object({ ...common, showDate: z.boolean(), parts: z.object({ heading: Part, list: RequiredPart }).partial() }),
  photos: z.object({
    ...common,
    ratio: z.enum(['4:3', '1:1', '3:4']),
    parts: z.object({ heading: Part, grid: RequiredPart }).partial(),
  }),
};
export type LookOf<T extends BlockType> = z.infer<(typeof LookSchemas)[T]>;

// 블록 종류별 props. 서버 저장 시 여기서 거부되므로 블록 컴포넌트는 props를 믿고 그린다.
// look은 생략 가능, 렌더러가 기본값(catalog)에 덮어써서 쓴다.
const Short = z.string().max(80);
export const BlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('nav'),
    props: z.object({ items: z.array(z.string().max(20)).max(8) }),
    look: LookSchemas.nav.partial().optional(),
  }),
  z.object({
    type: z.literal('profile'),
    props: z.object({ name: Short, title: Short, dept: Short, email: Short, photoUrl: z.string().max(500) }),
    look: LookSchemas.profile.partial().optional(),
  }),
  z.object({
    type: z.literal('text'),
    props: z.object({ heading: Short, body: z.string().max(5000) }),
    look: LookSchemas.text.partial().optional(),
  }),
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
    look: LookSchemas.publications.partial().optional(),
  }),
  z.object({
    type: z.literal('notices'),
    props: z.object({ heading: Short, limit: z.number().int().min(1).max(20) }),
    feature: z.object({ key: z.literal('notice-post'), connected: z.boolean() }),
    look: LookSchemas.notices.partial().optional(),
  }),
  z.object({
    type: z.literal('photos'),
    props: z.object({ heading: Short, columns: z.union([z.literal(2), z.literal(3)]) }),
    feature: z.object({ key: z.literal('photo-upload'), connected: z.boolean() }),
    look: LookSchemas.photos.partial().optional(),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type PropsOf<T extends BlockType> = BlockOf<T>['props'];

// 칸 단위 직사각형 (R4′): 정수, 0 ≤ x, x + w ≤ 48, 0 ≤ y, y + h ≤ 600
const Cell = z.number().int('칸 위치·크기는 정수여야 해요');
export const LayoutRectSchema = z
  .object({
    x: Cell.min(0, '칸 위치는 0 이상이어야 해요'),
    y: Cell.min(0, '칸 위치는 0 이상이어야 해요'),
    w: Cell.min(1, '블록 크기는 1칸 이상이어야 해요'),
    h: Cell.min(1, '블록 크기는 1칸 이상이어야 해요'),
  })
  .refine((r) => r.x + r.w <= COLS, `블록이 판(가로 ${COLS}칸) 밖으로 나가요`)
  .refine((r) => r.y + r.h <= MAX_ROWS, `판은 세로 ${MAX_ROWS}칸까지예요`);
export type LayoutRect = z.infer<typeof LayoutRectSchema>;

const BlockId = z.string().regex(/^[\w-]{1,32}$/);

export const SiteConfigSchema = z.object({
  version: z.literal(2),
  siteId: z.string().min(1).max(64),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/, '주소(slug)는 영문 소문자·숫자·하이픈만 쓸 수 있어요'),
  title: z.string().min(1, '사이트 제목을 입력해 주세요').max(60, '사이트 제목은 60자까지예요'),
  theme: ThemeSchema,
  // R2′: 위치는 layout에만 있다. 블록 레코드에는 좌표·순서를 넣지 않는다
  layout: z.record(BlockId, LayoutRectSchema),
  // R2: 블록 id는 생성 시 발급(nanoid 8자)하고 바꾸지 않는다
  blocks: z.record(BlockId, BlockSchema),
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type SiteConfigInput = z.input<typeof SiteConfigSchema>;

// 저장소에서 읽은 config → 항상 v2. v1(자리 4개)이면 변환한 뒤 검증한다 (GRID_SPEC 4절)
export function parseSiteConfig(raw: unknown): SiteConfig {
  const v1 = (raw as { version?: unknown } | null)?.version === 1;
  return SiteConfigSchema.parse(v1 ? migrateV1(raw as V1Config) : raw);
}

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

// blockId → 백엔드 데이터 (연결된 블록만 채워진다). 렌더러는 이것을 바깥에서 받는다 (R6).
export interface BlockData {
  notices?: Record<string, Notice[]>;
  photos?: Record<string, Photo[]>;
}

export const NoticeInputSchema = z.object({
  siteId: z.string().min(1),
  blockId: z.string().min(1),
  title: z.string().trim().min(1, '제목을 입력해 주세요').max(120, '제목은 120자까지예요'),
  body: z.string().max(5000, '본문은 5000자까지예요').default(''),
});
export type NoticeInput = z.infer<typeof NoticeInputSchema>;
