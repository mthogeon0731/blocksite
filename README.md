# 블록 홈페이지 (시제품)

코딩·디자인을 모르는 사람이 블록을 골라 홈페이지를 만들고, 바뀌는 결과를 실시간으로 보면서 완성하는 웹 툴. AI/LLM 호출 없음, 정해진 규칙으로만 동작. 블록 구성은 무료, 기능 연결(공지 올리기·사진 올리기)부터 유료(시제품은 가짜 결제). 스펙은 [SPEC.md](SPEC.md)(시제품)와 [GRID_SPEC.md](GRID_SPEC.md)(그리드 개편, 브랜치 `grid-layout` — 충돌하면 GRID_SPEC이 우선).

그리드 개편: 페이지 뒤판이 가로 48칸 모눈판이다. 블록은 칸 단위 `(x, y, w, h)`라서 판 어디에나 놓고, 끌어서 옮기고, 가장자리를 끌어 크기를 바꾼다. 겹치면 겹친 블록이 아래로 밀린다. 블록 안쪽은 정해진 선택지(바탕·모서리·여백·사진 모양 등)와 부품 정렬·숨기기로 조정한다.

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
| http://localhost:3000/editor/demo | 빈 사이트로 시작 (데모용, 첫 변경 때 만들어짐) |

데이터는 기본으로 로컬 파일에 저장된다: `.data/db.json`(사이트·공지·사진 행), `.data/uploads/`(사진 파일, `/uploads/...` 라우트가 서빙). 첫 실행 때 시드 사이트가 자동으로 들어간다. **처음 상태로 되돌리려면 `.data/` 폴더를 지운다.**

## 환경변수 (`.env.local`, 전부 선택)

`.env.example` 참고.

- `EDITOR_KEY`: 설정하면 편집기와 쓰기 API가 쿠키를 확인한다. 편집기를 `/editor/site_kimlab?key=값`으로 한 번 열면 쿠키가 저장된다. 로컬에서는 비워 둬도 된다. **배포할 때는 꼭 설정한다.**
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: 둘 다 있으면 Supabase를 쓴다(아래 "배포"). 없으면 로컬 파일 저장소. URL은 `https://<ref>.supabase.co`까지만(뒤에 `/rest/v1/`이 붙으면 안 된다). 키는 새 형식 `sb_secret_…`도 된다.
- **`grid-layout` 브랜치 작업 중**: `.env.local`에 프로덕션 Supabase 값이 있으면 개편 코드가 그 DB에 v2 config를 써서 master 배포본(v1 코드)의 그 사이트가 깨진다. 그래서 `.env.development.local`(git 제외)에 위 두 값과 `EDITOR_KEY`를 **빈 값**으로 두어 `npm run dev`만 로컬 저장소·편집 키 없음으로 돌린다. 이 파일을 지우면 `.env.local` 설정으로 돌아간다. `next build`·배포에는 영향이 없다.

## 데모 순서 (심사 시연, 3분 — GRID_SPEC 11.4)

`.data/`를 지우고 서버를 켠 뒤 http://localhost:3000/editor/demo 에서 시작한다. 2026-11-03 브라우저 자동 리허설 2회 통과.

1. **빈 사이트** → 화면 가득한 모눈판 → 왼쪽 **탭 메뉴** 카드 클릭(맨 위에 가로 꽉으로 들어감) → 판 위 빈 칸을 끌어 프로필 자리를 그리고 메뉴에서 **프로필** → 오른쪽 "블록" 탭에서 이름·소속 입력 → 미리보기가 글자 단위로 바뀌고, 내용이 길어지면 높이도 저절로 늘어난다.
2. 프로필을 판 위에서 끌어 옮기고, 오른쪽 가장자리 손잡이를 끌어 키운다 → 칸에 맞춰 붙는다. 말할 것: *"격자에 맞춰서만 움직이고 서로 겹치지 않아서, 아무렇게나 옮겨도 안 깨진다."*
3. 오른쪽 "모양"에서 **사진 모양 → 네모** → 미리보기에서 프로필의 이름을 클릭(점선) → 키보드 **→ →** → 이름만 오른쪽 끝으로. 블록 안쪽까지 조정된다.
4. "스타일" 탭 → 포인트 색 칩, 글꼴(명조) → 사이트 전체가 바뀐다.
5. **공지사항** 카드를 끌어 **프로필 아래 빈 곳**에 놓는다(공지는 기본 28칸이라 넓힌 프로필 옆에는 안 들어간다. 옆에 두려면 판 위를 끌어 좁은 자리를 그린 뒤 공지사항을 고른다) → "블록" 탭 **기능 연결 (유료)** → 결제 모달 → **결제하고 연결하기** → "공지 올리기"로 1건 작성 → 공지 블록을 다른 곳으로 끌어 옮긴다 → **공지가 그대로 따라온다.** 말할 것: *"위치는 화면만 알고, 공지는 블록 id에 묶여 있다. 블록 id는 오른쪽 패널에 보이고 옮겨도 바뀌지 않는다."*
6. 탭 메뉴를 판 맨 아래로 끈다(판이 화면보다 길면 끄는 중에 휠로 내리거나, 탭 메뉴를 선택하고 **Shift+↓**) → 맨 위에 빈 띠가 남는다 → 상단 **빈 줄 정리**.
7. 상단 **공개 페이지 보기 ↗** → 새 탭에 같은 모습 → 창 폭을 줄이면 한 줄로 쌓인다(모바일).

