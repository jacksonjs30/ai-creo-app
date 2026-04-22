-- Avatar-to-ADS: Initial DB Schema

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USER roles (extends the auth.users table)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- PROJECT
CREATE TABLE public.project (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Project
ALTER TABLE public.project ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own projects" ON public.project FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.project FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.project FOR UPDATE USING (auth.uid() = user_id);

-- BRIEF
CREATE TABLE public.brief (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.project(id) ON DELETE CASCADE NOT NULL,
  product_name text,
  category text,
  description text,
  advantages jsonb DEFAULT '[]'::jsonb,
  landing_url text,
  parsed_landing_content text,
  audience_description text,
  age_range jsonb DEFAULT '[]'::jsonb,
  gender text,
  profession text,
  income_level text,
  prior_products text,
  geo_countries jsonb DEFAULT '[]'::jsonb,
  ad_language jsonb DEFAULT '[]'::jsonb,
  platforms jsonb DEFAULT '[]'::jsonb,
  placements jsonb DEFAULT '[]'::jsonb,
  existing_ad_notes text,
  objections text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Brief
ALTER TABLE public.brief ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage briefs through project" ON public.brief
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.project WHERE id = brief.project_id AND user_id = auth.uid())
  );

-- AVATAR
CREATE TABLE public.avatar (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  brief_id uuid REFERENCES public.brief(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.project(id) ON DELETE CASCADE NOT NULL,
  segment_name text,
  jtbd jsonb DEFAULT '[]'::jsonb,
  pains jsonb DEFAULT '[]'::jsonb,
  fears jsonb DEFAULT '[]'::jsonb,
  objections jsonb DEFAULT '[]'::jsonb,
  behavior_markers jsonb DEFAULT '[]'::jsonb,
  cjm jsonb DEFAULT '[]'::jsonb,
  motivations jsonb DEFAULT '[]'::jsonb,
  portrait text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Avatar (User sees only limited, Admin sees all)
ALTER TABLE public.avatar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view avatars of own project" ON public.avatar FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.project WHERE id = avatar.project_id AND user_id = auth.uid()));
-- Note: Field level security or API redaction should be used for hiding JTBD from standard 'users'
-- Supabase RLS operates on rows, not columns. We will mask columns in the Next.js API.

-- CREATIVE_JOB
CREATE TABLE public.creative_job (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.project(id) ON DELETE CASCADE NOT NULL,
  avatar_ids jsonb NOT NULL,
  creative_type text CHECK (creative_type IN ('image', 'video', 'meme')),
  variant_count integer DEFAULT 1,
  placements jsonb DEFAULT '[]'::jsonb,
  brand_settings jsonb DEFAULT '{}'::jsonb,
  voice_settings jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'generating', 'done', 'error')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.creative_job ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage creative jobs" ON public.creative_job
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.project WHERE id = creative_job.project_id AND user_id = auth.uid())
  );

-- CREATIVE
CREATE TABLE public.creative (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  creative_job_id uuid REFERENCES public.creative_job(id) ON DELETE CASCADE NOT NULL,
  avatar_id uuid REFERENCES public.avatar(id) ON DELETE SET NULL,
  concept_name text,
  angle text,
  hook_text text,
  script_json jsonb,
  asset_url text,
  format text,
  type text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.creative ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage creatives" ON public.creative
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.creative_job j
      JOIN public.project p ON p.id = j.project_id
      WHERE j.id = creative.creative_job_id AND p.user_id = auth.uid()
    )
  );
