import type { Block, BlockType, FeatureKey, LookOf } from './schema';

export interface PartDef {
  key: string;
  label: string; // 패널에 보일 한국어 이름
  required?: boolean; // 필수 부품은 숨길 수 없다 (GRID_SPEC 7.2)
}

export interface BlockDef<T extends BlockType = BlockType> {
  type: T;
  label: string; // 카탈로그에 보일 이름
  description: string; // 한 줄 설명
  icon: string;
  feature?: { key: FeatureKey; label: string; description: string };
  size: { w: number; h: number }; // 기본 크기(칸). h는 기본 내용을 그려서 잰 값 (7.3)
  min: { w: number; h: number }; // 최소 크기(칸)
  parts: PartDef[];
  look: LookOf<T>; // 기본 모양. 아무것도 안 바꾸면 개편 전 화면과 같게 (4절)
}

// 공통 기본 look: 흰 카드, 둥근 모서리, 안쪽 여백 20px(개편 전 p-5)
const card = { frame: 'card', corner: 'round', pad: 2, valign: 'top', bleed: 'none', parts: {} } as const;

export const CATALOG: { [T in BlockType]: BlockDef<T> } = {
  nav: {
    type: 'nav',
    label: '탭 메뉴',
    icon: '🧭',
    description: '페이지 맨 위 메뉴. 소개·연구·논문처럼 항목을 적어요',
    size: { w: 48, h: 3 },
    min: { w: 12, h: 2 },
    parts: [
      { key: 'title', label: '사이트 제목' },
      { key: 'items', label: '메뉴', required: true },
    ],
    look: { ...card, frame: 'fill', corner: 'square', bleed: 'both', navLayout: 'spread' },
  },
  profile: {
    type: 'profile',
    label: '프로필',
    icon: '👤',
    description: '이름, 직함, 학과, 이메일, 사진',
    size: { w: 14, h: 23 },
    min: { w: 8, h: 8 },
    parts: [
      { key: 'photo', label: '사진' },
      { key: 'name', label: '이름', required: true },
      { key: 'title', label: '직함' },
      { key: 'dept', label: '소속' },
      { key: 'email', label: '이메일' },
    ],
    look: { ...card, photoShape: 'portrait', photoPos: 'top', photoSize: 'l' },
  },
  text: {
    type: 'text',
    label: '글',
    icon: '📝',
    description: '제목과 본문. 연구 소개, 연락처 등 자유롭게',
    size: { w: 14, h: 5 },
    min: { w: 6, h: 3 },
    parts: [
      { key: 'heading', label: '제목' },
      { key: 'body', label: '본문', required: true },
    ],
    look: card,
  },
  publications: {
    type: 'publications',
    label: '논문 목록',
    icon: '📚',
    description: '제목·저널·연도·링크 목록',
    size: { w: 28, h: 6 },
    min: { w: 12, h: 4 },
    parts: [
      { key: 'heading', label: '제목' },
      { key: 'list', label: '목록', required: true },
    ],
    look: { ...card, yearPos: 'left' },
  },
  notices: {
    type: 'notices',
    label: '공지사항',
    icon: '📢',
    description: '공지 목록. 연결하면 직접 공지를 올릴 수 있어요',
    feature: { key: 'notice-post', label: '공지 올리기', description: '제목과 내용을 써서 공지를 올리고 지울 수 있어요' },
    size: { w: 28, h: 13 },
    min: { w: 10, h: 4 },
    parts: [
      { key: 'heading', label: '제목' },
      { key: 'list', label: '목록', required: true },
    ],
    look: { ...card, showDate: true },
  },
  photos: {
    type: 'photos',
    label: '사진',
    icon: '🖼️',
    description: '사진 모음. 연결하면 직접 올릴 수 있어요',
    feature: { key: 'photo-upload', label: '사진 올리기', description: '사진 파일을 올리고 설명을 붙일 수 있어요' },
    size: { w: 28, h: 11 },
    min: { w: 8, h: 6 },
    parts: [
      { key: 'heading', label: '제목' },
      { key: 'grid', label: '사진들', required: true },
    ],
    look: { ...card, ratio: '4:3' },
  },
};

export const CATALOG_LIST: BlockDef[] = Object.values(CATALOG);

// 기본 look에 블록의 look을 덮어쓴다. parts는 부품별로 합친다 (GRID_SPEC 4절)
export function lookOf(block: Block): LookOf<BlockType> {
  const base = CATALOG[block.type].look;
  return { ...base, ...block.look, parts: { ...base.parts, ...block.look?.parts } } as LookOf<BlockType>;
}

// 새 블록의 기본값. id는 호출한 쪽에서 nanoid로 발급한다 (R2).
export function newBlock(type: BlockType): Block {
  switch (type) {
    case 'nav':
      return { type, props: { items: ['소개', '연구', '논문', '연락처'] } };
    case 'profile':
      return { type, props: { name: '이름', title: '교수', dept: 'OO대학교 OO학과', email: '', photoUrl: '' } };
    case 'text':
      return { type, props: { heading: '제목', body: '여기에 내용을 적어요.' } };
    case 'publications':
      return { type, props: { items: [{ title: '논문 제목 예시', venue: '저널명 예시', year: 2026, url: '' }] } };
    case 'notices':
      return { type, props: { heading: '공지사항', limit: 5 }, feature: { key: 'notice-post', connected: false } };
    case 'photos':
      return { type, props: { heading: '사진', columns: 3 }, feature: { key: 'photo-upload', connected: false } };
  }
}
