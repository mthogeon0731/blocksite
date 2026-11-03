# 블록 홈페이지 (시제품)

코딩·디자인을 모르는 사람이 블록을 골라 홈페이지를 만들고, 바뀌는 결과를 실시간으로 보면서 완성하는 웹 툴. AI/LLM 호출 없음, 정해진 규칙으로만 동작. 블록 구성은 무료, 기능 연결(공지 올리기·사진 올리기)부터 유료(시제품은 가짜 결제). 스펙은 [SPEC.md](SPEC.md).

## 설치·실행

```bash
npm install
npm run dev
```

| 주소 | 내용 |
| --- | --- |
| http://localhost:3000 | 시작 페이지 (아래 세 링크) |
| http://localhost:3000/editor/site_kimlab | 편집기 — 시드 사이트 "김OO 연구실" |
| http://localhost:3000/s/kim-lab | 시드 사이트의 공개 페이지 |
| http://localhost:3000/editor/demo | 빈 사이트로 시작 (데모 1번용, 첫 변경 때 만들어짐) |

데이터는 기본으로 로컬 파일에 저장된다: `.data/db.json`(사이트·공지·사진 행), `.data/uploads/`(사진 파일, `/uploads/...` 라우트가 서빙). 첫 실행 때 시드 사이트가 자동으로 들어간다. **처음 상태로 되돌리려면 `.data/` 폴더를 지운다.**

## 환경변수 (`.env.local`, 전부 선택)

`.env.example` 참고.

- `EDITOR_KEY`: 설정하면 편집기와 쓰기 API가 쿠키를 확인한다. 편집기를 `/editor/site_kimlab?key=값`으로 한 번 열면 쿠키가 저장된다. 로컬에서는 비워 둬도 된다. **배포할 때는 꼭 설정한다.**
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: 둘 다 있으면 Supabase를 쓴다(아래 "배포"). 없으면 로컬 파일 저장소.

## 데모 순서 (심사 시연, 3분 — SPEC 10절)

`.data/`를 지우고 서버를 켠 뒤 http://localhost:3000/editor/demo 에서 시작한다.

1. **빈 사이트** → 왼쪽 "블록 고르기"에서 **탭 메뉴**, **프로필** 클릭 → 상단·왼쪽 자리에 들어감 → 오른쪽 "블록" 탭에서 이름·소속 입력 → 미리보기가 글자 단위로 바뀐다.
2. 오른쪽 "스타일" 탭 → 포인트 색 칩, 글꼴(명조), 글자 크기 → 사이트 전체가 즉시 바뀐다.
3. **공지사항** 클릭 → 오른쪽 자리에 샘플 공지 3건, 블록 아래 "기능 연결 (유료)" 배지 → "블록" 탭의 **기능 연결 (유료)** → 결제 모달 → **결제하고 연결하기** → 1초 뒤 "연결됐어요" → "공지 올리기" 폼으로 공지 1건 작성 → 미리보기에 바로 뜬다.
4. 공지사항 블록 위 툴바 **다른 자리로 ▾ → 왼쪽 자리로** → 공지가 그대로 따라온다. 여기서 말할 것: *위치는 화면만 알고, 공지는 블록 id에 묶여 있다. 블록 id는 오른쪽 패널에 보이고 옮겨도 바뀌지 않는다.*
5. **사진** 클릭 → 연결 → "사진 올리기"에서 파일 1장 + 설명 → 그리드에 표시.
6. 상단 **공개 페이지 보기 ↗** → 새 탭에 같은 모습 → 창 폭을 줄이면 한 열로 쌓이고 사진은 2열이 된다.

막히는 상황: 안 되는 조합은 카드가 흐려지고 이유가 적혀 있다("이미 하나 있어요", "이 자리에는 넣을 수 없어요"). 자리를 먼저 고르고 싶으면 미리보기의 점선 영역이나 "+ 블록 고르기"를 클릭한 뒤 카드를 누른다. 공지·사진이 있는 블록의 삭제는 확인창으로 막힌다.

## 리허설 체크리스트 (SPEC 13절)

- [x] 10절 시나리오 6단계 전부 통과 (2026-11-03 브라우저 리허설)
- [x] 새로고침·재접속 후 상태 유지 (1초 debounce 자동 저장, 상단에 "자동 저장됨 HH:MM")
- [x] 블록 이동 후 공지·사진 유지
- [x] 규칙표 위반 조합이 UI에서 선택 불가, 서버에서도 400
- [x] 연결 전 블록에 쓰기 API가 403
- [x] 공개 페이지가 모바일 폭(375px)에서 깨지지 않음
- [x] `src/`에 AI API 호출 0건 (`grep -rniE "openai|anthropic|gemini|claude|gpt|llm" src/` → 없음)
- [x] README에 실행 방법과 데모 순서

서버 검증 점검(서버 켜고): `node scripts/check-rules.mjs` — 규칙표·스키마 9건, 연결·공지 11건, 사진 13건 = 33건. 점검용 사이트 `site_check`만 쓰고 시드 사이트는 건드리지 않는다. Supabase 모드에서도 같은 스크립트로 확인한다.

