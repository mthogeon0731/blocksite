import type { Block, BlockType, FeatureKey } from './schema';

export interface BlockDef {
  type: BlockType;
  label: string; // 카탈로그에 보일 이름
  description: string; // 한 줄 설명
  icon: string;
  feature?: { key: FeatureKey; label: string; description: string };
}

export const CATALOG: Record<BlockType, BlockDef> = {
  nav: { type: 'nav', label: '탭 메뉴', icon: '🧭', description: '페이지 맨 위 메뉴. 소개·연구·논문처럼 항목을 적어요' },
  profile: { type: 'profile', label: '프로필', icon: '👤', description: '이름, 직함, 학과, 이메일, 사진' },
  text: { type: 'text', label: '글', icon: '📝', description: '제목과 본문. 연구 소개, 연락처 등 자유롭게' },
  publications: { type: 'publications', label: '논문 목록', icon: '📚', description: '제목·저널·연도·링크 목록' },
  notices: {
    type: 'notices',
    label: '공지사항',
    icon: '📢',
    description: '공지 목록. 연결하면 직접 공지를 올릴 수 있어요',
    feature: { key: 'notice-post', label: '공지 올리기', description: '제목과 내용을 써서 공지를 올리고 지울 수 있어요' },
  },
  photos: {
    type: 'photos',
    label: '사진',
    icon: '🖼️',
    description: '사진 모음. 연결하면 직접 올릴 수 있어요',
    feature: { key: 'photo-upload', label: '사진 올리기', description: '사진 파일을 올리고 설명을 붙일 수 있어요' },
  },
};

export const CATALOG_LIST: BlockDef[] = Object.values(CATALOG);

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
