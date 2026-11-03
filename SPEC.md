# SPEC — 블록 조합형 홈페이지 제작 툴 (시제품)

> **사용법**
> 1. 이 파일을 프로젝트 루트에 `SPEC.md`로 저장한다.
> 2. 교수님 홈페이지 코드를 같은 저장소의 `legacy/` 폴더에 복사한다(없으면 8절 기본 스택으로 진행).
> 3. Claude Code를 열고 다음을 입력한다.
>
> ```
> @SPEC.md 를 전부 읽어. 0절의 작업 방식을 따른다.
> 먼저 1~3절을 5줄로 요약하고, 8절의 [채울 것]과 모호한 점을 질문해.
> 답을 받으면 9절 1단계부터 시작해.
> ```
>
> 4. 이후 단계마다 `9절 N단계 진행해` 라고만 하면 된다.

---

## 0. 작업 방식 (Claude Code에게)

- 작업 전 이 파일 전체를 읽는다. 8절의 [채울 것]을 먼저 사용자에게 묻는다. `legacy/`가 있으면 구조와 스택을 먼저 파악하고 재사용할 부분(공지·사진 업로드 코드, DB 설정)을 목록으로 보고한다.
- 각 단계(9절) 시작 전에 할 일을 5줄 이내로 요약한다. 끝나면 실행 방법과 확인 방법을 알려준다. 단계마다 `git commit`.
- 모호하면 추측하지 말고 묻는다. 단, 2절 시제품 범위를 넘는 기능은 제안하지 않는다.
- 12절의 금지 사항을 어기는 코드는 쓰지 않는다.
- 파일 여러 개를 먼저 만들기보다 동작하는 수직 슬라이스를 우선한다. 1단계가 끝나면 "JSON → 렌더 → 저장 → 공개 페이지"가 실제로 돌아가야 한다.
- 마감은 2026-11-06(금)이다. 완성도보다 10절 데모 시나리오가 끝까지 도는 것이 우선이다. 막히면 범위를 줄이고 이유를 보고한다.
- 에러는 사용자에게 보여줄 한국어 메시지로 처리한다. 콘솔에만 찍고 넘어가지 않는다.

## 1. 무엇을 만드는가

코딩과 디자인을 모르는 사람(교수)이 블록을 골라 홈페이지를 만들고, 바꾼 결과를 실시간으로 보면서 완성하는 웹 툴.

- 사용자가 만드는 것은 코드가 아니라 **사이트 설정(JSON)** 이다. 코드는 블록 종류마다 우리가 한 번만 쓴다.
- AI/LLM API를 호출하지 않는다. 같은 설정이면 항상 같은 결과가 나와야 한다.
- 블록 구성은 무료, "기능 연결"(백엔드)부터 유료. 시제품에서 결제는 가짜다(모달 → 상태 전환).
- 핵심 시연 포인트: 블록을 다른 자리로 옮겨도 그 블록에 쌓인 공지·사진이 그대로 따라온다. 위치와 데이터는 분리되어 있다.

## 2. 시제품 범위

### 포함 (In)

- 레이아웃 1개: 교수 개인 홈페이지. 슬롯(자리) 고정.
- 블록 6종: `nav`(탭 메뉴), `profile`, `text`(제목+본문), `publications`(정적 목록), `notices`(공지사항), `photos`(사진).
- 블록 조작: 추가, 삭제, 슬롯 안에서 위/아래 이동, 다른 슬롯으로 이동, 블록 내용 편집(props 폼).
- 스타일(사이트 단위): 포인트 색(팔레트 6종 + 직접 입력), 글꼴 3종(Pretendard / Noto Serif KR / 시스템), 글자 크기 3단계(작게/보통/크게).
- 실시간 미리보기: 편집기 가운데. 변경 즉시 반영, 서버 왕복 없이.
- 자동 저장: 변경 후 1초 debounce → DB. 상단에 "자동 저장됨 HH:MM".
- 공개 페이지 `/s/[slug]`: 편집기와 같은 렌더러.
- 기능 연결(유료 흉내): `notices` → 공지 올리기, `photos` → 사진 올리기. 연결 전에는 샘플 데이터 + "기능 연결(유료)" 배지. 결제 모달 → "연결됨".
- 연결된 블록의 콘텐츠 관리: 편집기 오른쪽 패널에서 공지 작성·삭제, 사진 업로드·삭제.
- 시드 데이터: 김OO 교수 샘플 사이트 1개(11절).