막히는 상황: 블록 아래가 많이 비면 툴바 **높이 맞춤**(자동으로는 늘리기만 한다). 잘못 옮겼으면 **Ctrl+Z**(상단 되돌리기). 안 되는 블록은 카드가 흐려지고 이유가 적혀 있다("이미 하나 있어요"). 공지·사진이 있는 블록의 삭제는 확인창으로 막힌다.

## 조작법 (편집기)

| 하고 싶은 것 | 방법 |
| --- | --- |
| 블록 넣기 | 판 빈 칸을 끌어 자리를 그리고 종류 고르기 / 카드를 원하는 칸에 끌어다 놓기(놓은 칸이 왼쪽 위) / 빈 칸 클릭 후 카드 클릭 / 카드만 클릭(빈 자리 자동) |
| 옮기기·크기 | 블록 끌기, 손잡이 8개 끌기(끄는 동안 밀려날 결과와 `x · y · 크기` 말풍선), Esc로 취소. 오른쪽 패널 "위치·크기" 숫자(Enter로 적용)와 ± |
| 키보드 (블록 선택) | 화살표 1칸, Shift+화살표 4칸, Alt+화살표 오른쪽·아래 변 크기, Delete 삭제, Esc 선택 해제 |
| 부품 (블록 안 이름·사진 등) | 선택된 블록 안에서 부품 클릭(점선) → ← → 정렬, Esc는 블록 선택으로. 숨기기는 패널 "부품" |
| 툴바 | 왼쪽 벽 · 가로 꽉 · 오른쪽 벽 · 위로 붙이기 · 높이 맞춤 · 삭제 |
| 상단 바 | 되돌리기(Ctrl+Z) · 다시 하기(Ctrl+Shift+Z) · 빈 줄 정리 · 격자 보기 |
| 블록 모양 | 패널 "모양": 바탕(카드·없음·포인트 색)·모서리·안쪽 여백·세로 위치·바탕을 화면 끝까지(벽에 붙은 블록만) + 종류별(메뉴 배치, 사진 모양·위치·크기, 연도·날짜, 사진 비율) |
| 사이트 전체 | "스타일" 탭: 포인트 색·글꼴·글자 크기·배경(없음/모눈) |

## 완료 체크리스트 (GRID_SPEC 13절, 2026-11-03)

- [x] E1~E7 통과 (헤드리스 브라우저에 실제 마우스·키 입력으로 확인, 개발기록 10~13절)
- [x] 빈 사이트가 모눈판으로 시작하고, 블록 놓기 4가지가 모두 원하는 칸에 놓임
- [x] `resolve`·`collapseEmptyRows` 단위 확인 통과 (`node --test scripts/grid.test.mjs` 12건)
- [x] `check-rules.mjs` 전부 통과 (42건, 로컬 저장소)
- [x] 1440px에서 편집기 미리보기 = 공개 페이지 (블록 크기·위치 동일)
- [x] 375px 가로 스크롤 0, 900px 겹침 0
- [x] 배포 DB의 기존 v1 사이트가 v2로 열림 (프로덕션 config 사본으로 확인 + preview에서 읽기 확인, 공지·사진 테이블은 손대지 않음)
- [x] 되돌리기·다시 하기 동작, 기능 연결 상태는 되돌려지지 않음
- [x] `SPEC.md` 충돌 절에 주석, README·개발기록 갱신
- [x] `grep -ri "openai\|anthropic\|gemini" src/` 0건

서버 검증 점검(서버 켜고): `node scripts/check-rules.mjs` — 판 규칙·스키마 16건, 연결·공지 11건, 사진 13건, v1 → v2 변환 2건 = 42건. 점검용 사이트 `site_check`만 쓰고 시드 사이트는 건드리지 않는다. Supabase 모드에서는 site_check를 v2로 쓰므로 그 DB를 읽는 배포본이 v2 코드일 때만 돌린다.

