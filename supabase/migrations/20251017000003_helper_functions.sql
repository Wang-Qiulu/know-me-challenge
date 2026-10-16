-- ============================================================
-- Migration: 20251017000003_helper_functions.sql
-- Purpose:  服务端工具函数（仅 service_role 可调用）
-- ============================================================

-- 短 slug 生成器（默认 10 字符，base36 字母数字）
-- 用法：SELECT public.generate_slug(10);
CREATE OR REPLACE FUNCTION public.generate_slug(len INT DEFAULT 10)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijkmnpqrstuvwxyz23456789';  -- 去掉 0/o/1/l 减少混淆
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..len LOOP
    result := result || substr(chars, 1 + (random() * length(chars))::INT, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 标题（称号）映射：按分数返回称号
-- 5 → 灵魂挚友
-- 4 → 心有灵犀
-- 3 → 半知己
-- 2 → 普通朋友
-- 1 → 点头之交
-- 0 → 最熟悉的陌生人
CREATE OR REPLACE FUNCTION public.score_to_title(p_score SMALLINT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_score
    WHEN 5 THEN '灵魂挚友'
    WHEN 4 THEN '心有灵犀'
    WHEN 3 THEN '半知己'
    WHEN 2 THEN '普通朋友'
    WHEN 1 THEN '点头之交'
    WHEN 0 THEN '最熟悉的陌生人'
    ELSE '神秘嘉宾'
  END;
$$;

-- 生成可读短码（带唯一性校验）
CREATE OR REPLACE FUNCTION public.generate_unique_slug(
  p_table TEXT,
  p_column TEXT,
  p_len INT DEFAULT 10,
  p_max_attempts INT DEFAULT 10
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_exists BOOLEAN;
  i INT;
BEGIN
  FOR i IN 1..p_max_attempts LOOP
    v_slug := public.generate_slug(p_len);
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE %I = $1)', p_table, p_column)
      INTO v_exists
      USING v_slug;
    EXIT WHEN NOT v_exists;
  END LOOP;
  IF v_exists THEN
    RAISE EXCEPTION '无法在 % 次尝试内生成唯一 slug', p_max_attempts;
  END IF;
  RETURN v_slug;
END;
$$;
