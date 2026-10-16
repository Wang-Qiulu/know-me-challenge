-- ============================================================
-- Migration: 20251017000002_rls_policies.sql
-- Purpose:  RLS 策略 + 列级 GRANT + 公开 view
-- 核心原则：
--   - anon 永远读不到 manage_token_hash、correct_option、answers
--   - 所有写操作只通过 service_role（即 Edge Functions 内部）
--   - 通过 view + 列级 GRANT 实现最小披露
-- ============================================================

-- ============================================================
-- 1. challenges
-- ============================================================
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- anon 可读挑战基本信息（不含 manage_slug / manage_token_hash）
-- 用 view 暴露，撤销直接表访问
CREATE VIEW public.challenges_public AS
  SELECT id, slug, title, status, created_at, published_at, closed_at
  FROM public.challenges
  WHERE status != 'deleted';

GRANT SELECT ON public.challenges_public TO anon, authenticated;

REVOKE ALL ON public.challenges FROM anon, authenticated;

-- 公开读：通过 challenges_public view（上面 GRANT 已处理）
-- 这里加 RLS 让直接 SELECT 表时也走严格策略（理论上没人直接 SELECT 表）

CREATE POLICY "challenges_no_direct_read" ON public.challenges
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- anon 不能写 challenge（创建/更新/删除全部通过 service_role）
-- 不写 INSERT/UPDATE/DELETE policy = 拒绝

-- ============================================================
-- 2. questions
-- ============================================================
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 公开 view：只暴露题目文案和选项，**绝不暴露 correct_option**
CREATE VIEW public.questions_public AS
  SELECT id, challenge_id, position, text, options
  FROM public.questions;

GRANT SELECT ON public.questions_public TO anon, authenticated;

REVOKE ALL ON public.questions FROM anon, authenticated;

CREATE POLICY "questions_no_direct_read" ON public.questions
  FOR SELECT TO anon, authenticated USING (false);

-- ============================================================
-- 3. participants（匿名身份）
-- ============================================================
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- 客户端完全不能读写
REVOKE ALL ON public.participants FROM anon, authenticated;

-- service_role 在 Edge Function 内可访问

-- ============================================================
-- 4. submissions（答题记录）
-- ============================================================
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 列级 GRANT：公开读脱敏字段；永远读不到 answers
GRANT SELECT (id, challenge_id, nickname, score, title_label, created_at)
  ON public.submissions TO anon, authenticated;

REVOKE SELECT (participant_id, answers, share_slug)
  ON public.submissions FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.submissions FROM anon, authenticated;

CREATE POLICY "submissions_leaderboard_only" ON public.submissions
  FOR SELECT TO anon, authenticated
  USING (true);  -- 列级 GRANT 已限制可读列

-- ============================================================
-- 5. events（埋点）
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- anon 可以写埋点（前端上报），不能读
GRANT INSERT ON public.events TO anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.events FROM anon, authenticated;

CREATE POLICY "events_insert_any" ON public.events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
