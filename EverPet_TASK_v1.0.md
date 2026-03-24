# 🐾 EverPet — TASK.md
**AI 개발 태스크 명세서**

| 항목 | 내용 |
|------|------|
| 작성일 | 2026. 03. 22 |
| 기반 문서 | PRD v2.1, TRD v2.1 |
| 대상 | AI 코딩 에이전트 (Claude Code, Cursor 등) |
| 작업 단위 | 각 태스크는 독립적으로 실행 가능하도록 작성 |

> **읽는 법**: 각 태스크의 `ref` 항목은 PRD/TRD의 어느 섹션을 근거로 하는지 표시한다.
> 태스크 간 의존 관계는 `depends on` 으로 명시한다.

---

## Phase 0 — 프로젝트 초기 세팅

Phase 0의 목표는 개발을 시작하기 위한 뼈대를 만드는 것이다. 코드를 한 줄도 짜기 전에 프로젝트 구조, 환경변수, 데이터베이스가 준비되어 있어야 한다.

---

###[x] TASK-001 · Next.js 프로젝트 초기화

**무엇을 만드는가**

Next.js 14 App Router 기반의 프로젝트를 생성하고, TypeScript와 Tailwind CSS v3가 올바르게 설정된 상태로 만든다. 이 프로젝트가 EverPet 전체 웹 서비스의 기반이 된다.

**구체적으로 해야 할 일**

`create-next-app`으로 프로젝트를 생성한다. 옵션은 TypeScript 사용, ESLint 사용, Tailwind CSS 사용, App Router 사용, src 디렉토리 사용으로 설정한다. 생성 후 불필요한 보일러플레이트(기본 페이지 내용, 기본 CSS)를 제거하고 깨끗한 상태로 만든다. `tsconfig.json`에서 `@/*` 경로 별칭이 `./src/*`를 가리키도록 확인한다. `tailwind.config.ts`의 content 경로가 `./src/**/*.{ts,tsx}`를 포함하는지 확인한다.

**완료 기준**

`npm run dev`를 실행했을 때 빈 페이지가 에러 없이 뜨면 완료다.

```
ref: TRD v2.1 §2.1 (프론트엔드 기술 스택)
```

---

###[x] TASK-002 · 환경변수 파일 구성

**무엇을 만드는가**

`.env.local` 파일에 서비스 전체에서 사용할 환경변수를 정의하고, `.env.example` 파일로 팀 공유용 템플릿을 만든다. `.env.local`은 `.gitignore`에 반드시 포함되어야 한다.

**구체적으로 해야 할 일**

아래 환경변수들을 빠짐없이 `.env.local`에 작성한다. 실제 값은 각 서비스에서 발급받아 채운다.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_URL=

KLING_API_KEY=
KLING_API_SECRET=
FAL_API_KEY=

ANTHROPIC_API_KEY=

TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.env.example`은 같은 키 목록에 값만 빈 문자열로 채워서 만든다. `.gitignore`에 `.env.local`이 포함되어 있는지 확인하고, 없으면 추가한다.

**완료 기준**

`.env.example`이 커밋되고, `.env.local`은 `.gitignore`에 의해 추적되지 않으면 완료다.

```
ref: TRD v2.1 §9 (개발 환경 설정)
```

---

###[x] TASK-003 · Supabase 프로젝트 연결 및 클라이언트 설정

**무엇을 만드는가**

Supabase 프로젝트를 생성하고, Next.js에서 Supabase를 사용하기 위한 클라이언트 파일들을 만든다. 서버 컴포넌트용 클라이언트와 클라이언트 컴포넌트용 클라이언트를 분리해서 구성한다.

**구체적으로 해야 할 일**

`npm install @supabase/supabase-js @supabase/ssr`을 실행한다. `src/lib/supabase/client.ts` 파일을 만들고, 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트를 `createBrowserClient`로 생성해 export한다. `src/lib/supabase/server.ts` 파일을 만들고, Next.js 서버 컴포넌트와 API Route에서 사용하는 클라이언트를 `createServerClient`와 `cookies()`를 이용해 생성한다. `src/middleware.ts`를 만들어 Supabase Auth 세션을 갱신하는 미들웨어를 설정한다. 미들웨어는 모든 경로에서 실행되도록 하되, `_next/static`, `_next/image`, `favicon.ico`는 제외한다.

**완료 기준**

서버 컴포넌트에서 `createServerSupabaseClient()`를 import해서 사용할 수 있고, 클라이언트 컴포넌트에서 `createBrowserSupabaseClient()`를 import해서 사용할 수 있으면 완료다.

```
ref: TRD v2.1 §2.2 (백엔드/인프라 — Supabase)
```

---

###[x] TASK-004 · Supabase 데이터베이스 마이그레이션 실행

**무엇을 만드는가**

EverPet 서비스의 핵심 테이블 4개(`users`, `pet_profiles`, `media_assets`, `generation_requests`)를 Supabase에 생성하고, 각 테이블에 Row Level Security(RLS) 정책을 적용한다.

**구체적으로 해야 할 일**

Supabase 대시보드의 SQL Editor 또는 Supabase CLI를 사용해 아래 순서로 SQL을 실행한다.

첫째, `users` 테이블을 만든다. Supabase Auth의 `auth.users`를 참조하는 테이블로, `id`는 `auth.users(id)`를 외래키로 하는 UUID 기본키다. `email`, `display_name`, `data_training_consent`(boolean, 기본값 false), `tos_version`, `created_at`, `updated_at` 컬럼을 포함한다.

둘째, `pet_profiles` 테이블을 만든다. `id`(UUID, 기본키), `owner_id`(users.id 외래키, NOT NULL), `pet_name`(text, NOT NULL), `species`(text, 기본값 'dog'), `breed`, `body_type`, `coat_color_hex`(text 배열, 기본값 빈 배열), `age_group`, `energy_level`, `personality_tags`(text 배열, 기본값 빈 배열), `is_deceased`(boolean, 기본값 false), `deceased_at`, `created_at`, `updated_at` 컬럼을 포함한다.

셋째, `media_assets` 테이블을 만든다. `id`(UUID, 기본키), `owner_id`(users.id 외래키), `pet_id`(pet_profiles.id 외래키, nullable), `r2_key_original`, `r2_key_bg_removed`, `r2_key_rimlight`, `r2_key_video_web`, `r2_key_video_holo`, `r2_key_thumbnail`, `media_type`, `original_width`(integer), `original_height`(integer), `quality_level`, `processing_status`(기본값 'raw'), `created_at` 컬럼을 포함한다.

넷째, `generation_requests` 테이블을 만든다. `id`(UUID, 기본키), `user_id`, `pet_id`, `input_media_id`, `output_media_id`(nullable), `mood_preset`, `generated_prompt`(text), `behavior_snapshot`(jsonb), `model_provider`(기본값 'kling'), `model_version`, `status`(기본값 'pending'), `progress`(integer, 기본값 0), `error_message`(nullable), `generation_time_sec`(float, nullable), `credit_cost`(integer, nullable), `created_at`, `completed_at`(nullable) 컬럼을 포함한다.

마지막으로 RLS를 활성화하고 정책을 설정한다. `pet_profiles`는 `owner_id = auth.uid()`인 행만 본인이 조회·수정·삭제할 수 있도록 한다. `media_assets`도 마찬가지로 `owner_id = auth.uid()`인 행만 접근 가능하도록 한다. `generation_requests`는 `user_id = auth.uid()`인 행만 접근 가능하도록 한다.

**완료 기준**

Supabase 대시보드 Table Editor에서 4개 테이블이 모두 보이고, 각 테이블의 RLS가 활성화(초록 방패 아이콘)되어 있으면 완료다.

```
ref: TRD v2.1 §6 (데이터베이스 핵심 테이블)
     ERD v1.0 §2 (엔티티 상세 명세)