### 제외 (Out)

- 실제 결제(PG), 도메인 연결, 배포 파이프라인.
- 내보내기: 시간이 남을 때만 정적 HTML zip 다운로드(3단계 끝).
- 다중 레이아웃, 다중 페이지(단일 페이지 + 앵커 탭으로 충분).
- 사용자 계정·로그인. 단일 관리자. 편집기는 환경변수 `EDITOR_KEY`를 `?key=`로 받아 쿠키에 저장하는 수준으로만 보호.
- 자유 배치(드래그로 아무 데나), 픽셀 단위 조정, 커스텀 CSS, 블록별 스타일.
- 팝업 블록, 검색 블록, 창업팀용 레이아웃.
- AI 기능 전부.

## 3. 핵심 설계 규칙 (반드시 지킬 것)

- **R1.** 사이트의 진실은 `sites.config` JSON 하나다. 편집기도 공개 페이지도 같은 JSON을 같은 렌더러로 그린다.
- **R2.** 블록 `id`는 생성 시 발급(nanoid 8자)하고 절대 바꾸지 않는다. 슬롯 이름·순서·타입에서 파생하지 않는다. 블록을 옮겨도 id는 그대로다.
- **R3.** 백엔드 데이터(공지·사진)는 `site_id` + `block_id`로 묶는다. 백엔드 테이블에 위치 정보는 없다.
- **R4.** 슬롯마다 허용 블록 종류와 최대 개수를 규칙표(6절)로 고정한다. 규칙에 없는 조합은 UI에서 선택 불가, 서버 저장 시에도 거부.
- **R5.** 스타일은 사이트 단위 `theme`로만 적용한다. 블록별 스타일 없음.
- **R6.** 렌더러는 순수 함수다: `(config, data, mode) → UI`. 렌더러 안에서 fetch·저장 금지. 데이터는 바깥에서 받아서 넣는다.
- **R7.** 기능 연결 상태는 `config.blocks[id].feature.connected`로 관리한다. 연결 전에는 샘플 데이터를 렌더하고 쓰기 UI를 막는다.
- **R8.** AI/LLM API 호출 금지. 외부 호출은 DB·스토리지뿐.

## 4. 데이터 모델

### 4.1 `sites.config` (JSON)

```json
{
  "version": 1,
  "siteId": "site_kimlab",
  "slug": "kim-lab",
  "title": "김OO 연구실",
  "theme": { "accent": "#1E3A8A", "font": "pretendard", "scale": "md" },
  "slots": {
    "header": ["a1b2c3d4"],
    "main-left": ["e5f6g7h8", "i9j0k1l2"],
    "main-right": ["m3n4o5p6", "q7r8s9t0"],
    "footer": []
  },
  "blocks": {
    "a1b2c3d4": { "type": "nav", "props": { "items": ["소개", "연구", "논문", "연락처"] } },
    "e5f6g7h8": { "type": "profile", "props": { "name": "김OO", "title": "교수", "dept": "OO대학교 OO학과", "email": "", "photoUrl": "" } },
    "i9j0k1l2": { "type": "text", "props": { "heading": "연구 소개", "body": "..." } },
    "m3n4o5p6": { "type": "notices", "props": { "heading": "공지사항", "limit": 5 }, "feature": { "key": "notice-post", "connected": false } },
    "q7r8s9t0": { "type": "photos", "props": { "heading": "사진", "columns": 3 }, "feature": { "key": "photo-upload", "connected": false } }
  }
}
```

