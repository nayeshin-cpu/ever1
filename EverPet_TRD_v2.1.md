# 🐾 EverPet (에버펫) — TRD v2.1
**기술 요구사항 명세서 | PRD v2.1 기반**

| 항목 | 내용 |
|------|------|
| 작성일 | 2026. 03. 22 |
| 버전 | v2.1 (PRD v2.1 기반 전면 재작성) |
| 연관 문서 | PRD v2.1, ERD v1.0 |
| 플랫폼 | Web (Next.js 14) + IoT 홀로그램 기기 (RPi Zero 2W) |
| 대상 독자 | 프론트엔드·백엔드·AI 파이프라인 개발자 |

---

## 1. 시스템 전체 구조

```
[사용자 — 웹 브라우저]
        │
        │ HTTPS
        ▼
[Next.js 14 — Vercel]
  - 반응형 웹 UI (PC + 모바일)
  - API Route Handlers
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
[Supabase]                              [Cloudflare R2]
  - PostgreSQL (데이터)                   - 원본 사진 저장
  - Auth (인증)                           - 처리 중간 결과물
  - RLS (보안)                            - 완성 영상 저장
  - Storage (소형 에셋)
        │
        ▼
[AI 처리 파이프라인 — Railway 또는 Vercel Functions]
  1. 배경 제거 (rembg)
  2. 림라이트 추가 (ComfyUI)
  3. 깊이 추정 (Depth Anything v2)
  4. 프롬프트 생성 (Claude API)
  5. 영상 생성 (Kling AI v2.0 / Fal.ai)
  6. 홀로그램 인코딩 (FFmpeg)
        │
        ▼
[완성 MP4 → R2 저장 → 보호자에게 전달]
        │
        ▼ (Phase 2)
[홀로그램 기기 — RPi Zero 2W]
  - 같은 Wi-Fi 기반 HTTP 연동
  - Pepper's Ghost 투영
```

---

## 2. 기술 스택

### 2.1 프론트엔드

| 항목 | 기술 | 선택 이유 |
|------|------|---------|
| 프레임워크 | Next.js 14 (App Router) | SSR/SSG, SEO, API Routes 통합 |
| 언어 | TypeScript | 타입 안전성, 유지보수 |
| 스타일링 | Tailwind CSS v3 | 빠른 반응형 구현 |
| 상태 관리 | Zustand | 가볍고 단순 |
| 파일 업로드 | react-dropzone | 드래그앤드롭 + 유효성 검사 |
| 영상 재생 | HTML5 `<video>` | 추가 의존성 없이 MP4 재생 |
| 폴링 | SWR (interval) | 생성 상태 실시간 확인 |

### 2.2 백엔드 / 인프라

| 항목 | 기술 | 선택 이유 |
|------|------|---------|
| 데이터베이스 | Supabase (PostgreSQL) | RLS, Auth, 실시간 기능 내장 |
| 파일 스토리지 | Cloudflare R2 | egress 무료, CDN 통합 |
| 배포 (프론트) | Vercel | Next.js 최적화, Zero-config |
| 배포 (AI 파이프라인) | Railway | 장기 실행 작업, Python 지원 |
| 결제 | TossPayments | 국내 정기결제 최적화 |

### 2.3 AI 파이프라인

| 단계 | 기술 | 역할 |
|------|------|------|
| 배경 제거 | rembg (Python) | 사진에서 반려동물 분리 |
| 림라이트 | ComfyUI workflow | 홀로그램 최적화 역광 추가 |
| 깊이 추정 | Depth Anything v2 | 단안 깊이 → 3D 모션 힌트 |
| 프롬프트 생성 | Claude API (claude-sonnet-4) | 행동 특성 → 자연어 프롬프트 |
| 영상 생성 | **Kling AI v2.0** (메인) / Fal.ai (대안) | image-to-video |
| 인코딩 | FFmpeg | MP4 변환, 해상도 조정, 홀로그램 최적화 |

---

## 3. 입력 데이터 처리

### 3.1 사진 업로드 유효성 검사