```

---

###[x] TASK-005 · Cloudflare R2 버킷 및 접근 설정

**무엇을 만드는가**

Cloudflare R2에 EverPet 전용 버킷을 만들고, Next.js 서버에서 파일을 업로드·다운로드할 수 있도록 API 클라이언트를 구성한다.

**구체적으로 해야 할 일**

Cloudflare 대시보드에서 R2 버킷을 생성한다. 버킷 이름은 `everpet-media`로 한다. API 토큰을 생성하고 R2에 대한 읽기/쓰기 권한을 부여한다. 발급받은 `Account ID`, `Access Key`, `Secret Key`를 `.env.local`에 저장한다.

`npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`를 설치한다. R2는 S3 호환 API를 사용하므로 AWS SDK를 그대로 쓸 수 있다. `src/lib/r2.ts` 파일을 만들고 S3Client를 R2 엔드포인트(`https://{account_id}.r2.cloudflarestorage.com`)로 초기화한다. 파일 업로드 함수(`uploadToR2`), 서명된 다운로드 URL 발급 함수(`getSignedDownloadUrl`, 만료 1시간), 파일 삭제 함수(`deleteFromR2`)를 작성한다.

R2 버킷의 폴더 구조는 아래 규칙을 따른다: `pets/{pet_id}/originals/`, `pets/{pet_id}/processed/`, `pets/{pet_id}/videos/`, `pets/{pet_id}/thumbnails/`.

**완료 기준**

테스트용 이미지 파일을 `uploadToR2`로 업로드하고, `getSignedDownloadUrl`로 URL을 받아서 브라우저에서 열었을 때 이미지가 보이면 완료다.

```
ref: TRD v2.1 §3.2 (사진 저장 구조 — Cloudflare R2)
     TRD v2.1 §8.2 (보안 — 서명된 R2 URL)
```

---

## Phase 1 — 인증 및 사용자 관리

Phase 1의 목표는 보호자가 서비스에 가입하고 로그인할 수 있는 흐름을 완성하는 것이다. 30초 이내 가입이라는 UX 목표가 있다.

---

###[x] TASK-101 · 이메일 회원가입 및 로그인 API

**무엇을 만드는가**

이메일과 비밀번호로 회원가입하고 로그인하는 Next.js API Route를 만든다. Supabase Auth를 사용한다.

**구체적으로 해야 할 일**

`src/app/api/auth/signup/route.ts`를 만든다. POST 요청을 받아 `email`과 `password`를 추출한다. Supabase Auth의 `signUp` 메서드를 호출한다. 가입 성공 시 `users` 테이블에 해당 사용자의 행을 추가한다(`id`는 Supabase Auth가 반환한 user.id와 동일하게). `tos_version`은 현재 날짜 기반 버전 문자열(`"TOS-2026-01"`)로 저장한다. 성공 응답으로 `{ success: true, userId: string }`을 반환한다. 실패 시 적절한 HTTP 상태 코드와 에러 메시지를 반환한다.

`src/app/api/auth/login/route.ts`를 만든다. POST 요청을 받아 `email`과 `password`로 Supabase Auth의 `signInWithPassword`를 호출한다. 성공 시 세션 쿠키가 자동으로 설정된다. 로그인 실패 시(잘못된 이메일/비밀번호) 401 상태로 응답한다.

`src/app/api/auth/logout/route.ts`를 만든다. POST 요청을 받아 Supabase Auth의 `signOut`을 호출하고 세션 쿠키를 제거한다.

**완료 기준**

curl 또는 Postman으로 가입 → 로그인 → 로그아웃 순서로 호출했을 때 모두 성공 응답이 오면 완료다.

```
ref: PRD v2.1 §5 US-01 (웹 브라우저에서 30초 이내 가입)
     TRD v2.1 §5.1 (API 엔드포인트 목록)
```

---

###[x] TASK-102 · 카카오 소셜 로그인 연동

**무엇을 만드는가**

카카오 계정으로 1클릭 로그인이 가능한 OAuth 흐름을 구현한다. Supabase Auth의 소셜 로그인 기능을 사용한다.

**구체적으로 해야 할 일**

Kakao Developers에서 애플리케이션을 등록하고 `REST API 키`와 `Client Secret`을 발급받는다. Supabase 대시보드 > Authentication > Providers에서 Kakao를 활성화하고 발급받은 키를 입력한다. Redirect URL을 `https://{supabase-project}.supabase.co/auth/v1/callback`으로 설정한다.

`src/app/api/auth/kakao/route.ts`를 만든다. GET 요청을 받으면 Supabase Auth의 `signInWithOAuth({ provider: 'kakao' })`를 호출하고, 반환된 URL로 리다이렉트한다. 로컬 개발 환경에서는 `redirectTo`를 `http://localhost:3000/auth/callback`으로, 프로덕션에서는 실제 도메인으로 설정한다.

`src/app/auth/callback/route.ts`를 만든다. Supabase가 OAuth 인증 완료 후 이 URL로 리다이렉트한다. 쿼리 파라미터의 `code`를 받아서 `exchangeCodeForSession`을 호출해 세션을 완성한다. 첫 로그인인 경우 `users` 테이블에 행을 추가한다. 완료 후 홈 페이지(`/`)로 리다이렉트한다.

**완료 기준**

카카오 로그인 버튼을 클릭하면 카카오 인증 화면으로 이동하고, 인증 완료 후 홈 화면으로 돌아오면 완료다.

```
ref: PRD v2.1 §5 US-01 (카카오 가입 30초 이내)
     PRD v2.1 §7 SCR-02 (회원가입/로그인 화면)
```

---

###[x] TASK-103 · 인증 상태 관리 및 보호 라우트 설정

**무엇을 만드는가**

로그인하지 않은 사용자가 보호된 페이지에 접근하면 로그인 페이지로 리다이렉트하는 미들웨어를 완성한다. 로그인한 사용자가 로그인 페이지에 접근하면 홈으로 리다이렉트한다.

**구체적으로 해야 할 일**

TASK-003에서 만든 `src/middleware.ts`를 확장한다. 세션이 없는 사용자가 `/dashboard`, `/pets`, `/generate`, `/videos`, `/settings` 경로에 접근하면 `/login`으로 리다이렉트한다. 세션이 있는 사용자가 `/login`, `/signup` 경로에 접근하면 `/dashboard`로 리다이렉트한다. 랜딩 페이지(`/`), 인증 콜백(`/auth/callback`)은 보호 없이 허용한다.

`src/hooks/useUser.ts` 훅을 만든다. 현재 로그인한 사용자 정보를 Zustand store에서 가져오는 훅이다. `user`, `isLoading`, `isLoggedIn` 값을 반환한다.

**완료 기준**

로그인하지 않은 상태에서 `/dashboard`에 직접 접근하면 `/login`으로 이동하고, 로그인한 상태에서 `/login`에 접근하면 `/dashboard`로 이동하면 완료다.

```
ref: TRD v2.1 §8.2 (보안 — RLS)
     PRD v2.1 §1 (플랫폼 전략 — 반응형 웹)
depends on: TASK-003, TASK-101
```

---

## Phase 2 — 반려동물 프로필 관리

Phase 2의 목표는 보호자가 우리 아이의 정보를 등록하는 흐름을 완성하는 것이다. 특히 행동 특성 입력이 이 단계의 핵심이다. 행동 특성은 나중에 AI 프롬프트 변환의 재료가 된다.

---

###[x] TASK-201 · 반려동물 프로필 CRUD API

**무엇을 만드는가**

반려동물 프로필을 생성·조회·수정·삭제하는 API Route 4개를 만든다.

**구체적으로 해야 할 일**

