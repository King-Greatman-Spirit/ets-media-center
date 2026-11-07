-- Ensure owners can delete their own queued posts.
-- Idempotent: safe to run even if the policies already exist.
-- Apply: Supabase Dashboard → SQL Editor → paste → Run.
-- (Or `supabase db push` if the project is linked.)

DROP POLICY IF EXISTS "Users manage own posts" ON public.scheduled_posts;

CREATE POLICY "Users manage own posts" ON public.scheduled_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
