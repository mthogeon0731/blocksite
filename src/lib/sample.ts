import type { Notice, Photo } from './schema';

// 기능 연결 전 블록에 보여 주는 샘플 (R7). DB에 넣지 않는다.
export const SAMPLE_NOTICES: Notice[] = [
  {
    id: 'sample-1',
    title: '공지 제목 예시 1',
    body: '공지 내용 예시입니다. 기능을 연결하면 직접 올린 공지가 여기에 보여요.',
    created_at: '2026-10-28T09:00:00Z',
  },
  {
    id: 'sample-2',
    title: '공지 제목 예시 2',
    body: '세미나 일정, 모집 안내처럼 알리고 싶은 내용을 올릴 수 있어요.',
    created_at: '2026-10-21T09:00:00Z',
  },
  {
    id: 'sample-3',
    title: '공지 제목 예시 3',
    body: '최신 공지가 위에 보이고, 표시 개수는 블록 설정에서 바꿀 수 있어요.',
    created_at: '2026-10-14T09:00:00Z',
  },
];

export const SAMPLE_PHOTOS: Photo[] = [1, 2, 3].map((n) => ({
  id: `sample-${n}`,
  url: `/sample/photo-${n}.svg`,
  caption: `사진 설명 예시 ${n}`,
}));
