# 블록 홈페이지 (시제품)

코딩·디자인을 모르는 사람이 블록을 골라 홈페이지를 만들고, 바뀌는 결과를 실시간으로 보면서 완성하는 웹 툴. AI/LLM 호출 없음. 스펙은 [SPEC.md](SPEC.md).

## 실행

```bash
npm install
npm run dev
```

- 처음: http://localhost:3000
- 편집기(시드 사이트): http://localhost:3000/editor/site_kimlab
- 공개 페이지: http://localhost:3000/s/kim-lab
- 빈 사이트로 시작: http://localhost:3000/editor/demo (첫 변경이 저장될 때 만들어짐)

데이터는 `.data/db.json`(로컬 JSON 파일), 사진 파일은 `.data/uploads/{site_id}/{block_id}/{uuid}.{ext}`에 저장되고 `/uploads/...` 라우트가 서빙한다. 첫 실행 때 시드 사이트가 자동으로 들어간다. 초기화하려면 `.data/` 폴더를 지우면 된다.

## 환경변수 (`.env.local`, 전부 선택)

`.env.example` 참고. `EDITOR_KEY`를 설정하면 편집기와 쓰기 API가 `?key=값`으로 받은 쿠키를 확인한다. 비워 두면 검사하지 않는다.

Supabase 변수는 아직 쓰지 않는다. 키가 생기면 `src/lib/db.ts`의 export를 supabase-js(+ Storage 버킷 `photos`)로 교체하고 `supabase/migrations/0001_init.sql`, `supabase/seed.sql`을 적용한다. 그러면 `src/app/uploads/` 라우트는 필요 없다.

## 확인 순서

1단계(11/3)
1. `/editor/site_kimlab` → 공지사항 블록 클릭 → 툴바 "다른 자리로 ▾" → 왼쪽 자리로.
2. 상단 "자동 저장됨 HH:MM" 확인 → 새로고침 → 블록이 왼쪽에 그대로.
3. "공개 페이지 보기" → 같은 배치로 보인다.
4. 왼쪽 "블록 고르기"에서 안 되는 조합은 카드가 흐려지고 이유가 보인다.
5. 오른쪽 "스타일" 탭에서 색·글꼴·글자 크기 → 미리보기 즉시 반영.

2단계(11/4)
1. 공지사항 블록 클릭 → 오른쪽 "블록" 탭에 제목·개수 폼과 "기능 연결 (유료)" 카드.
2. 기능 연결 → 결제 모달 → "결제하고 연결하기" → 1초 뒤 토스트 "연결됐어요" → 배지 사라짐.
3. 같은 탭의 "공지 올리기" 폼으로 공지 2건 작성 → 미리보기와 목록에 즉시 표시.
4. 블록을 왼쪽 자리로 이동 → 새로고침 → 공지가 그대로 따라온다 (블록 id에 묶여 있음).
5. 공개 페이지에 공지가 최신순으로 보인다.
6. 공지가 있는 블록의 "삭제" → 확인창으로 막힘 (서버도 400).

3단계(11/5)
1. 사진 블록 클릭 → "기능 연결 (유료)" → 결제 모달 → 연결.
2. "사진 올리기" 폼에서 파일(JPG·PNG·GIF·WEBP, 10MB 이하) + 설명 → 미리보기 그리드와 썸네일 목록에 즉시 표시.
3. 썸네일의 "삭제" → 목록·미리보기에서 사라지고 파일도 지워진다.
4. 공개 페이지에서 사진이 최신순 그리드로 보이고, 모바일(375px)에서는 2열로 쌓인다.
5. 편집기·공개 페이지를 열 때 로딩 스켈레톤이 잠깐 보인다.

API 점검(서버 켜고): `node scripts/check-rules.mjs` — 규칙표·스키마 9건 + 연결·공지 11건 + 사진 13건. 점검용 사이트 `site_check`를 만들어 쓰고 비운다.

## 구조

```
src/lib/schema.ts        zod: SiteConfig·블록 종류별 props
src/lib/slots.ts         슬롯 규칙표 + canPlace + validateConfig
src/lib/catalog.ts       블록 6종 정의(이름·설명·기능) + newBlock
src/lib/sample.ts        연결 전 샘플 데이터
src/lib/seed.ts          시드 사이트, 빈 사이트
src/lib/db.ts            저장소(로컬 JSON 파일)
src/renderer/            SiteRenderer (config, data, mode) → UI, blocks/ 6개
src/store/editor.ts      zustand 편집기 스토어
src/app/editor/[siteId]  편집기 (3단): Editor·BlockPicker·SidePanel·BlockPanel(props 폼·공지·사진 관리)·PayModal·loading
src/app/s/[slug]         공개 페이지
src/app/api/sites/[id]   GET/PUT config, connect/ POST 기능 연결
src/app/api/notices      GET/POST, [id]/ DELETE
src/app/api/photos       GET/POST(multipart), [id]/ DELETE
src/app/uploads/[...path] 로컬 업로드 파일 서빙
supabase/                마이그레이션·시드 SQL (Supabase 전환용)
legacy/                  교수님 홈페이지 정적 미리보기 (참고용)
```

## 알려진 제한 (3단계까지)

- 내보내기·배포·도메인 연결은 버튼만 있다(유료 배지, "준비 중"). SPEC 5.1대로 시제품에서는 비활성.
- 사진은 래스터 형식(JPG·PNG·GIF·WEBP)만 받는다. SVG는 스크립트를 담을 수 있어 제외.
- 결제는 가짜다(1초 스피너 → 연결). `// TODO: PG 연동 지점` 주석 위치: `PayModal.tsx`, `api/sites/[id]/connect/route.ts`.
- 연결은 되돌릴 수 없고, 공지가 있는 블록은 삭제할 수 없다(정식 버전에서 데이터 보관 후 재연결).
- 로컬 파일 저장소라 Vercel 등 배포 환경에서는 DB(Supabase)가 필요하다.