`src/app/api/pets/route.ts`를 만든다. GET 메서드는 현재 로그인한 사용자의 반려동물 목록을 `pet_profiles` 테이블에서 조회해 반환한다. POST 메서드는 요청 body에서 `pet_name`, `species`, `breed`, `body_type`, `coat_color_hex`, `age_group`, `energy_level`, `personality_tags`, `is_deceased`, `deceased_at`을 받아 `pet_profiles` 테이블에 저장한다. `owner_id`는 JWT에서 추출한 현재 사용자 ID를 사용한다.

`src/app/api/pets/[id]/route.ts`를 만든다. GET 메서드는 특정 pet_id의 프로필을 조회한다. PUT 메서드는 해당 반려동물 프로필을 업데이트한다. DELETE 메서드는 프로필을 삭제한다. 모든 메서드에서 해당 반려동물의 `owner_id`가 현재 사용자 ID와 일치하는지 확인한다. 일치하지 않으면 403을 반환한다.

모든 API에서 서버 사이드 Supabase 클라이언트를 사용하고, JWT 검증은 Supabase의 `getUser()`로 처리한다.

**완료 기준**

Postman으로 반려동물 생성 → 조회 → 수정 → 삭제 순서로 호출이 모두 성공하면 완료다. 다른 사용자의 반려동물에 접근 시 403이 반환되어야 한다.

```
ref: PRD v2.1 §5 US-02 (행동 특성 직접 선택)
     TRD v2.1 §6.1 (pet_profiles 테이블)
     TRD v2.1 §5.1 (API 엔드포인트 — POST /api/pets, PUT /api/pets/:id)
depends on: TASK-004, TASK-101
```

---

###[x] TASK-202 · 반려동물 등록 화면 UI (SCR-04)

**무엇을 만드는가**

보호자가 반려동물의 기본 정보와 행동 특성을 입력하는 웹 페이지를 만든다. PRD에서 정의한 SCR-04 화면이다. 이 화면이 EverPet의 핵심 차별화 지점이다.

**구체적으로 해야 할 일**

`src/app/pets/new/page.tsx`를 만든다. 페이지는 세 개의 섹션으로 구성된다.

첫 번째 섹션은 기본 정보다. 반려동물 이름 텍스트 입력 필드(필수), 품종 검색 자동완성 입력 필드(한글/영문 모두 검색 가능, 필수), 체형 선택 버튼 그룹(소형/중형/대형, 필수), 나이 선택 버튼 그룹(퍼피/성견/노견), 성별 선택 버튼 그룹(남아/여아)을 배치한다.

두 번째 섹션은 행동 특성 입력이다. 섹션 제목은 "우리 아이는 어떤 아이였나요?"로 한다. 에너지 레벨 라디오 버튼 3개("항상 신나있고 활발했어요", "보통이었어요", "조용하고 차분했어요")를 배치한다. 성격 키워드 체크박스 8개를 카드 형태로 배치한다. 각 카드에는 아이콘과 함께 "꼬리를 엄청 세게 흔들었어요", "항상 졸졸 따라다녔어요" 등 PRD에서 정의한 8가지 문구를 표시한다. 최대 3개까지만 선택되도록 하고, 3개가 이미 선택된 상태에서 다른 카드를 선택하려 하면 "최대 3개까지 선택할 수 있어요"라는 토스트 메시지를 보여준다.

세 번째 섹션은 무지개다리 정보다. "무지개다리를 건넜어요" 토글 스위치와, 토글이 켜지면 나타나는 기일 날짜 입력 필드를 배치한다.

폼 하단에 "등록 완료" 버튼을 배치한다. 버튼을 누르면 TASK-201의 POST API를 호출하고, 성공 시 홈 대시보드(`/dashboard`)로 이동한다.

**완료 기준**

에너지 레벨 선택, 성격 키워드 3개 선택, 4개째 선택 시 토스트 표시가 모두 정상 동작하고, 등록 완료 후 대시보드로 이동하면 완료다.

```
ref: PRD v2.1 §3.2 (반려동물 기본 정보 입력)
     PRD v2.1 §3.3 (행동 특성 입력 — Step 1, 2)
     PRD v2.1 §7 SCR-04
     TRD v2.1 §3.3 (PetBehaviorProfile 타입 정의)
depends on: TASK-201
```

---

###[x] TASK-203 · 품종 검색 자동완성 컴포넌트

**무엇을 만드는가**

사용자가 품종 이름을 타이핑하면 일치하는 품종 목록이 드롭다운으로 나타나는 자동완성 컴포넌트를 만든다. 한글과 영문 모두 검색 가능해야 한다.

**구체적으로 해야 할 일**

`src/data/breeds.ts` 파일을 만들고, 주요 견종 100개 이상의 목록을 한글명과 영문명 쌍으로 정의한다. 예: `{ ko: '말티즈', en: 'Maltese' }`. 검색은 한글 또는 영문 중 하나가 입력된 문자열을 포함하면 결과에 나타나도록 한다.

`src/components/BreedSearchInput.tsx` 컴포넌트를 만든다. 텍스트 입력 필드와 드롭다운 목록으로 구성한다. 사용자가 2글자 이상 입력하면 매칭되는 품종 목록을 최대 8개까지 드롭다운으로 표시한다. 드롭다운 항목을 클릭하면 해당 품종이 선택되고 영문명이 내부적으로 저장된다(API 전송 시 영문명 사용). 선택 후 입력 필드에는 한글명이 표시된다. ESC 키나 외부 클릭 시 드롭다운이 닫힌다. Props는 `value`, `onChange`, `placeholder`를 받는다.

**완료 기준**

"말티"를 입력하면 "말티즈"가 드롭다운에 나타나고, "malt"를 입력해도 "말티즈"가 나타나면 완료다.

```
ref: PRD v2.1 §3.2 (품종 — 검색 자동완성, 한글/영문 모두)
     TRD v2.1 §3.3 (PetBehaviorProfile — breed: string)
depends on: TASK-202
```

---

##[x] Phase 3 — 사진 업로드 파이프라인

Phase 3의 목표는 보호자가 사진을 올리면 유효성 검사와 품질 피드백이 이루어지고, 파일이 R2에 안전하게 저장되는 흐름을 완성하는 것이다.

---

###[x] TASK-301 · 사진 업로드 API

**무엇을 만드는가**

JPG/PNG 사진을 받아서 유효성을 검사하고 Cloudflare R2에 저장한 뒤, 해상도 기반 품질 피드백을 반환하는 API를 만든다.

**구체적으로 해야 할 일**

`src/app/api/upload/photo/route.ts`를 만든다. POST 요청으로 `multipart/form-data` 형식의 파일과 `petId`를 받는다.

서버 사이드에서 아래 순서로 처리한다. 첫째, 파일의 실제 MIME 타입을 magic bytes로 확인한다(`file-type` 라이브러리 사용). JPEG/PNG가 아니면 400으로 응답하고 `"JPG 또는 PNG 파일만 올릴 수 있어요"` 메시지를 반환한다. 둘째, 파일 크기가 10MB를 초과하면 400으로 응답하고 `"10MB 이하 사진을 올려주세요"` 메시지를 반환한다. 셋째, `sharp` 라이브러리로 이미지 메타데이터를 읽어 width와 height를 추출한다. 넷째, 아래 로직으로 품질 피드백을 계산한다: 단변(width, height 중 작은 값)이 2048 이상이면 'great', 1024 이상이면 'ok', 512 이상이면 'low', 512 미만이면 'too_low'. 다섯째, R2에 `pets/{petId}/originals/{timestamp}_{uuid}.jpg` 경로로 업로드한다. 여섯째, `media_assets` 테이블에 행을 추가한다. 일곱째, `{ mediaId, previewUrl, qualityFeedback }` 형태로 응답한다. `previewUrl`은 R2 서명 URL(1시간 만료)이다.