업로드 즉시 **클라이언트 사이드**에서 1차 검사, **서버 사이드**에서 2차 검사.

```typescript
// 클라이언트 1차 검사 (react-dropzone)
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB

// 서버 2차 검사 (API Route)
// - MIME 타입 실제 확인 (magic bytes)
// - 해상도 추출 → 품질 피드백 결정
// - 반려동물 감지 여부 확인 (선택적)
```

**해상도별 품질 피드백 로직:**

```typescript
function getQualityFeedback(width: number, height: number): QualityFeedback {
  const minDim = Math.min(width, height)

  if (minDim >= 2048) return { level: 'great',   message: '선명한 사진이에요 👍' }
  if (minDim >= 1024) return { level: 'ok',      message: '괜찮아요. 더 선명하면 더 좋아요' }
  if (minDim >= 512)  return { level: 'low',     message: '조금 더 선명한 사진을 올려주시면 더 좋아요' }
  return               { level: 'too_low',  message: '사진이 너무 작아요. 더 선명한 사진을 올려주세요' }
}
```

### 3.2 사진 저장 구조 (Cloudflare R2)

```
R2 버킷 구조:
  pets/{pet_id}/originals/{timestamp}_{uuid}.jpg     ← 원본
  pets/{pet_id}/processed/{uuid}_bg_removed.png      ← 배경 제거
  pets/{pet_id}/processed/{uuid}_rimlight.png        ← 림라이트
  pets/{pet_id}/videos/{uuid}_1920x1080.mp4          ← 최종 영상 (웹)
  pets/{pet_id}/videos/{uuid}_1080x1080.mp4          ← 홀로그램용
  pets/{pet_id}/thumbnails/{uuid}_thumb.jpg          ← 썸네일
```

### 3.3 행동 특성 → 프롬프트 변환 엔진

보호자가 입력한 행동 특성이 AI 영상 생성 프롬프트로 변환되는 핵심 로직.

**입력 데이터 구조:**

```typescript
interface PetBehaviorProfile {
  // 기본 정보 (L3 Identity 간소화)
  breed: string           // 'Maltese'
  bodyType: 'small' | 'medium' | 'large'
  coatColorHex: string[]  // ['#FFFFFF']
  ageGroup: 'puppy' | 'adult' | 'senior'

  // 행동 특성 (보호자 입력)
  energyLevel: 'high' | 'medium' | 'low'
  personalityTags: PersonalityTag[]  // 최대 3개
}

type PersonalityTag =
  | 'tail_wag_strong'     // 꼬리를 엄청 세게 흔들었어요
  | 'follow_owner'        // 항상 졸졸 따라다녔어요
  | 'play_fetch'          // 공·장난감을 물어오는 걸 좋아했어요
  | 'food_motivated'      // 밥·간식 앞에서 특히 신났어요
  | 'social_stranger'     // 낯선 사람한테도 먼저 달려갔어요
  | 'calm_presence'       // 조용히 옆에 있는 걸 좋아했어요
  | 'sniff_focused'       // 산책 나가면 코를 바닥에 박았어요
  | 'strong_recall'       // 이름 부르면 바로 달려왔어요

// 매 생성마다 선택
type MoodPreset = 'cozy' | 'active' | 'calm'
```

**프롬프트 변환 규칙:**

```typescript
// 1단계: 규칙 기반 파라미터 추출
const motionParams = {
  tailWagIntensity: tags.includes('tail_wag_strong') ? 'vigorously' : 'gently',
  bodyPosture: energy === 'high' ? 'forward-leaning, excited' : 'relaxed',
  eyeOpenness: energy === 'high' ? 'wide open' : 'soft',
  movementType: mood === 'active' ? 'trotting, bouncing' :
                mood === 'cozy'   ? 'lying down, resting' : 'sitting quietly',
  socialOrientation: tags.includes('follow_owner') ? 'facing owner eagerly' : 'neutral',
}

// 2단계: Claude API로 자연어 프롬프트 완성
const systemPrompt = `
  당신은 반려동물 AI 영상 생성 프롬프트 전문가입니다.
  주어진 파라미터를 Kling AI image-to-video에 최적화된
  영어 프롬프트로 변환하세요. 120토큰 이내.
  배경은 항상 pure black. 홀로그램 최적화 명시.
