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

데이터는 `.data/db.json`(로컬 JSON 파일)에 저장된다. 첫 실행 때 시드 사이트가 자동으로 들어간다. 초기화하려면 그 파일을 지우면 된다.

## 환경변수 (`.env.local`, 전부 선택)

`.env.example` 참고. `EDITOR_KEY`를 설정하면 편집기와 쓰기 API가 `?key=값`으로 받은 쿠키를 확인한다. 비워 두면 검사하지 않는다.

Supabase 변수는 아직 쓰지 않는다. 키가 생기면 `src/lib/db.ts`의 함수 3개를 supabase-js로 교체하고 `supabase/migrations/0001_init.sql`, `supabase/seed.sql`을 적용한다.

## 1단계(11/3) 확인 순서

1. `/editor/site_kimlab` → 공지사항 블록 클릭 → 툴바 "다른 자리로 ▾" → 왼쪽 자리로.
2. 상단 "자동 저장됨 HH:MM" 확인 → 새로고침 → 블록이 왼쪽에 그대로.
3. "공개 페이지 보기" → 같은 배치로 보인다.
4. 왼쪽 "블록 고르기"에서 안 되는 조합은 카드가 흐려지고 이유가 보인다.
5. 오른쪽 "스타일" 탭에서 색·글꼴·글자 크기 → 미리보기 즉시 반영.

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
src/app/editor/[siteId]  편집기 (3단)
src/app/s/[slug]         공개 페이지
src/app/api/sites/[id]   GET/PUT config
supabase/                마이그레이션·시드 SQL (Supabase 전환용)
legacy/                  교수님 홈페이지 정적 미리보기 (참고용)
```

## 알려진 제한 (1단계)

- 블록 내용 편집 폼, 기능 연결(결제 모달), 공지·사진 API는 2·3단계.
- 로컬 파일 저장소라 Vercel 등 배포 환경에서는 DB(Supabase)가 필요하다.