**완료 기준**

2K 이상 JPG를 업로드하면 `qualityFeedback.level === 'great'`이 반환되고, R2 버킷에 파일이 저장되면 완료다.

```
ref: PRD v2.1 §3.1 (필수 입력 — 사진, 유효성 검사 규칙)
     TRD v2.1 §3.1 (사진 업로드 유효성 검사)
     TRD v2.1 §3.2 (사진 저장 구조)
     TRD v2.1 §5.2 (POST /api/upload/photo 상세)
depends on: TASK-004, TASK-005
```

---

###[x] TASK-302 · 사진 업로드 드롭존 UI (SCR-05 일부)

**무엇을 만드는가**

드래그앤드롭 또는 클릭으로 사진을 선택할 수 있는 업로드 UI 컴포넌트를 만든다. 업로드 완료 후 2초 내에 미리보기와 품질 피드백이 표시되어야 한다.

**구체적으로 해야 할 일**

`npm install react-dropzone`을 실행한다. `src/components/PhotoUploadZone.tsx` 컴포넌트를 만든다. 기본 상태에서는 점선 테두리 안에 "여기에 사진을 끌어다 놓거나 클릭해서 선택하세요"라는 안내 문구와 이미지 아이콘이 표시된다. "JPG, PNG 최대 10MB · 2K 이상 권장"이라는 서브텍스트도 표시한다.

파일이 드롭되거나 선택되면 즉시 클라이언트 사이드 1차 검사(포맷, 크기)를 수행한다. 1차 검사 통과 시 TASK-301의 업로드 API를 호출한다. 업로드 중에는 진행률 바를 표시한다. 업로드 완료 후 2초 이내에 미리보기 이미지와 품질 피드백 뱃지를 표시한다. 'great'면 초록색 "선명한 사진이에요 👍", 'ok'면 노란색 "괜찮아요. 더 선명하면 더 좋아요", 'low'나 'too_low'면 주황색으로 해당 메시지를 표시한다.

에러 발생 시(포맷 오류, 크기 초과) 드롭존 테두리가 빨간색으로 바뀌고 에러 메시지가 표시된다. Props는 `petId`, `onUploadComplete(mediaId: string)` 콜백을 받는다.

**완료 기준**

2K JPG를 드롭했을 때 2초 안에 미리보기와 "선명한 사진이에요 👍" 뱃지가 나타나면 완료다.

```
ref: PRD v2.1 §3.1 (업로드 품질 피드백 실시간)
     PRD v2.1 §5 US-03 (업로드 후 2초 내 미리보기)
     PRD v2.1 §7 SCR-05
     TRD v2.1 §3.1 (getQualityFeedback 로직)
depends on: TASK-301
```

---

## Phase 4 — AI 영상 생성 파이프라인

Phase 4가 EverPet의 기술적 핵심이다. 사진과 행동 특성을 받아서 실제로 영상을 만들어내는 백엔드 파이프라인을 완성한다.

---

###[x] TASK-401 · 행동 특성 → 프롬프트 변환 엔진

**무엇을 만드는가**

보호자가 입력한 행동 특성(에너지 레벨, 성격 키워드)과 무드를 받아서 Kling AI에 전달할 영어 프롬프트를 생성하는 함수를 만든다. 1단계 규칙 기반 변환과 2단계 Claude API 세련화의 두 단계로 구성된다.

**구체적으로 해야 할 일**

`src/lib/promptEngine.ts` 파일을 만든다.

1단계로 규칙 기반 파라미터 추출 함수 `extractMotionParams`를 작성한다. 입력으로 `PetBehaviorProfile`(품종, 체형, 털색, 나이, 에너지, 성격 키워드)과 `MoodPreset`을 받는다. 아래 매핑 규칙을 적용한다: `tail_wag_strong` 태그가 있으면 꼬리 묘사에 "vigorously"를 사용하고 없으면 "gently"를 사용한다. `energy`가 'high'면 자세를 "forward-leaning, excited"로, 'low'면 "relaxed, calm"으로 설정한다. `mood`가 'active'면 이동을 "trotting, bouncing"으로, 'cozy'면 "lying down, resting"으로, 'calm'이면 "sitting quietly, serene"으로 설정한다. `follow_owner` 태그가 있으면 "facing owner eagerly"를 추가한다.

2단계로 Claude API 호출 함수 `generatePromptWithClaude`를 작성한다. `@anthropic-ai/sdk`를 설치하고 사용한다. 시스템 프롬프트는 "당신은 반려동물 AI 영상 생성 프롬프트 전문가입니다. 주어진 파라미터를 Kling AI image-to-video에 최적화된 영어 프롬프트로 변환하세요. 반드시 120토큰 이내로 작성하고, 배경은 항상 pure black, hologram display optimized를 명시하세요."로 설정한다. 1단계에서 추출한 파라미터와 반려동물 기본 정보를 사용자 메시지로 전달한다.

최종 함수 `buildGenerationPrompt(profile, mood)`를 export한다. 이 함수가 1단계 → 2단계 순으로 실행해 최종 프롬프트 문자열을 반환한다.

**완료 기준**

말티즈(소형, 흰색, 성견, 에너지 high, 태그 [tail_wag_strong, follow_owner], 무드 active)를 입력했을 때 120토큰 이내의 영어 프롬프트가 반환되고, 내용에 "Maltese", "white", "vigorously", "black background"가 포함되면 완료다.

```
ref: PRD v2.1 §3.3 (프롬프트 변환 예시)
     TRD v2.1 §3.3 (행동 특성 → 프롬프트 변환 엔진 전체)
depends on: TASK-002 (ANTHROPIC_API_KEY)
```

---

###[x] TASK-402 · 이미지 전처리 파이프라인 (STEP 1~3)

**무엇을 만드는가**

R2에 저장된 원본 사진을 받아서 배경 제거, 림라이트 추가, 깊이 추정을 순서대로 실행하는 Python 스크립트를 만든다. 이 스크립트는 Railway에서 실행된다.

**구체적으로 해야 할 일**

Railway에 Python 서비스를 만든다. `requirements.txt`에 `rembg`, `Pillow`, `numpy`, `boto3`(R2 접근용), `requests`를 추가한다.

`pipeline/preprocess.py` 파일을 만든다. 함수 `preprocess_image(pet_id, media_id, r2_original_key)`를 작성한다.

STEP 1(배경 제거): R2에서 원본 이미지를 다운로드한다. `rembg`의 `remove` 함수로 배경을 제거해 투명 PNG를 만든다. 결과를 `pets/{pet_id}/processed/{media_id}_bg_removed.png`로 R2에 업로드한다. `media_assets` 테이블의 `r2_key_bg_removed` 컬럼을 업데이트한다.

STEP 2(림라이트): 배경 제거된 PNG를 불러온다. 피사체의 알파 채널 마스크를 기반으로 외곽선을 감지한다. 외곽선 주변에 부드러운 흰빛 글로우 효과를 적용한다(Gaussian blur + 밝기 부스트). 결과를 `pets/{pet_id}/processed/{media_id}_rimlight.png`로 R2에 업로드한다. `r2_key_rimlight` 컬럼을 업데이트한다.

STEP 3(깊이 추정): `Depth Anything v2` 모델을 사용한다. 림라이트 이미지를 입력으로 받아 깊이 맵을 생성한다. 깊이 맵은 다음 단계인 Kling AI 호출 시 참고 데이터로 사용된다(직접 전달하지 않고 메타데이터로 저장). `media_assets`의 `processing_status`를 'processed'로 업데이트한다.

이 함수가 성공적으로 완료되면 HTTP POST로 Next.js의 내부 콜백 엔드포인트(`/api/internal/preprocess-done`)를 호출해 다음 단계를 트리거한다.

