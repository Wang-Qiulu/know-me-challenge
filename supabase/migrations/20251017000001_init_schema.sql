-- ============================================================
-- Migration: 20251017000001_init_schema.sql
-- Purpose:  初始化「懂我挑战」数据模型
-- Tables:   challenges / questions / participants / submissions / events
-- Notes:    完整安全策略见 20251017000002_rls_policies.sql
-- ============================================================

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- 不区分大小写的文本（可选，本版未使用）

-- ============================================================
-- 1. challenges：挑战主表
-- ============================================================
CREATE TABLE public.challenges (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT         NOT NULL UNIQUE,                  -- 邀请链接短 slug
  manage_slug      TEXT         NOT NULL UNIQUE,                  -- 管理链接短 slug
  manage_token_hash TEXT        NOT NULL,                        -- 管理凭证的 SHA256 hash（绝不存明文）
  title            TEXT         NOT NULL DEFAULT '你有多懂我？',
  status           TEXT         NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','published','closed','deleted')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  published_at     TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ
);

COMMENT ON TABLE  public.challenges IS '挑战主表';
COMMENT ON COLUMN public.challenges.manage_token_hash IS '管理凭证的 SHA256；明文只在创建时返回给用户一次';

CREATE INDEX idx_challenges_status ON public.challenges(status) WHERE status != 'deleted';
CREATE INDEX idx_challenges_slug    ON public.challenges(slug)       WHERE status != 'deleted';

-- ============================================================
-- 2. questions：题目表
-- ============================================================
CREATE TABLE public.questions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  position        SMALLINT    NOT NULL CHECK (position BETWEEN 1 AND 20),
  text            TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 200),
  options         JSONB       NOT NULL,                           -- TEXT 数组，长度 2–6
  correct_option  SMALLINT    NOT NULL,                           -- 0-based 索引
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, position),
  CHECK (jsonb_typeof(options) = 'array'),
  CHECK (jsonb_array_length(options) BETWEEN 2 AND 6),
  CHECK (correct_option >= 0 AND correct_option < jsonb_array_length(options))
);

COMMENT ON COLUMN public.questions.correct_option IS '正确答案；受 RLS 保护，anon 永远读不到';

CREATE INDEX idx_questions_challenge ON public.questions(challenge_id, position);

-- ============================================================
-- 3. participants：匿名参与身份
-- ============================================================
CREATE TABLE public.participants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_token_hash TEXT        NOT NULL UNIQUE,                    -- 浏览器 anon_token 的 SHA256
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.participants IS '匿名参与身份；客户端永远无法直接读写';

-- ============================================================
-- 4. submissions：答题记录（核心幂等约束在此）
-- ============================================================
CREATE TABLE public.submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID        NOT NULL REFERENCES public.challenges(id)  ON DELETE CASCADE,
  participant_id  UUID        NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  nickname        TEXT        NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 12),
  answers         JSONB       NOT NULL,                           -- [0,1,2,0,3] 与题目 position 一一对应
  score           SMALLINT    NOT NULL CHECK (score >= 0 AND score <= 20),
  title_label     TEXT        NOT NULL,                           -- 称号
  share_slug      TEXT        NOT NULL UNIQUE,                    -- 个人成绩分享链接
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ★ 核心约束：同一匿名身份在同一挑战中只能提交一次
  UNIQUE(challenge_id, participant_id)
);

COMMENT ON COLUMN public.submissions.answers IS '用户作答；受 RLS 保护，公开读永远看不到';
COMMENT ON COLUMN public.submissions.share_slug IS '个人成绩分享链接的短 slug';

CREATE INDEX idx_submissions_leaderboard
  ON public.submissions(challenge_id, score DESC, created_at ASC);

CREATE INDEX idx_submissions_share
  ON public.submissions(share_slug);

-- ============================================================
-- 5. events：埋点（最小集）
-- ============================================================
CREATE TABLE public.events (
  id              BIGSERIAL   PRIMARY KEY,
  event_type      TEXT        NOT NULL,
  user_agent      TEXT,
  challenge_id    UUID        REFERENCES public.challenges(id)   ON DELETE SET NULL,
  submission_id   UUID        REFERENCES public.submissions(id)  ON DELETE SET NULL,
  participant_id  UUID        REFERENCES public.participants(id) ON DELETE SET NULL,
  props           JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_type_time ON public.events(event_type, created_at DESC);