`
```

**변환 예시:**

```
입력:
  breed=Maltese, bodyType=small, coat=#FFFFFF, age=adult
  energy=high
  tags=[tail_wag_strong, follow_owner, strong_recall]
  mood=active

출력 프롬프트:
"A small Maltese with pure white fluffy coat, tail wagging vigorously,
trotting eagerly toward owner with wide open bright eyes, body leaning
forward with high energy excitement. Responsive and loyal personality.
Rim backlight, pure black background, hologram display optimized."
```

---

## 4. AI 영상 생성 파이프라인

### 4.1 전체 처리 흐름

```
[보호자 요청]
  input: 사진 + 행동특성 + 무드
        │
        ▼
STEP 1  배경 제거 (rembg)
  input:  원본 JPG/PNG
  output: 투명 PNG (반려동물만)
  시간:   ~5초
        │
        ▼
STEP 2  림라이트 추가 (ComfyUI)
  input:  투명 PNG
  output: 림라이트 적용 PNG
  목적:   홀로그램에서 피사체가 자연스럽게 부각
  시간:   ~10초
        │
        ▼
STEP 3  깊이 추정 (Depth Anything v2)
  input:  림라이트 PNG
  output: 깊이 맵 (depth map)
  목적:   3D 모션 힌트 → 영상 생성 품질 향상
  시간:   ~5초
        │
        ▼
STEP 4  프롬프트 생성 (Claude API)
  input:  행동특성 프로파일 + 무드
  output: Kling AI용 영어 프롬프트 (120토큰 이내)
  시간:   ~3초
        │
        ▼
STEP 5  영상 생성 (Kling AI v2.0)
  input:  림라이트 PNG + 프롬프트
  output: 원본 영상 (Kling 출력)
  시간:   ~90~150초
  대안:   Fal.ai (Kling 장애 시 자동 전환)
        │
        ▼
STEP 6  홀로그램 인코딩 (FFmpeg)
  input:  Kling 출력 영상
  output A: 1920×1080 MP4 30fps (웹 재생 + 다운로드용)
  output B: 1080×1080 MP4 30fps (홀로그램 기기용)
  output C: 400×400 JPG (썸네일)
  시간:   ~10초
        │
        ▼
[완료] R2 저장 → DB 업데이트 → 보호자 알림
```

### 4.2 FFmpeg 인코딩 명령어

```bash
# 웹용 1920×1080 MP4
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,
       pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -preset medium -crf 20 \
  -an \
  output_1920x1080.mp4

# 홀로그램용 1080×1080 MP4
ffmpeg -i input.mp4 \
  -vf "scale=1080:1080:force_original_aspect_ratio=decrease,
       pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -preset medium -crf 20 \
  -an \
  output_1080x1080.mp4

# 썸네일 JPG
ffmpeg -i input.mp4 -ss 00:00:01 -frames:v 1 \
  -vf "scale=400:400:force_original_aspect_ratio=decrease,
       pad=400:400:(ow-iw)/2:(oh-ih)/2:black" \
  thumbnail.jpg
```

### 4.3 출력 스펙 요약

| 파일 | 포맷 | 해상도 | FPS | 배경 | 용도 |
|------|------|--------|-----|------|------|
| 웹용 영상 | MP4 H.264 | **1920 × 1080** | 30 | #000000 | 웹 재생 + 다운로드 |
| 홀로그램용 | MP4 H.264 | **1080 × 1080** | 30 | #000000 | Pepper's Ghost 기기 |
| 썸네일 | JPG | 400 × 400 | - | #000000 | 보관함 그리드 |

### 4.4 생성 상태 관리