**완료 기준**

테스트 이미지로 함수를 실행했을 때 R2에 `_bg_removed.png`와 `_rimlight.png` 파일이 생성되고, DB의 `processing_status`가 'processed'로 업데이트되면 완료다.

```
ref: TRD v2.1 §4.1 STEP 1~3 (배경 제거, 림라이트, 깊이 추정)
     PRD v2.1 §6 (생성 플로우 — 사진 준비 중 ~10초)
depends on: TASK-301, TASK-005
```

---

###[x] TASK-403 · Kling AI 영상 생성 연동 (STEP 5)

**무엇을 만드는가**

전처리된 이미지와 프롬프트를 Kling AI API에 전달해 영상을 생성하고, 생성 완료를 확인하는 함수를 만든다. Kling AI 실패 시 Fal.ai로 자동 전환되어야 한다.

**구체적으로 해야 할 일**

`src/lib/videoGenerators/kling.ts` 파일을 만든다. Kling AI API는 JWT 인증을 사용한다. `KLING_API_KEY`와 `KLING_API_SECRET`으로 JWT를 생성한다. JWT 페이로드는 `{ iss: KLING_API_KEY, exp: now + 1800, nbf: now - 5 }` 형태다. 서명 알고리즘은 HS256을 사용한다.

함수 `klingGenerate(rimlightImageUrl, prompt)`를 작성한다. Kling AI의 `image-to-video` 엔드포인트를 호출한다. 입력 이미지는 R2의 서명된 URL을 직접 전달한다. 응답으로 `task_id`를 받는다. 이후 `klingCheckStatus(taskId)` 함수로 완료 여부를 확인한다. 완료된 영상의 다운로드 URL을 반환한다.

`src/lib/videoGenerators/fal.ts` 파일을 만든다. `@fal-ai/client`를 설치한다. 함수 `falGenerate(rimlightImageUrl, prompt)`를 작성한다. Fal.ai의 적절한 image-to-video 모델을 사용한다. 완료된 영상 URL을 반환한다.

`src/lib/videoGenerators/index.ts` 파일을 만든다. `generateVideo(rimlightImageUrl, prompt)` 함수를 export한다. 내부적으로 Kling AI를 먼저 시도하고, 실패하면 Fal.ai로 자동 전환한다.

**완료 기준**

테스트 이미지와 프롬프트로 `generateVideo`를 호출했을 때 영상 URL이 반환되면 완료다. Kling AI의 API 키가 잘못된 경우에도 Fal.ai가 실행되어 영상이 생성되어야 한다.

```
ref: TRD v2.1 §4.1 STEP 5 (영상 생성 — Kling AI, Fal.ai 폴백)
     TRD v2.1 §7.1 (Kling → Fal.ai 자동 전환 코드)
depends on: TASK-002 (KLING_API_KEY, FAL_API_KEY), TASK-402
```

---

###[x] TASK-404 · FFmpeg 인코딩 (STEP 6)

**무엇을 만드는가**

Kling AI가 생성한 원본 영상을 받아서 웹용 1920×1080 MP4, 홀로그램용 1080×1080 MP4, 썸네일 JPG 세 가지 파일로 변환하는 스크립트를 만든다.

**구체적으로 해야 할 일**

Railway의 Python 서비스에 `ffmpeg-python` 라이브러리를 추가한다. `pipeline/encode.py` 파일을 만든다.

함수 `encode_video(generation_request_id, input_video_url)`를 작성한다. 입력 영상 URL에서 파일을 다운로드한다. FFmpeg으로 세 가지 출력을 생성한다.

웹용 변환 명령은 아래와 같다: 해상도 1920×1080, 원본 비율을 유지하면서 부족한 부분은 검정으로 패딩, H.264 코덱, CRF 20, 오디오 제거.

홀로그램용 변환 명령은 아래와 같다: 해상도 1080×1080, 같은 방식으로 패딩, 검정 배경 유지.

썸네일 추출 명령은 아래와 같다: 영상의 1초 지점에서 프레임 추출, 400×400으로 리사이즈, 검정 패딩.

세 파일을 각각 R2에 업로드한다. `media_assets` 테이블의 `r2_key_video_web`, `r2_key_video_holo`, `r2_key_thumbnail` 컬럼을 업데이트한다. `generation_requests` 테이블의 `status`를 'done'으로, `completed_at`을 현재 시각으로 업데이트한다. Next.js의 `/api/internal/generation-done` 콜백을 호출해 완료를 알린다.

**완료 기준**

테스트 영상으로 실행했을 때 R2에 1920×1080 MP4, 1080×1080 MP4, 400×400 JPG 세 파일이 생성되면 완료다.

```
ref: TRD v2.1 §4.1 STEP 6 (홀로그램 인코딩)
     TRD v2.1 §4.2 (FFmpeg 인코딩 명령어)
     TRD v2.1 §4.3 (출력 스펙 — 1920×1080, 1080×1080, 400×400)
     PRD v2.1 §4.1 (출력 데이터 스펙)
depends on: TASK-403
```

---

###[x] TASK-405 · 영상 생성 요청 API 및 상태 관리

**무엇을 만드는가**

프론트엔드에서 영상 생성을 요청하고, 진행 상태를 폴링으로 확인하는 두 개의 API Route를 만든다. 생성 요청이 들어오면 파이프라인을 트리거하고, 각 단계 완료마다 DB 상태를 업데이트한다.

**구체적으로 해야 할 일**

`src/app/api/generate/route.ts`를 만든다. POST 요청으로 `petId`, `mediaId`, `mood`를 받는다. 먼저 해당 사용자의 이번 달 구독 한도를 확인한다. 한도 초과 시 429를 반환하고 `"이번 달 생성 횟수를 모두 사용했어요"` 메시지를 전달한다. 한도 내라면 `generation_requests` 테이블에 새 행을 추가하고 `status`를 'pending'으로 설정한다. Railway의 파이프라인 시작 엔드포인트를 비동기로 호출한다. 응답으로 `{ requestId, estimatedSeconds: 180, status: 'pending' }`을 반환한다.

`src/app/api/generate/[id]/status/route.ts`를 만든다. GET 요청으로 `requestId`를 받는다. `generation_requests` 테이블에서 해당 행을 조회한다. 해당 요청이 현재 사용자의 것인지 확인한다. `status`, `progress`, 그리고 상태별 감성 문구 `stepLabel`을 반환한다. `status`가 'done'이면 `videoUrl`(R2 서명 URL, 1시간 만료)과 `thumbnailUrl`도 함께 반환한다. `status`가 'failed'이면 `errorMessage`를 반환한다.

`src/app/api/internal/preprocess-done/route.ts`와 `src/app/api/internal/generation-done/route.ts`를 만든다. 이 두 엔드포인트는 Railway 파이프라인이 각 단계 완료 시 호출하는 내부 콜백이다. `x-internal-secret` 헤더로 인증한다(환경변수 `INTERNAL_SECRET`). 각각 `generation_requests` 테이블의 `status`와 `progress`를 업데이트한다.

**완료 기준**

생성 요청 API를 호출하면 `requestId`가 반환되고, 3초마다 상태 API를 폴링하면 `pending → preprocessing → generating → encoding → done` 순서로 상태가 변하면 완료다.

```
ref: TRD v2.1 §4.4 (생성 상태 관리 — GenerationStatus 타입)
     TRD v2.1 §5.1, §5.2 (POST /api/generate, GET /api/generate/:id/status)
     PRD v2.1 §5 US-05 (3분 대기 — 빈 화면 아닌 진행 표시)
depends on: TASK-201, TASK-301, TASK-401, TASK-402, TASK-403, TASK-404
```

---

## Phase 5 — 영상 생성 UI 및 보관함