- `slots` 배열의 순서 = 화면 순서. 이동 = 배열에서 id를 빼서 다른 배열(또는 같은 배열의 다른 위치)에 넣는 것.
- 블록 레코드에 slot·x·y·order를 넣지 않는다(R2). 위치는 `slots`에만 있다.
- `theme.font`: `pretendard | noto-serif | system`. `theme.scale`: `sm | md | lg`.

### 4.2 DB (Postgres / Supabase)

```sql
create table sites (
  id text primary key,
  slug text unique not null,
  config jsonb not null,
  updated_at timestamptz default now()
);
create table notices (
  id uuid primary key default gen_random_uuid(),
  site_id text references sites(id) on delete cascade,
  block_id text not null,
  title text not null,
  body text not null default '',
  created_at timestamptz default now()
);
create table photos (
  id uuid primary key default gen_random_uuid(),
  site_id text references sites(id) on delete cascade,
  block_id text not null,
  storage_path text not null,
  caption text default '',
  created_at timestamptz default now()
);
create index on notices (site_id, block_id, created_at desc);
create index on photos (site_id, block_id, created_at desc);
```

- 파일: Supabase Storage 버킷 `photos`, 경로 `{site_id}/{block_id}/{uuid}.{ext}`. 공개 읽기.
- 시제품에서 RLS는 끈다. 쓰기는 모두 서버 라우트(service role) 경유. 클라이언트에 service role 키 노출 금지.
- `notices`·`photos`의 `block_id`는 `config.blocks`에 있는 id여야 한다(서버 라우트에서 검증).

### 4.3 블록 카탈로그 (코드 상수, `src/lib/catalog.ts`)

```ts
type BlockType = 'nav' | 'profile' | 'text' | 'publications' | 'notices' | 'photos';
type FeatureKey = 'notice-post' | 'photo-upload';

interface BlockDef {
  type: BlockType;
  label: string;          // 카탈로그에 보일 이름 (한국어)
  description: string;    // 한 줄 설명
  defaultProps: Record<string, unknown>;
  feature?: { key: FeatureKey; label: string; description: string };
  Component: React.FC<{ props: any; data?: any; theme: Theme; mode: 'edit' | 'public' }>;
}
```

| type | label | defaultProps | feature | 비고 |
| --- | --- | --- | --- | --- |
| nav | 탭 메뉴 | items: ["소개","연구","논문","연락처"] | — | 앵커 링크. 페이지 내 섹션으로 스크롤 |
| profile | 프로필 | name, title, dept, email, photoUrl | — | photoUrl은 URL 입력 또는 업로드(여유 시) |
| text | 글 | heading, body | — | body는 줄바꿈 유지 |
| publications | 논문 목록 | items: [{title, venue, year, url}] | — | 시제품은 정적 배열 편집 |
| notices | 공지사항 | heading, limit | notice-post "공지 올리기" | 연결 전 샘플 3건 |
| photos | 사진 | heading, columns(2/3) | photo-upload "사진 올리기" | 연결 전 샘플 3장 |

## 5. 화면

### 5.1 `/editor/[siteId]` — 3단

- **왼쪽 240px "블록 고르기"**: 카탈로그 카드 6개(아이콘, 이름, 한 줄 설명). 클릭 → 현재 선택된 슬롯에 추가(선택 없으면 `main-right` 끝). 규칙표상 불가하면 카드 비활성 + 툴팁에 이유("이 자리에는 넣을 수 없어요", "이미 하나 있어요").
- **가운데 "미리보기"**: 실제 렌더러(`mode='edit'`). 슬롯 영역에 점선 테두리 + 슬롯 이름 작게. 블록 클릭 → 선택(포인트 색 테두리) + 블록 위 작은 툴바(위로 / 아래로 / 다른 자리로 ▾ / 삭제). 빈 슬롯은 "+ 블록 고르기" 문구. 폭 토글 데스크톱/모바일은 여유 시.
- **오른쪽 300px, 탭 2개**
  - **스타일**: 포인트 색 팔레트(6칩 + 색 입력), 글꼴 셀렉트(미리보기 글자 "가나다 Aa" 표시), 글자 크기 토글(작게/보통/크게).
  - **블록**: 선택된 블록의 props 폼(type별 필드). `feature`가 있는 블록이면 하단에 **연결 카드**:
    - 미연결: "공지 올리기 기능이 아직 연결되지 않았어요" + 버튼 **기능 연결 (유료)** → 결제 모달
    - 연결됨: 콘텐츠 관리 — notices: 작성 폼(제목, 본문) + 목록(삭제 버튼) / photos: 파일 선택 업로드 + 썸네일 목록(삭제)