```typescript
type GenerationStatus =
  | 'pending'      // 요청 접수
  | 'preprocessing' // STEP 1~3 처리 중
  | 'generating'   // STEP 5 Kling AI 처리 중 (가장 오래 걸림)
  | 'encoding'     // STEP 6 FFmpeg 처리 중
  | 'done'         // 완료
  | 'failed'       // 실패 (크레딧 자동 반환)
```

**클라이언트 폴링:**

```typescript
// SWR로 3초마다 상태 확인
const { data } = useSWR(
  `/api/generate/${requestId}/status`,
  fetcher,
  {
    refreshInterval: (data) =>
      data?.status === 'done' || data?.status === 'failed' ? 0 : 3000
  }
)
```

**사용자 표시 문구:**

| status | 진행 단계 표시 | 감성 문구 |
|--------|-------------|---------|
| pending | ● ○ ○ | "잠깐만요, 준비하고 있어요" |
| preprocessing | ● ● ○ | "사진 준비 중이에요" |
| generating | ● ● ○ (점멸) | "콩이를 만들고 있어요 🐾" |
| encoding | ● ● ● | "거의 다 됐어요!" |
| done | ✅ | "완성됐어요! 만나보세요 🐾" |
| failed | ❌ | "오늘은 만들기가 어렵네요. 크레딧은 돌려드릴게요" |

---

## 5. API 명세

### 5.1 엔드포인트 목록

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/api/auth/signup` | - | 이메일 회원가입 |
| POST | `/api/auth/login` | - | 로그인 |
| POST | `/api/pets` | JWT | 반려동물 프로필 생성 |
| PUT | `/api/pets/:id` | JWT | 프로필 수정 (행동 특성 포함) |
| GET | `/api/pets` | JWT | 내 반려동물 목록 |
| POST | `/api/upload/photo` | JWT | 사진 업로드 + 유효성 검사 |
| POST | `/api/generate` | JWT | 영상 생성 요청 |
| GET | `/api/generate/:id/status` | JWT | 생성 상태 폴링 |
| GET | `/api/videos` | JWT | 내 영상 보관함 |
| GET | `/api/videos/:id/download` | JWT | 다운로드 서명 URL 발급 |
| DELETE | `/api/videos/:id` | JWT | 영상 삭제 |
| POST | `/api/subscriptions` | JWT | 구독 시작 |
| PUT | `/api/subscriptions` | JWT | 플랜 변경 |
| DELETE | `/api/subscriptions` | JWT | 구독 해지 |

### 5.2 핵심 API 상세

**POST `/api/upload/photo`**

```typescript
// Request: multipart/form-data
{
  file: File,        // JPG/PNG, 최대 10MB
  petId: string      // 연결할 반려동물 ID
}

// Response
{
  mediaId: string,
  previewUrl: string,     // 서명된 URL (1시간)
  qualityFeedback: {
    level: 'great' | 'ok' | 'low' | 'too_low',
    message: string,
    resolution: { width: number, height: number }
  }
}
```

**POST `/api/generate`**

```typescript
// Request
{
  petId: string,
  mediaId: string,       // 업로드된 사진 ID
  mood: 'cozy' | 'active' | 'calm'
  // 행동 특성은 petId에서 자동 로딩
}