판 규칙·되돌리기 단위 확인(서버 불필요): `node --test scripts/grid.test.mjs` — resolve(밀어내기)·빈 줄 정리·빈 자리 찾기·위로 붙이기·v1 변환·손잡이 크기 조절·되돌리기(묶기·연결 유지·데이터 보호)·부품 설정 12건.

## 배포 (Vercel + Supabase)

**프로덕션 (master, 그리드 개편 전)**: https://blocksite-seven.vercel.app — 공개 페이지 `/s/kim-lab`, 편집기 `/editor/site_kimlab?key=<EDITOR_KEY>`. Vercel 프로젝트 `blocksite`(계정 hogeon), Supabase 모드. 환경변수는 Vercel 프로젝트에 들어 있다(`npx vercel env ls`). `.vercelignore`가 `legacy/`, `.data/`, `.env*`를 업로드에서 뺀다.

**그리드 개편 preview (`grid-layout`, 2026-11-03)**: https://blocksite-7wr5s0tzp-hogeon.vercel.app — 다시 올리려면 이 브랜치 폴더에서 `npx vercel deploy --yes`(`--prod` 없이). Preview 환경에도 같은 환경변수 3개가 있고 **프로덕션과 같은 Supabase DB**를 쓴다.
- preview 편집기에서는 **새 사이트로만** 편집한다(예: `/editor/grid-demo?key=<EDITOR_KEY>`). 기존 사이트(`/editor/site_kimlab`)를 preview 편집기로 열면 자동 높이 맞춤이 곧바로 v2로 저장해 프로덕션의 `/s/kim-lab`이 깨진다. 공개 페이지(`/s/kim-lab`)는 읽기만 하므로 열어도 된다.
- preview 주소는 Vercel 로그인이 필요하다(프로젝트의 Deployment Protection). 다른 사람에게 보여 주려면 Vercel 대시보드에서 그 배포의 공유 링크를 만든다. CLI로는 `npx vercel curl <주소>`로 확인할 수 있다.

**프로덕션 반영 (지시가 있을 때만)**: `grid-layout`을 master에 병합 → `npx vercel deploy --prod --yes` → 프로덕션 편집기로 기존 사이트를 한 번 열어 높이를 맞춘다(v2로 저장). 그 뒤에는 옛 버전으로 되돌리면 v2로 저장된 사이트가 깨진다.

처음부터 새로 배포하는 경우(로컬 파일 저장소는 Vercel에서 쓸 수 없으므로 Supabase가 필요하다):

1. Supabase 프로젝트 생성 → SQL Editor에서 `supabase/migrations/0001_init.sql` 실행(테이블 + 공개 버킷 `photos`. 버킷 생성이 거부되면 Storage 메뉴에서 `photos`를 Public으로 직접 만든다) → `supabase/seed.sql`(v2 시드) 실행.
2. 로컬 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EDITOR_KEY`를 넣고 `npm run dev` → `node scripts/check-rules.mjs`가 42건 통과하는지 확인한다.
3. Vercel에 같은 세 값을 환경변수로 넣고 배포한다.
4. `https://<배포주소>/s/kim-lab`이 열리는지, 편집기는 `https://<배포주소>/editor/site_kimlab?key=<EDITOR_KEY>`로 열리는지 확인한다.

## 구조

```
src/lib/schema.ts         zod: SiteConfig v2(layout·look·theme.background)·블록 종류별 props·공지 입력 + parseSiteConfig
src/lib/grid.ts           판 규칙(48칸): resolve(밀어내기)·findFreeSpot·clampRect·resizeRect·liftUp·collapseEmptyRows·validateConfig
src/lib/migrate.ts        v1(자리 4개) → v2 변환. 저장소가 읽을 때 쓴다
src/lib/catalog.ts        블록 6종 정의(이름·설명·기능·기본/최소 크기·기본 look·부품) + newBlock + lookOf
src/lib/sample.ts         연결 전 샘플 데이터
src/lib/seed.ts           시드 사이트, 빈 사이트
src/lib/store.ts          저장소 인터페이스
src/lib/db.ts             저장소 선택(환경변수) — 라우트·페이지는 이것만 import
src/lib/db.local.ts       로컬 JSON 파일 + 업로드 폴더
src/lib/db.supabase.ts    Supabase Postgres + Storage
src/lib/auth.ts           EDITOR_KEY 쿠키 검사
src/renderer/             SiteRenderer (config, data, mode) → UI, blocks/ 6개(look을 props로 받아 그림, 부품마다 data-part) + parts.ts(부품 정렬·숨기기)
src/store/editor.ts       zustand 편집기 스토어 (배치·되돌리기·끄는 중 미리보기·부품 선택)
src/app/editor/[siteId]   편집기 (3단): Editor(상단 바·자동 저장)·Board(모눈판·끌기·크기 조절·자리 그리기·키보드·자동 높이 맞춤)·BlockPicker(카드 끌어다 놓기)·SidePanel(스타일·배경)·BlockPanel(위치·모양·부품·내용·기능 연결)·PayModal·loading
src/app/s/[slug]          공개 페이지 (+ loading)
src/app/api/sites/[id]    GET/PUT config(v2만), connect/ POST 기능 연결
src/app/api/notices       GET/POST, [id]/ DELETE
src/app/api/photos        GET/POST(multipart), [id]/ DELETE
src/app/uploads/[...path] 로컬 업로드 파일 서빙 (Supabase 모드에서는 안 쓴다)
scripts/check-rules.mjs   서버 검증 점검 42건
scripts/grid.test.mjs     판 규칙·되돌리기 단위 확인 12건 (node --test)
supabase/                 마이그레이션·시드 SQL (시드는 v2)
legacy/                   교수님 홈페이지 정적 미리보기 (참고용, 빌드 제외)
```

