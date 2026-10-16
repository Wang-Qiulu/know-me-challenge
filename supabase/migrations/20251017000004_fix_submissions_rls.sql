-- ============================================================
-- Migration: 20251017000004_fix_submissions_rls.sql
-- Purpose:  修复 submissions 表的列权限泄露
-- Background: Supabase 的 auto_expose_new_tables 默认会给 anon/authenticated
--             全部列的 SELECT 权限；之前的列级 REVOKE 是叠加在表级 GRANT 之上，
--             实际上不生效。本迁移先表级 REVOKE ALL，再列级 GRANT 精确白名单。
-- ============================================================

-- 1. 全表级撤销（这是关键！之前漏了这一步）
REVOKE ALL ON public.submissions FROM anon, authenticated;

-- 2. 精确列级 GRANT 白名单（只能读这些列）
GRANT SELECT (id, challenge_id, nickname, score, title_label, created_at)
  ON public.submissions TO anon, authenticated;

-- 3. 确认 participants 也没被 auto-expose
REVOKE ALL ON public.participants FROM anon, authenticated;

-- 4. 确认 challenges / questions 表也清理（之前 REVOKE ALL 应该有效，但保险再写一次）
REVOKE ALL ON public.challenges  FROM anon, authenticated;
REVOKE ALL ON public.questions   FROM anon, authenticated;