// Response
{
  requestId: string,
  estimatedSeconds: number,  // 예상 소요 시간
  status: 'pending'
}
```

**GET `/api/generate/:id/status`**

```typescript
// Response
{
  requestId: string,
  status: GenerationStatus,
  progress: number,          // 0~100
  stepLabel: string,         // 사용자 표시용 단계 문구
  videoUrl?: string,         // done 상태일 때만
  thumbnailUrl?: string,
  errorMessage?: string      // failed 상태일 때만
}
```

---

## 6. 데이터베이스 핵심 테이블

> 전체 ERD는 ERD v1.0 문서 참조. 여기서는 영상 생성 플로우와 직접 연관된 테이블만 기술.

### 6.1 `pet_profiles` — 반려동물 프로필

```sql
create table pet_profiles (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references users(id) on delete cascade,
  pet_name            text not null,
  species             text default 'dog',
  breed               text,
  body_type           text,                        -- small/medium/large
  coat_color_hex      text[] default '{}',
  age_group           text,                        -- puppy/adult/senior

  -- 행동 특성 (보호자 입력 — 프롬프트 변환의 핵심)
  energy_level        text,                        -- high/medium/low
  personality_tags    text[] default '{}',         -- 최대 3개

  is_deceased         boolean default false,
  deceased_at         date,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
```

### 6.2 `generation_requests` — 영상 생성 요청

```sql
create table generation_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id),
  pet_id              uuid not null references pet_profiles(id),
  input_media_id      uuid references media_assets(id),
  output_media_id     uuid references media_assets(id),

  -- 생성 파라미터
  mood_preset         text,                        -- cozy/active/calm
  generated_prompt    text,                        -- 실제 사용된 프롬프트
  behavior_snapshot   jsonb,                       -- 생성 시점 행동특성 스냅샷

  -- AI 모델
  model_provider      text default 'kling',        -- kling/fal
  model_version       text,

  -- 상태 추적
  status              text default 'pending',
  progress            integer default 0,
  error_message       text,
  generation_time_sec float,
  credit_cost         integer,

  created_at          timestamptz default now(),
  completed_at        timestamptz
);
```

### 6.3 `media_assets` — 미디어 파일

```sql
create table media_assets (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references users(id),
  pet_id              uuid references pet_profiles(id),

  -- R2 경로
  r2_key_original     text,                        -- 원본
  r2_key_bg_removed   text,                        -- 배경 제거
  r2_key_rimlight     text,                        -- 림라이트
  r2_key_video_web    text,                        -- 1920×1080 MP4
  r2_key_video_holo   text,                        -- 1080×1080 MP4
  r2_key_thumbnail    text,                        -- 400×400 JPG

  -- 메타
  media_type          text,                        -- photo/video_output
  original_width      integer,
  original_height     integer,
  quality_level       text,                        -- great/ok/low/too_low
  processing_status   text default 'raw',

  created_at          timestamptz default now()
);
```

---

## 7. 에러 처리 & 폴백

### 7.1 Kling AI → Fal.ai 자동 전환

```typescript
async function generateVideo(params: GenerationParams): Promise<string> {
  try {
    // 1차: Kling AI 시도
    return await klingGenerate(params)
  } catch (err) {
    // Kling 실패 시 Fal.ai로 자동 전환
    console.warn('Kling AI failed, falling back to Fal.ai:', err)
    return await falGenerate(params)
  }
}
```

### 7.2 에러별 처리 정책

| 에러 | 원인 | 처리 | 사용자 표시 |
|------|------|------|-----------|
| 파일 포맷 오류 | JPG/PNG 외 | 업로드 차단 | "JPG 또는 PNG 파일만 올릴 수 있어요" |
| 파일 크기 초과 | 10MB 초과 | 업로드 차단 | "10MB 이하 사진을 올려주세요" |
| 반려동물 미감지 | 배경만 있는 사진 | 재업로드 유도 | "사진에서 아이를 찾지 못했어요" |
| AI 생성 실패 (1회) | Kling/Fal 오류 | 자동 재시도 | "잠깐 문제가 생겼어요. 한 번 더 시도해볼게요" |
| AI 생성 실패 (2회) | 지속 오류 | 크레딧 반환 | "오늘은 만들기가 어렵네요. 크레딧은 돌려드릴게요" |
| 크레딧 부족 | 월 한도 초과 | 업그레이드 유도 | "이번 달 생성 횟수를 모두 사용했어요" |

---

## 8. 비기능 요구사항

### 8.1 성능 목표

| 항목 | 목표 | 측정 |
|------|------|------|
| 웹 최초 로딩 (LCP) | ≤ 2.5초 | Vercel Analytics |
| 사진 업로드 → 미리보기 + 품질 피드백 | ≤ 2초 | 클라이언트 기준 |
| STEP 1~4 전처리 완료 | ≤ 30초 | 서버 로그 |
| STEP 5 영상 생성 (P90) | ≤ 3분 | generation_time_sec |
| 영상 다운로드 서명 URL 발급 | ≤ 3초 | API 응답 |
| API 응답 시간 (P95) | ≤ 500ms | Vercel Analytics |
| 서비스 가용성 | ≥ 99.0% / 월 | Uptime Monitor |

### 8.2 보안

- **미디어 접근**: 서명된 R2 URL (만료 1시간). 본인 pet_id 소유 확인 후 발급.
- **RLS**: 모든 Supabase 테이블 Row Level Security 적용.
- **결제 정보**: EverPet 서버 미보관. TossPayments가 직접 관리.
- **AI 학습 동의**: 서비스 이용 동의와 별도 opt-in (`data_training_consent`).
- **CORS**: 허용 도메인 명시적 설정. 와일드카드 금지.

### 8.3 확장성

- 영상 생성 파이프라인: 큐(Queue) 기반 비동기 처리 → 동시 요청 급증 대응
- 모델 교체: `model_provider` 필드로 추적. Kling/Fal 외 추가 시 코드 변경 최소화
- 종 확장: `species` 필드로 고양이·소동물 추후 지원 가능 구조

---

## 9. 개발 환경 설정

```bash
# 필수 환경변수
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=