Phase 5의 목표는 보호자가 실제로 사용하는 화면들을 완성하는 것이다. 영상 만들기 화면, 생성 중 화면, 완료 화면, 보관함 화면이 포함된다.

---

###[x] TASK-501 · 영상 만들기 화면 (SCR-05)

**무엇을 만드는가**

사진 업로드와 무드 선택을 한 화면에서 진행하는 페이지를 만든다. PRD의 SCR-05다.

**구체적으로 해야 할 일**

`src/app/generate/page.tsx`를 만든다. 페이지 상단에 TASK-302에서 만든 `PhotoUploadZone` 컴포넌트를 배치한다. 사진이 업로드 완료된 후에만 무드 선택 섹션이 나타나도록 한다. 무드 선택 섹션 제목은 "오늘 밤 어떤 모습으로 만날까요?"로 한다. 무드 카드 3개를 가로로 배치한다. 각 카드는 아이콘, 무드 이름("포근한", "활발한", "조용한"), 짧은 설명("쉬거나 옆에 있는 모습", "뛰거나 신나게 노는 모습", "멀리서 바라보는 차분한 모습")으로 구성한다. 카드 선택 시 테두리와 배경색이 바뀌어 선택 상태가 강조된다.

사진 업로드 완료 AND 무드 선택 완료 시 "생성 시작" 버튼이 활성화된다. 버튼을 누르면 TASK-405의 생성 요청 API를 호출하고, `requestId`를 받아서 `/generate/[requestId]/progress` 페이지로 이동한다.

반려동물이 여러 마리인 경우 상단에 드롭다운으로 어느 아이의 영상을 만들지 선택할 수 있도록 한다.

**완료 기준**

사진 업로드 → 무드 선택 → 생성 시작 버튼 클릭 → 진행 화면으로 이동하는 흐름이 완성되면 완료다.

```
ref: PRD v2.1 §6 (영상 생성 플로우)
     PRD v2.1 §7 SCR-05
     PRD v2.1 §3.3 Step 3 (무드 선택)
depends on: TASK-302, TASK-405
```

---

###[x] TASK-502 · 생성 진행 화면 (SCR-06)

**무엇을 만드는가**

영상이 만들어지는 2~3분 동안 보호자가 볼 대기 화면을 만든다. 빈 로딩 화면이 아니라, 우리 아이 사진과 함께 감성적인 대기 경험을 제공해야 한다.

**구체적으로 해야 할 일**

`src/app/generate/[requestId]/progress/page.tsx`를 만든다. SWR을 사용해 3초마다 `/api/generate/{requestId}/status`를 폴링한다. 화면 중앙에 업로드한 반려동물 사진을 크게 표시한다. 사진 아래에 현재 단계에 맞는 감성 문구를 표시한다. 단계별 문구는 아래와 같다: `pending`일 때 "잠깐만요, 준비하고 있어요", `preprocessing`일 때 "사진 준비 중이에요", `generating`일 때 "[반려동물 이름]을 만들고 있어요 🐾", `encoding`일 때 "거의 다 됐어요!".

화면 하단에 3단계 프로그레스 바를 표시한다. 각 단계 점은 완료 시 채워진다. 예상 남은 시간을 "약 N분 남았어요" 형태로 표시한다.

`status`가 'done'으로 바뀌면 자동으로 `/generate/{requestId}/complete` 페이지로 이동한다. `status`가 'failed'로 바뀌면 에러 메시지("오늘은 만들기가 어렵네요. 크레딧은 돌려드릴게요")를 표시하고 "다시 시도하기" 버튼을 보여준다.

탭을 닫아도 완료 시 알림을 받을 수 있도록 이메일 알림 동의 여부를 물어보는 작은 배너를 표시한다.

**완료 기준**

생성 진행 중에 폴링이 동작하고, 각 상태 변화마다 문구와 프로그레스 바가 업데이트되면 완료다. 'done' 상태 수신 시 완료 화면으로 자동 이동해야 한다.

```
ref: PRD v2.1 §5 US-05 (3분 대기 중 빈 화면 방지)
     PRD v2.1 §7 SCR-06
     TRD v2.1 §4.4 (생성 상태별 감성 문구 표)
depends on: TASK-405, TASK-501
```

---

###[x] TASK-503 · 생성 완료 화면 (SCR-07)

**무엇을 만드는가**

완성된 영상을 전체화면으로 자동 재생하고, 다운로드·저장·공유 버튼을 제공하는 화면을 만든다.

**구체적으로 해야 할 일**

`src/app/generate/[requestId]/complete/page.tsx`를 만든다. 페이지가 로드되면 즉시 영상이 자동 재생된다. 영상은 루프 재생되고, 음소거 상태다. HTML5 `<video>` 태그를 사용하고 `autoPlay`, `loop`, `muted`, `playsInline` 속성을 설정한다.

영상 하단에 세 개의 버튼을 배치한다. 첫째 "다운로드" 버튼은 TASK-505의 다운로드 API를 호출해 서명된 URL을 받아 파일을 다운로드한다. 파일명은 `everpet_{반려동물이름}_{YYYYMMDD}.mp4` 형식이다. 둘째 "보관함에 저장" 버튼은 해당 영상이 이미 `generation_requests` 테이블에 저장되어 있으므로 보관함 페이지(`/videos`)로 이동하는 링크다. 셋째 "공유하기" 버튼은 카카오 공유 또는 링크 복사 옵션을 Sheet 형태로 표시한다.

화면 상단 좌측에 "다시 만들기" 버튼을 배치한다. 이 버튼을 누르면 같은 반려동물로 다시 `/generate` 페이지로 이동한다.

**완료 기준**

완료 화면 진입 시 영상이 자동 루프 재생되고, 다운로드 버튼 클릭 시 MP4 파일이 다운로드되면 완료다.

```
ref: PRD v2.1 §5 US-06 (1920×1080 MP4 다운로드)
     PRD v2.1 §6 (완료 — 다운로드/저장/공유 버튼)
     PRD v2.1 §7 SCR-07
depends on: TASK-502
```

---

###[x] TASK-504 · 영상 보관함 화면 (SCR-08)

**무엇을 만드는가**

보호자가 만든 영상을 모아보는 보관함 페이지를 만든다. 반려동물별 탭과 날짜순 썸네일 그리드로 구성된다.

**구체적으로 해야 할 일**

`src/app/videos/page.tsx`를 만든다. 페이지 상단에 반려동물별 탭을 배치한다. "전체" 탭과 각 반려동물 이름 탭이 있다. 탭 선택에 따라 해당 반려동물의 영상만 필터링해 표시한다.

영상은 썸네일 그리드로 표시한다. 각 썸네일은 400×400 JPG이고, 호버 시 반려동물 이름과 생성 날짜가 오버레이로 나타난다. 썸네일을 클릭하면 해당 영상이 모달에서 전체화면으로 재생된다. 모달에는 다운로드 버튼과 닫기 버튼이 있다.

`/api/videos` GET API를 만들어 현재 사용자의 `generation_requests` 중 `status`가 'done'인 항목을 최신순으로 반환한다. 각 항목에 반려동물 이름, 생성 날짜, 썸네일 URL을 포함한다.

Free 플랜 사용자는 최근 3개만 표시하고 나머지는 블러 처리한다. 블러된 썸네일 위에 "구독하면 모든 영상을 볼 수 있어요" 메시지와 업그레이드 버튼을 표시한다.

**완료 기준**

보관함 페이지에서 썸네일이 그리드로 표시되고, 클릭 시 모달에서 영상이 재생되면 완료다.

```
ref: PRD v2.1 §5 US-07 (보관함에서 언제든 다시 보기)
     PRD v2.1 §7 SCR-08
     PRD v2.1 §8 (Free 플랜 — 최근 3개만)
depends on: TASK-404 (썸네일 생성), TASK-405
```