- **상단 바**: 사이트 제목(편집 가능), "자동 저장됨 HH:MM" 또는 "저장 중…", 링크 **공개 페이지 보기**(새 탭), 비활성 버튼 **배포·도메인 연결**과 **내보내기**에 "유료" 배지(툴팁 "시제품에서는 준비 중").

### 5.2 `/s/[slug]` — 공개 페이지

- 같은 렌더러, `mode='public'`. 편집 UI 없음.
- 연결된 블록은 DB 데이터, 미연결 블록은 샘플 데이터(배지 없이 그냥 샘플).
- 매 요청 DB 읽기(캐시 없음). 반응형: 모바일에서 `main-left`/`main-right`가 세로로 쌓인다.

### 5.3 결제 모달 (가짜)

- 제목: "{블록 이름}에 {기능 이름}을 연결할까요?" (예: "공지사항에 공지 올리기를 연결할까요?")
- 본문 2줄: 연결되면 할 수 있는 일. 가격 자리 "₩00,000 (1회)". 아래 작게 "블록 구성은 계속 무료예요".
- 버튼: **결제하고 연결하기** / 나중에.
- 동작: 1초 스피너 → `config.blocks[id].feature.connected = true` 저장 → 토스트 "연결됐어요. 이제 공지를 올릴 수 있어요". 실제 결제 없음. 코드에 `// TODO: PG 연동 지점` 주석.

## 6. 슬롯 규칙표 (`src/lib/slots.ts`)

| 슬롯 | 허용 블록 | 최대 개수 | 폭 |
| --- | --- | --- | --- |
| header | nav | 1 | 100% |
| main-left | profile, text, publications, notices, photos | 3 | 1/3 (모바일 100%) |
| main-right | text, notices, photos, publications | 4 | 2/3 (모바일 100%) |
| footer | text | 1 | 100% |

- 사이트당 1개만: `nav`, `profile`, `notices`, `photos`. 여러 개 가능: `text`, `publications`.
- (1단계 수정 2026-11-03) main-left에 notices·photos를 추가했다. 원래 표로는 10절 데모 4번과 9절 2단계 완료 기준(notices를 main-left로 이동)이 불가능했기 때문.
- 검증은 두 곳: UI(카드 비활성, 이동 메뉴에서 불가 슬롯 숨김)와 서버 `PUT /api/sites/[id]`(zod + 규칙표, 위반 시 400과 한국어 이유).

## 7. 기능 연결 흐름

1. `notices` 블록 추가 → `feature.connected=false` → 샘플 공지 3건 렌더 + 블록 하단 "기능 연결 (유료)" 배지(edit 모드에서만).
2. 오른쪽 "블록" 탭 → 연결 카드 → 결제 모달 → 연결됨.
3. 연결 후: 오른쪽 패널에 공지 작성 폼 + 목록. 작성 → `POST /api/notices` → 목록과 미리보기 즉시 갱신(낙관적 업데이트 또는 재조회).
4. 공개 페이지에서 DB 공지 표시(최신순, `props.limit`개).
5. `photos` 동일: 파일 선택 → `POST /api/photos`(multipart) → Storage 업로드 → `photos` 행 추가 → 썸네일 갱신.
6. **블록을 다른 슬롯으로 옮겨도 공지·사진 유지** (R2/R3 검증 포인트, 데모 4번).
7. 연결된 블록 삭제 시도 → 확인창 "이 블록에 공지 {n}건이 있어요. 시제품에서는 데이터가 있는 블록을 삭제할 수 없어요." → 삭제 막음. (정식 버전 TODO: 데이터 보관 후 재연결.)

