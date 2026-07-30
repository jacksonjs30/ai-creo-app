-- Migration: Add notes table
CREATE TABLE public.notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.project(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage notes through project" ON public.notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.project WHERE id = notes.project_id AND user_id = auth.uid())
  );