---

###[x] TASK-505 · 영상 다운로드 API

**무엇을 만드는가**

영상의 서명된 다운로드 URL을 발급하는 API를 만든다. 플랜에 따라 워터마크 유무가 다르다.

**구체적으로 해야 할 일**

`src/app/api/videos/[id]/download/route.ts`를 만든다. GET 요청을 받아 해당 영상이 현재 사용자의 것인지 확인한다. `subscriptions` 테이블에서 현재 플랜을 확인한다. Premium 플랜이면 워터마크 없는 원본 영상의 서명 URL을 반환한다. Free나 Basic 플랜이면 워터마크가 삽입된 영상을 반환한다. 워터마크는 FFmpeg으로 영상 우하단에 "made with EverPet" 텍스트를 오버레이하는 방식으로 처리한다. 서명 URL의 만료는 1시간으로 설정한다.

워터마크 처리는 요청 시점에 실시간으로 처리하지 않고, 영상 생성 완료 시점(TASK-404)에 워터마크 버전도 미리 생성해 별도 R2 경로에 저장하는 방식을 권장한다.

**완료 기준**

Free 플랜 사용자가 다운로드하면 워터마크가 있는 영상이 다운로드되고, Premium 플랜 사용자는 워터마크 없는 영상이 다운로드되면 완료다.

```
ref: PRD v2.1 §8 (다운로드 — Free/Basic 워터마크, Premium 없음)
     PRD v2.1 §5 US-06 (1920×1080 MP4 다운로드)
     TRD v2.1 §5.1 (GET /api/videos/:id/download)
depends on: TASK-404, TASK-601
```

---

##[x] Phase 6 — 구독 및 결제

Phase 6의 목표는 TossPayments 정기결제를 연동하고, 플랜별 기능 제한을 적용하는 것이다.

---

###[x] TASK-601 · Supabase subscriptions 테이블 및 API

**무엇을 만드는가**

구독 플랜 정보를 저장하는 `subscriptions` 테이블을 만들고, 플랜 조회·변경·해지 API를 구현한다.

**구체적으로 해야 할 일**

`subscriptions` 테이블을 Supabase에 생성한다. `id`(UUID, 기본키), `user_id`(users.id 외래키, UNIQUE), `plan_type`('free', 'basic', 'premium'), `status`('active', 'paused', 'cancelled', 'expired'), `monthly_generation_limit`(integer), `monthly_generation_used`(integer, 기본값 0), `toss_billing_key`, `toss_order_id`, `current_period_start`(date), `current_period_end`(date), `cancelled_at`, `created_at`, `updated_at` 컬럼을 포함한다.

신규 회원가입 시 자동으로 Free 플랜 구독 행을 생성하는 로직을 TASK-101의 회원가입 API에 추가한다. Free 플랜의 `monthly_generation_limit`는 1로 설정한다. Basic은 4, Premium은 9999(무제한)로 설정한다.

`src/app/api/subscriptions/route.ts`를 만든다. GET은 현재 사용자의 구독 정보와 이번 달 사용량을 반환한다. DELETE는 구독 해지를 처리한다. `cancelled_at`을 현재 시각으로, `status`를 'cancelled'로 업데이트한다.

RLS 정책을 추가한다: `user_id = auth.uid()`인 행만 접근 가능.

**완료 기준**

신규 가입 후 `/api/subscriptions`를 GET 하면 Free 플랜 정보가 반환되면 완료다.

```
ref: PRD v2.1 §8 (구독 플랜 표)
     PRD v2.1 §5 US-12, US-13, US-15
     ERD v1.0 §2.8 (subscriptions 테이블)
depends on: TASK-004, TASK-101
```

---

###[x] TASK-602 · TossPayments 정기결제 연동

**무엇을 만드는가**

TossPayments의 자동결제(빌링키) 방식으로 Basic, Premium 플랜 구독을 처리한다.

**구체적으로 해야 할 일**

TossPayments 대시보드에서 테스트 키를 발급받아 `.env.local`에 저장한다. `npm install @tosspayments/tosspayments-sdk`를 설치한다.

`src/app/api/subscriptions/billing/route.ts`를 만든다. 빌링키 발급 흐름은 아래와 같다. 첫째, 프론트엔드에서 TossPayments SDK로 카드 등록 UI를 띄우고 `customerKey`(user_id)와 함께 빌링키 발급을 요청한다. 둘째, TossPayments가 `authKey`를 콜백으로 전달한다. 셋째, 서버에서 `authKey`와 `customerKey`로 빌링키 발급 API를 호출한다. 넷째, 발급받은 빌링키를 `subscriptions.toss_billing_key`에 저장한다.

최초 결제 및 매월 자동결제는 빌링키로 처리한다. 결제 성공 시 `subscriptions` 테이블의 `plan_type`, `status`, `current_period_start/end`를 업데이트한다.

웹훅 엔드포인트 `src/app/api/webhooks/toss/route.ts`를 만든다. TossPayments의 결제 완료, 결제 실패, 구독 취소 이벤트를 수신해 DB를 업데이트한다.

**완료 기준**

테스트 카드로 Basic 플랜 결제를 완료하면 `subscriptions.plan_type`이 'basic'으로 업데이트되고, `monthly_generation_limit`가 4로 설정되면 완료다.

```
ref: PRD v2.1 §5 US-13 (자동결제)
     PRD v2.1 §8 (구독 플랜)
     TRD v2.1 §2.2 (결제 — TossPayments)
depends on: TASK-601
```

---

###[x] TASK-603 · 구독 관리 화면 (SCR-09)

**무엇을 만드는가**

현재 플랜 정보, 이번 달 사용량, 플랜 변경, 구독 해지 기능을 포함하는 마이페이지 화면을 만든다.

**구체적으로 해야 할 일**

`src/app/settings/subscription/page.tsx`를 만든다. 현재 플랜 이름과 다음 결제일을 표시한다. 이번 달 사용량을 프로그레스 바로 표시한다("N회 사용 / N회 가능"). 플랜별 기능 비교표를 표시하고, 현재 플랜이 아닌 항목에 업그레이드 버튼을 배치한다. 업그레이드 버튼 클릭 시 TASK-602의 결제 플로우를 실행한다.

구독 해지 섹션은 페이지 하단에 눈에 잘 띄지 않는 위치에 배치한다. "구독 해지" 버튼 클릭 시 확인 모달을 보여준다. 모달에는 "해지하면 [현재 결제 주기 종료일]까지는 계속 이용할 수 있어요"라는 안내 문구를 표시한다. 확인 클릭 시 TASK-601의 해지 API를 호출하고 이메일 확인을 발송한다.

홈 대시보드에 이번 달 남은 생성 횟수를 표시하는 배너를 추가한다: "이번 달 N회 남았어요".

**완료 기준**

구독 관리 화면에서 현재 플랜과 사용량이 표시되고, 해지 버튼 → 확인 모달 → 해지 완료 흐름이 동작하면 완료다.

```
ref: PRD v2.1 §5 US-14 (남은 생성 횟수 표시)
     PRD v2.1 §5 US-15 (해지 3클릭 이내)
     PRD v2.1 §7 SCR-09
depends on: TASK-601, TASK-602
```

---

##[x] Phase 7 — 홈 대시보드 및 랜딩 페이지

Phase 7의 목표는 서비스의 첫인상을 완성하는 것이다. 랜딩 페이지는 보호자의 감정을 건드려야 한다.

---

###[x] TASK-701 · 홈 대시보드 (SCR-03)

**무엇을 만드는가**

로그인한 보호자가 가장 먼저 보는 대시보드 화면을 만든다.

**구체적으로 해야 할 일**

