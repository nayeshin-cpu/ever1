-- ============================================================
-- EverPet 핵심 테이블 마이그레이션
-- Supabase SQL Editor 또는 CLI 로 실행
-- ============================================================

-- 1. users 테이블
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  display_name TEXT,
  data_training_consent BOOLEAN NOT NULL DEFAULT false,
  tos_version TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. pet_profiles 테이블
CREATE TABLE public.pet_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pet_name        TEXT NOT NULL,
  species         TEXT DEFAULT 'dog',
  breed           TEXT,
  body_type       TEXT,
  coat_color_hex  TEXT[] DEFAULT '{}',
  age_group       TEXT,
  energy_level    TEXT,
  personality_tags TEXT[] DEFAULT '{}',
  is_deceased     BOOLEAN NOT NULL DEFAULT false,
  deceased_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. media_assets 테이블
CREATE TABLE public.media_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pet_id              UUID REFERENCES public.pet_profiles(id) ON DELETE SET NULL,
  r2_key_original     TEXT,
  r2_key_bg_removed   TEXT,
  r2_key_rimlight     TEXT,
  r2_key_video_web    TEXT,
  r2_key_video_holo   TEXT,
  r2_key_thumbnail    TEXT,
  media_type          TEXT,
  original_width      INTEGER,
  original_height     INTEGER,
  quality_level       TEXT,
  processing_status   TEXT NOT NULL DEFAULT 'raw',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. generation_requests 테이블
CREATE TABLE public.generation_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pet_id              UUID REFERENCES public.pet_profiles(id) ON DELETE SET NULL,
  input_media_id      UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  output_media_id     UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  mood_preset         TEXT,
  generated_prompt    TEXT,
  behavior_snapshot   JSONB,
  model_provider      TEXT NOT NULL DEFAULT 'kling',
  model_version       TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  progress            INTEGER NOT NULL DEFAULT 0,
  error_message       TEXT,
  generation_time_sec FLOAT,
  credit_cost         INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

-- ============================================================
-- RLS 활성화 및 정책 설정
-- ============================================================

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- pet_profiles
ALTER TABLE public.pet_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_profiles_select_own" ON public.pet_profiles
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "pet_profiles_insert_own" ON public.pet_profiles
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "pet_profiles_update_own" ON public.pet_profiles
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "pet_profiles_delete_own" ON public.pet_profiles
  FOR DELETE USING (owner_id = auth.uid());

-- media_assets
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_assets_select_own" ON public.media_assets
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "media_assets_insert_own" ON public.media_assets
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "media_assets_update_own" ON public.media_assets
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "media_assets_delete_own" ON public.media_assets
  FOR DELETE USING (owner_id = auth.uid());

-- generation_requests
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generation_requests_select_own" ON public.generation_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "generation_requests_insert_own" ON public.generation_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "generation_requests_update_own" ON public.generation_requests
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "generation_requests_delete_own" ON public.generation_requests
  FOR DELETE USING (user_id = auth.uid());
