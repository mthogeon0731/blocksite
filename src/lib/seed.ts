import type { SiteConfig } from './schema';

// 11절 시드. 가상 데이터만 쓴다. supabase/seed.sql과 같은 내용을 유지할 것.
export const SEED_SITE: SiteConfig = {
  version: 1,
  siteId: 'site_kimlab',
  slug: 'kim-lab',
  title: '김OO 연구실',
  theme: { accent: '#1E3A8A', font: 'pretendard', scale: 'md' },
  slots: {
    header: ['a1b2c3d4'],
    'main-left': ['e5f6g7h8', 'i9j0k1l2'],
    'main-right': ['u1v2w3x4', 'm3n4o5p6', 'q7r8s9t0'],
    footer: ['y5z6a7b8'],
  },
  blocks: {
    a1b2c3d4: { type: 'nav', props: { items: ['소개', '연구', '논문', '연락처'] } },
    e5f6g7h8: {
      type: 'profile',
      props: { name: '김OO', title: '교수', dept: 'OO대학교 OO학과 OO 연구실', email: 'kim@example.ac.kr', photoUrl: '' },
    },
    i9j0k1l2: {
      type: 'text',
      props: {
        heading: '연구 소개',
        body:
          '우리 연구실은 OO 현상을 이해하고 이를 응용하는 연구를 합니다.\n실험과 계산을 함께 써서 새로운 소재와 공정을 설계합니다.\n학부 연구생과 대학원생을 항상 환영합니다.',
      },
    },
    u1v2w3x4: {
      type: 'publications',
      props: {
        items: [
          { title: '논문 제목 예시 1', venue: '저널명 예시 A', year: 2026, url: '' },
          { title: '논문 제목 예시 2', venue: '저널명 예시 B', year: 2025, url: '' },
          { title: '논문 제목 예시 3', venue: '저널명 예시 C', year: 2024, url: '' },
        ],
      },
    },
    m3n4o5p6: {
      type: 'notices',
      props: { heading: '공지사항', limit: 5 },
      feature: { key: 'notice-post', connected: false },
    },
    q7r8s9t0: {
      type: 'photos',
      props: { heading: '사진', columns: 3 },
      feature: { key: 'photo-upload', connected: false },
    },
    y5z6a7b8: { type: 'text', props: { heading: '연락처', body: 'OO대학교 OO관 000호\nkim@example.ac.kr' } },
  },
};

// 존재하지 않는 siteId로 편집기를 열면 이 빈 사이트로 시작한다 (데모 1번: 빈 사이트).
export function emptyConfig(siteId: string): SiteConfig {
  return {
    version: 1,
    siteId,
    slug: siteId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    title: '새 홈페이지',
    theme: { accent: '#1E3A8A', font: 'pretendard', scale: 'md' },
    slots: { header: [], 'main-left': [], 'main-right': [], footer: [] },
    blocks: {},
  };
}