## 설계 규칙 (SPEC 3절 + GRID_SPEC 3절, 코드에서 지키는 곳)

- 사이트의 진실은 config JSON 하나 (`schema.ts`), 편집기와 공개 페이지가 같은 `SiteRenderer`를 쓴다. 화면 폭 1152px 이상에서 둘의 블록 위치·줄바꿈이 같다(편집기는 축소 배율만 다름).
- 블록 id는 nanoid 8자로 생성 시 발급, 절대 안 바뀜 (`store/editor.ts addBlock`). 위치는 `layout[블록 id]`(칸 단위 x·y·w·h)에만 있다.
- 공지·사진은 `site_id + block_id`로만 묶인다. 테이블에 위치 정보 없음 (`db.local.ts`, `db.supabase.ts`, `0001_init.sql`).
- 판 규칙(겹침 금지·최소 크기·사이트당 1개·30개)은 UI(`BlockPicker`, 편집기 스토어)와 서버(`PUT /api/sites`)가 같은 `grid.ts`를 쓴다. 판은 CSS Grid라 블록이 겹쳐 그려지지 않는다(내용이 길면 행이 늘어 아래가 밀린다).
- 색·글꼴·글자 크기는 사이트 단위 `theme`(`--accent`, `--s` CSS 변수). 블록마다는 정해진 선택지(look)만 고른다 — 숫자·색·CSS 자유 입력 없음.
- 렌더러는 순수: 데이터는 바깥(`loadBlockData`)에서 넣어 준다. 끌기·선택 같은 편집 로직은 편집기(`Board.tsx`)에만 있다.
- 기능 연결 상태는 `POST /connect`로만 바뀐다. PUT이 보낸 값은 서버가 무시하고, 되돌리기도 연결 상태를 바꾸지 않는다.
- AI/LLM 호출 없음. 외부 호출은 DB·Storage뿐.

## 알려진 제한

- 내보내기·배포·도메인 연결은 버튼만 있다(유료 배지, "준비 중"). SPEC 5.1대로 시제품에서는 비활성.
- 결제는 가짜다(1초 스피너 → 연결). 실제 PG 연동 위치는 `// TODO: PG 연동 지점` (`PayModal.tsx`, `api/sites/[id]/connect/route.ts`).
- 연결은 되돌릴 수 없고, 공지·사진이 있는 블록은 삭제할 수 없다(정식 버전: 데이터 보관 후 재연결).
- 사진은 JPG·PNG·GIF·WEBP만, 10MB까지. SVG는 스크립트를 담을 수 있어 제외.
- 단일 페이지, 로그인 없음(단일 관리자 키). 블록은 사이트당 30개까지.
- 블록 안 부품은 정렬·숨기기만 된다(블록 밖으로 꺼내기, 블록 안 자유 배치 없음). 블록 겹치기·레이어·여러 개 동시 선택·복사 없음.
- 자동 높이 맞춤은 늘리기만 한다. 줄이려면 툴바 **높이 맞춤**.
- 끄는 중 미리보기 가장자리 자동 스크롤 없음(휠로 내리면서 끌거나 키보드·숫자 입력).
- 모바일은 자동 세로 쌓기만((y, x) 순서). 모바일 전용 배치 편집과 편집기의 모바일 미리보기 토글은 없다.
- 화면 폭 1152px 미만에서는 칸이 줄어 공개 페이지의 줄바꿈이 편집기와 다를 수 있다(겹침은 생기지 않는다).
- 개편 전(v1)에 저장된 사이트는 기본 높이로 변환되어, 긴 블록 옆 카드가 늘어나 보일 수 있다. 편집기에서 한 번 열면 높이가 맞춰져 v2로 저장된다.
- 되돌리기 기록은 편집기를 닫으면 사라진다(최대 50단계). 공지·사진·기능 연결은 되돌리기 대상이 아니다.