KLING_API_KEY=
KLING_API_SECRET=          # JWT 서명용
FAL_API_KEY=               # Kling 폴백

ANTHROPIC_API_KEY=         # 프롬프트 생성

TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
```

---

## 10. 구현 우선순위 (Phase 1)

| 우선순위 | 태스크 | 예상 공수 |
|---------|--------|---------|
| 🔴 P0 | Kling AI JWT 인증 + 크레딧 세팅 | 0.5일 |
| 🔴 P0 | 사진 업로드 API + R2 저장 + 품질 피드백 | 1일 |
| 🔴 P0 | 배경 제거 + 림라이트 파이프라인 (STEP 1~2) | 1.5일 |
| 🔴 P0 | 행동 특성 → 프롬프트 변환 로직 | 1일 |
| 🔴 P0 | Kling AI 영상 생성 + FFmpeg 인코딩 (STEP 5~6) | 1.5일 |
| 🔴 P0 | end-to-end 1회 성공 확인 | 0.5일 |
| 🟡 P1 | 생성 상태 폴링 API + 프론트 진행 화면 | 1일 |
| 🟡 P1 | 반려동물 프로필 + 행동 특성 입력 UI | 1일 |
| 🟡 P1 | 생성 완료 화면 + MP4 다운로드 | 0.5일 |
| 🟡 P1 | 영상 보관함 + 썸네일 자동 생성 | 1일 |
| 🟢 P2 | TossPayments 정기결제 연동 | 1.5일 |
| 🟢 P2 | 구독 한도 관리 (월 생성 횟수) | 0.5일 |
| 🟢 P2 | 홀로그램 기기 Wi-Fi 연동 | 2일 |

---

## 부록 — 용어 정의

| 용어 | 정의 |
|------|------|
| **림라이트 (Rim Light)** | 피사체 테두리에 역광을 추가해 홀로그램에서 자연스럽게 부각되는 조명 기법 |
| **Pepper's Ghost** | 반투명 유리를 45° 각도로 세워 반사 투영하는 홀로그램 기법. EverPet 기기에 적용 |
| **행동 특성 (Behavior Profile)** | 보호자가 입력하는 에너지 레벨 + 성격 키워드. AI 프롬프트 변환의 핵심 입력값 |
| **무드 프리셋 (Mood Preset)** | 매 생성마다 선택하는 영상 분위기 (포근한/활발한/조용한) |
| **DBGD** | Dog Behavior Generation Dataset. 내부 AI 고도화용 데이터셋. 이 TRD 범위 외 (별도 문서) |
| **generation_time_sec** | 영상 생성 요청부터 완료까지 실제 소요 시간. 성능 모니터링 지표 |

---

*© 2026 EverPet, Inc. | TRD v2.1 | 내부용*