### API (서버 라우트, `src/app/api/`)

| 메서드 경로 | 역할 | 검증 |
| --- | --- | --- |
| GET /api/sites/[id] | config 반환 | — |
| PUT /api/sites/[id] | config 저장 | zod 스키마 + 6절 규칙표 |
| POST /api/sites/[id]/connect | `{blockId}` → feature.connected=true | 블록 존재, feature 있음 |
| GET /api/notices?siteId&blockId | 목록 | — |
| POST /api/notices | `{siteId, blockId, title, body}` | 블록 존재 + connected |
| DELETE /api/notices/[id] | 삭제 | — |
| GET /api/photos?siteId&blockId | 목록(공개 URL 포함) | — |
| POST /api/photos | multipart `{siteId, blockId, file, caption}` | connected, 10MB 이하, image/* |
| DELETE /api/photos/[id] | 행 + Storage 삭제 | — |

쓰기 라우트는 `EDITOR_KEY` 쿠키 확인. 공개 페이지는 서버 컴포넌트에서 DB 직접 읽기.

## 8. 기술 스택

**[채울 것 — 시작 전에 사용자에게 묻는다]**
- 교수님 홈페이지 코드 위치: `______` (예: `legacy/`)
- 그 코드의 스택: 프론트 `______` / 백엔드 `______` / DB·스토리지 `______`
- Supabase 프로젝트 URL·키 보유 여부: `______`

**원칙**: 교수님 홈페이지와 같은 스택을 쓴다. 공지·사진 업로드 코드는 거기서 가져와 `site_id`/`block_id` 스코프만 추가한다.

**기존 코드가 없거나 스택이 안 맞으면 기본값:**
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Storage), `@supabase/supabase-js`
- 상태: `zustand` (editor store: `config`, `selectedBlockId`, `selectedSlot`, `saveState`)
- 검증: `zod`. ID: `nanoid`
- 폰트: Pretendard(CDN), Noto Serif KR(Google Fonts)
- 시연 배포: Vercel
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `EDITOR_KEY`

**폴더 구조**
```
src/
  lib/catalog.ts        블록 정의 6종
  lib/slots.ts          규칙표 + canPlace(config, slot, type)
  lib/schema.ts         zod: SiteConfig
  lib/sample.ts         연결 전 샘플 데이터
  renderer/SiteRenderer.tsx   (config, data, mode) → UI
  renderer/blocks/*.tsx       블록 컴포넌트 6개
  app/editor/[siteId]/        편집기
  app/s/[slug]/               공개 페이지
  app/api/...                 7절 라우트
  store/editor.ts             zustand
supabase/migrations/0001_init.sql
supabase/seed.sql
legacy/                       교수님 홈페이지 원본(참고용, 빌드 제외)
```

## 9. 작업 순서 (4일)

### 1단계 — 화(11/3): 뼈대
- 프로젝트 생성, 환경변수, 마이그레이션(4.2), 시드 사이트 1개(11절).
- `catalog.ts`, `slots.ts`, `schema.ts`, `sample.ts`.
- `SiteRenderer` + 블록 6종(스타일은 대충, 구조는 정확히). theme → CSS 변수(`--accent`, `--font`, `--scale`).
- `/s/[slug]`가 시드 config를 렌더.
- `/editor`: 3단 레이아웃, 블록 추가·삭제·이동(슬롯 내/간), 자동 저장(`PUT /api/sites`).
- **완료 기준**: 블록을 옮기고 새로고침해도 유지, 공개 페이지에 반영.

### 2단계 — 수(11/4): 스타일 + 공지 연결
- 스타일 패널(accent/font/scale) → 즉시 반영.
- 블록 props 폼(type별).
- 결제 모달 → `POST /connect` → connected 전환 → 배지 사라짐.
- notices: API + 작성/삭제 폼 + 공개 페이지 표시.
- **완료 기준**: 공지 2건 쓰고 블록을 main-left로 옮겨도 공지 유지.

### 3단계 — 목(11/5): 사진 + 다듬기
- photos: Storage 업로드, 목록, 삭제. 공개 페이지 그리드.
- 빈 슬롯 안내, 규칙 위반 비활성 + 툴팁, 토스트, 저장 상태 표시, 로딩 스켈레톤.
- 반응형(공개 페이지 우선).
- 시드 데이터 내용 채우기(11절).
- 여유 시: 내보내기 — 서버에서 `renderToStaticMarkup(SiteRenderer)` + CSS 인라인 → `index.html` zip 다운로드.

### 4단계 — 금(11/6): 데모
- 10절 시나리오 3회 리허설, 발견 버그 수정.
- `README.md`: 설치, 환경변수, 실행, 데모 순서, 알려진 제한.
- Vercel 배포 + 시드 사이트 URL 확인. `grep -ri "openai\|anthropic\|gemini" src/` 결과 0건 확인.

## 10. 데모 시나리오 (심사 시연, 3분)

1. 빈 사이트 → `nav`, `profile` 추가 → 이름·학과 입력 → 미리보기 즉시 반영.
2. 포인트 색·글꼴 변경 → 전체가 즉시 바뀜.
3. `notices` 추가 → 샘플 공지 보임 → "기능 연결(유료)" → 결제 모달 → 연결 → 공지 1건 작성 → 미리보기 반영.
4. `notices` 블록을 main-left로 이동 → **공지가 그대로 따라옴** (핵심: "위치와 데이터는 분리").
5. `photos` 추가 → 연결 → 사진 1장 업로드 → 그리드에 표시.
6. "공개 페이지 보기" → 새 탭에서 동일 → 창 폭을 줄여 모바일 확인.

## 11. 시드 데이터

- `sites`: id `site_kimlab`, slug `kim-lab`, title "김OO 연구실"
- nav: 소개·연구·논문·연락처
- profile: 김OO / 교수 / OO대학교 OO학과 OO 연구실 / kim@example.ac.kr
- text(main-left): "연구 소개" — 3문장 가상 텍스트
- publications: 3건 — "논문 제목 예시 1·2·3", 저널명 예시, 2024~2026
- notices: `connected=false`, 샘플 3건은 `sample.ts`(DB에 넣지 않음)
- photos: `connected=false`, 샘플 3장은 `/public/sample/photo-1..3.jpg` 플레이스홀더(단색 + 번호)
- 실제 인물·기관명·로고·타 서비스 디자인 사용 금지

## 12. 하지 말 것

- AI/LLM API 호출, 프롬프트 입력창, "AI로 생성" 류 UI
- 블록 id를 슬롯명·순서·타입에서 만들기
- 블록 레코드에 좌표·슬롯·순서 저장
- 자유 드래그 배치, 커스텀 CSS 입력, 블록별 스타일
- 실제 결제 연동
- 다중 레이아웃·페이지, 로그인 시스템
- 클라이언트에 service role 키 노출
- 범위 밖 기능 제안이나 리팩토링으로 시간 쓰기

## 13. 완료 체크리스트

- [ ] 10절 시나리오 6단계 전부 통과
- [ ] 새로고침·재접속 후 상태 유지
- [ ] 블록 이동 후 공지·사진 유지
- [ ] 규칙표 위반 조합이 UI에서 선택 불가, 서버에서도 400
- [ ] 연결 전 블록에 쓰기 API가 403
- [ ] 공개 페이지가 모바일 폭(375px)에서 깨지지 않음
- [ ] `src/`에 AI API 호출 0건
- [ ] README에 실행 방법과 데모 순서