`src/app/dashboard/page.tsx`를 만든다. 상단에 이번 달 남은 생성 횟수를 나타내는 프로그레스 바를 배치한다("이번 달 N회 남았어요"). 등록된 반려동물 카드를 가로 스크롤 형태로 표시한다. 각 카드는 반려동물 대표 사진, 이름, 품종을 포함한다. 카드 클릭 시 해당 반려동물로 영상 만들기 페이지로 이동한다. 등록된 반려동물이 없으면 "아이를 등록해보세요" 빈 상태 화면을 표시하고 등록 버튼을 보여준다.

화면 우하단에 "영상 만들기" FAB(Floating Action Button)을 배치한다. 반려동물이 한 마리면 바로 해당 아이의 영상 만들기 페이지로 이동하고, 여러 마리면 선택 모달을 표시한다.

최근에 만든 영상 3개를 하단에 미리보기로 표시한다. "모두 보기" 링크로 보관함 페이지로 이동한다.

**완료 기준**

대시보드에서 반려동물 카드와 FAB가 표시되고, FAB 클릭 시 영상 만들기 페이지로 이동하면 완료다.

```
ref: PRD v2.1 §7 SCR-03
     PRD v2.1 §5 US-14 (남은 생성 횟수 표시)
depends on: TASK-201, TASK-504, TASK-601
```

---

###[x] TASK-702 · 랜딩 페이지 (SCR-01)

**무엇을 만드는가**

서비스의 첫인상이 되는 랜딩 페이지를 만든다. 펫로스를 겪는 보호자의 감정을 건드리는 카피와 함께, 실제 생성 영상 예시를 보여줘야 한다.

**구체적으로 해야 할 일**

`src/app/page.tsx`를 만든다. 히어로 섹션에 "우리 아이를 다시 만나보세요"라는 감성적인 헤드라인을 크게 표시한다. 실제로 EverPet으로 생성한 예시 영상(또는 플레이스홀더 영상)을 배경 또는 중앙에 배치한다. "무료로 시작하기" CTA 버튼을 눈에 띄는 위치에 배치한다. 버튼 클릭 시 비로그인 상태면 회원가입 페이지로, 로그인 상태면 대시보드로 이동한다.

서비스 소개 섹션을 아래에 배치한다. "사진 한 장으로 충분해요", "우리 아이만의 개성을 담아요", "방 안에서 다시 만나요" 세 가지 가치 제안을 아이콘과 함께 가로로 배치한다.

구독 플랜 간단 소개 섹션을 추가한다. Free → Basic → Premium 세 가지 플랜을 카드로 표시하고, 각 플랜의 핵심 혜택(월 생성 횟수, 가격)을 표시한다.

페이지는 반응형으로 PC와 모바일 모두에서 잘 보여야 한다.

**완료 기준**

랜딩 페이지가 PC와 모바일 양쪽에서 정상 표시되고, CTA 버튼이 올바른 페이지로 이동하면 완료다.

```
ref: PRD v2.1 §7 SCR-01
     PRD v2.1 §1 (플랫폼 전략 — 반응형 웹)
depends on: TASK-103
```

---

##[x] Phase 8 — 에러 처리 및 안정화

Phase 8은 전체 서비스를 실제로 동작 가능한 상태로 마무리하는 단계다.

---

###[x] TASK-801 · 전역 에러 처리 및 토스트 시스템

**무엇을 만드는가**

API 에러를 일관되게 처리하고, 사용자에게 친절한 메시지를 토스트로 표시하는 시스템을 만든다.

**구체적으로 해야 할 일**

`npm install sonner`를 설치한다. `src/components/providers/ToastProvider.tsx`를 만들고 `app/layout.tsx`에 추가한다. `src/lib/apiError.ts` 파일을 만들어 API 에러 코드와 사용자 표시 메시지를 매핑한다. TRD의 에러 처리 정책에 정의된 모든 에러 케이스의 메시지를 기술 용어 없이 친근한 한국어로 정의한다.

**완료 기준**

잘못된 포맷의 사진을 업로드했을 때 "JPG 또는 PNG 파일만 올릴 수 있어요"라는 토스트가 표시되면 완료다.

```
ref: TRD v2.1 §7.2 (에러별 처리 정책)
     PRD v2.1 §4.4 (에러 처리)
```

---

###[x] TASK-802 · 크레딧 자동 반환 로직

**무엇을 만드는가**

영상 생성이 두 번 모두 실패했을 때 소모된 크레딧(생성 횟수)을 자동으로 반환하는 로직을 만든다.

**구체적으로 해야 할 일**

TASK-404의 인코딩 파이프라인에서 최종 실패 처리 시, `subscriptions.monthly_generation_used`를 1 감소시키는 로직을 추가한다. `generation_requests.status`를 'failed'로, `error_message`를 기록한다. Next.js의 `/api/internal/generation-done` 콜백에서 실패 이벤트를 수신하면 크레딧 반환을 실행한다.

**완료 기준**

의도적으로 잘못된 프롬프트로 생성을 요청해 실패했을 때, `monthly_generation_used`가 증가하지 않으면 완료다.

```
ref: PRD v2.1 §10 (제약 — 생성 실패 시 크레딧 복구)
     TRD v2.1 §7.2 (AI 생성 실패 2회 — 크레딧 반환)
depends on: TASK-404, TASK-601
```

---

###[x] TASK-803 · Vercel 배포 및 환경 설정

**무엇을 만드는가**

개발한 서비스를 Vercel에 배포하고, 프로덕션 환경변수를 설정해 실제 URL로 서비스가 동작하도록 만든다.

**구체적으로 해야 할 일**

GitHub 저장소에 코드를 푸시한다. Vercel에서 해당 저장소를 import한다. Vercel 대시보드에서 모든 환경변수를 `NEXT_PUBLIC_APP_URL`을 실제 Vercel 도메인으로 설정하는 것을 포함해 빠짐없이 입력한다. 배포 후 주요 기능(가입, 사진 업로드, 영상 생성 요청)이 프로덕션 환경에서도 동작하는지 확인한다. Supabase 대시보드에서 허용 URL 목록에 Vercel 도메인을 추가한다.

**완료 기준**

Vercel 도메인으로 접속해서 가입부터 영상 생성 요청까지의 흐름이 에러 없이 동작하면 완료다.

```
ref: TRD v2.1 §2.2 (배포 — Vercel)
     TRD v2.1 §9 (개발 환경 설정)
depends on: 모든 Phase 1~7 태스크
```

---

## 태스크 의존 관계 요약

```
Phase 0 (기반)
  TASK-001 → TASK-002 → TASK-003 → TASK-004
                                 → TASK-005

Phase 1 (인증)
  TASK-003 → TASK-101 → TASK-102
           → TASK-103

Phase 2 (프로필)
  TASK-004, TASK-101 → TASK-201 → TASK-202 → TASK-203

Phase 3 (업로드)
  TASK-004, TASK-005 → TASK-301 → TASK-302

Phase 4 (AI 파이프라인) ← 핵심
  TASK-002 → TASK-401
  TASK-301, TASK-005 → TASK-402 → TASK-403 → TASK-404
  TASK-201, TASK-301, TASK-401, TASK-402, TASK-403, TASK-404 → TASK-405

Phase 5 (UI)
  TASK-302, TASK-405 → TASK-501 → TASK-502 → TASK-503
  TASK-404, TASK-405 → TASK-504
  TASK-404, TASK-601 → TASK-505

Phase 6 (결제)
  TASK-004, TASK-101 → TASK-601 → TASK-602 → TASK-603

Phase 7 (랜딩)
  TASK-201, TASK-504, TASK-601 → TASK-701
  TASK-103 → TASK-702

Phase 8 (안정화)
  → TASK-801
  TASK-404, TASK-601 → TASK-802
  모두 → TASK-803
```

---

*© 2026 EverPet, Inc. | TASK v1.0 | 내부용*