## 배포 (Vercel + Supabase)

로컬 파일 저장소는 Vercel에서 쓸 수 없으므로 Supabase가 필요하다.

1. Supabase 프로젝트 생성 → SQL Editor에서 `supabase/migrations/0001_init.sql` 실행(테이블 + 공개 버킷 `photos`. 버킷 생성이 거부되면 Storage 메뉴에서 `photos`를 Public으로 직접 만든다) → `supabase/seed.sql` 실행.
2. 로컬 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EDITOR_KEY`를 넣고 `npm run dev` → `node scripts/check-rules.mjs`가 33건 통과하는지 확인한다. (`src/lib/db.supabase.ts`는 2026-11-03 현재 실제 프로젝트로 검증하지 못한 코드다. 이 단계에서 걸러진다.)
3. 저장소를 GitHub에 올리고 Vercel에서 Import → Environment Variables에 같은 세 값 → Deploy.
4. `https://<배포주소>/s/kim-lab`이 열리는지, 편집기는 `https://<배포주소>/editor/site_kimlab?key=<EDITOR_KEY>`로 열리는지 확인한다.

## 구조

```
src/lib/schema.ts         zod: SiteConfig·블록 종류별 props·공지 입력
src/lib/slots.ts          슬롯 규칙표 + canPlace + validateConfig
src/lib/catalog.ts        블록 6종 정의(이름·설명·기능) + newBlock
src/lib/sample.ts         연결 전 샘플 데이터
src/lib/seed.ts           시드 사이트, 빈 사이트
src/lib/store.ts          저장소 인터페이스
src/lib/db.ts             저장소 선택(환경변수) — 라우트·페이지는 이것만 import
src/lib/db.local.ts       로컬 JSON 파일 + 업로드 폴더
src/lib/db.supabase.ts    Supabase Postgres + Storage
src/lib/auth.ts           EDITOR_KEY 쿠키 검사
src/renderer/             SiteRenderer (config, data, mode) → UI, blocks/ 6개
src/store/editor.ts       zustand 편집기 스토어
src/app/editor/[siteId]   편집기 (3단): Editor·BlockPicker·SidePanel·BlockPanel·PayModal·loading
src/app/s/[slug]          공개 페이지 (+ loading)
src/app/api/sites/[id]    GET/PUT config, connect/ POST 기능 연결
src/app/api/notices       GET/POST, [id]/ DELETE
src/app/api/photos        GET/POST(multipart), [id]/ DELETE
src/app/uploads/[...path] 로컬 업로드 파일 서빙 (Supabase 모드에서는 안 쓴다)
scripts/check-rules.mjs   서버 검증 점검 33건
supabase/                 마이그레이션·시드 SQL
legacy/                   교수님 홈페이지 정적 미리보기 (참고용, 빌드 제외)
```

## 설계 규칙 (SPEC 3절, 코드에서 지키는 곳)

- 사이트의 진실은 config JSON 하나 (`schema.ts`), 편집기와 공개 페이지가 같은 `SiteRenderer`를 쓴다.
- 블록 id는 nanoid 8자로 생성 시 발급, 절대 안 바뀜 (`store/editor.ts addBlock`). 위치는 `slots` 배열에만 있다.
- 공지·사진은 `site_id + block_id`로만 묶인다. 테이블에 위치 정보 없음 (`db.local.ts`, `db.supabase.ts`, `0001_init.sql`).
- 슬롯 규칙표는 UI(`BlockPicker`, 툴바)와 서버(`PUT /api/sites`)가 같은 `slots.ts`를 쓴다.
- 스타일은 사이트 단위 `theme`만. `--accent`, `--s` CSS 변수로 적용 (`SiteRenderer.themeStyle`, `globals.css`).
- 렌더러는 순수: 데이터는 바깥(`loadBlockData`)에서 넣어 준다.
- 기능 연결 상태는 `POST /connect`로만 바뀐다. PUT이 보낸 값은 서버가 무시한다.
- AI/LLM 호출 없음. 외부 호출은 DB·Storage뿐.

## 알려진 제한

- 내보내기·배포·도메인 연결은 버튼만 있다(유료 배지, "준비 중"). SPEC 5.1대로 시제품에서는 비활성.
- 결제는 가짜다(1초 스피너 → 연결). 실제 PG 연동 위치는 `// TODO: PG 연동 지점` (`PayModal.tsx`, `api/sites/[id]/connect/route.ts`).
- 연결은 되돌릴 수 없고, 공지·사진이 있는 블록은 삭제할 수 없다(정식 버전: 데이터 보관 후 재연결).
- 사진은 JPG·PNG·GIF·WEBP만, 10MB까지. SVG는 스크립트를 담을 수 있어 제외.
- 레이아웃 1개(교수용), 단일 페이지, 로그인 없음(단일 관리자 키).
- 규칙표에서 SPEC 6절과 다른 점: `main-left`에 notices·photos 허용(데모 4번이 요구).
