-- ============================================================
-- Seed: 本地开发的演示数据
-- 提示：seed.sql 用 postgres 超级用户执行，可绕过 RLS
-- 仅在本地 db reset 时使用；生产环境请使用 Edge Function 创建
-- ============================================================

-- 演示挑战（manage_token 明文 = "demo-manage-token"，仅本地演示用）
INSERT INTO public.challenges (
  slug,
  manage_slug,
  manage_token_hash,
  title,
  status,
  published_at
) VALUES (
  'demo',
  'demo-manage',
  encode(digest('demo-manage-token', 'sha256'), 'hex'),
  '测测你有多懂我？',
  'published',
  now()
);

-- 5 道默认题（与 PRD 验收一致）
INSERT INTO public.questions (challenge_id, position, text, options, correct_option)
SELECT id, 1,
  '我最喜欢的电影类型是？',
  '["动作冒险","爱情文艺","科幻悬疑","喜剧动画"]'::jsonb,
  2
FROM public.challenges WHERE slug = 'demo';

INSERT INTO public.questions (challenge_id, position, text, options, correct_option)
SELECT id, 2,
  '我周末最常做的事是？',
  '["出门社交","宅家刷剧","运动健身","学习充电"]'::jsonb,
  1
FROM public.challenges WHERE slug = 'demo';

INSERT INTO public.questions (challenge_id, position, text, options, correct_option)
SELECT id, 3,
  '我最怕的事情是？',
  '["恐高","社恐","小动物","看医生"]'::jsonb,
  3
FROM public.challenges WHERE slug = 'demo';

INSERT INTO public.questions (challenge_id, position, text, options, correct_option)
SELECT id, 4,
  '我最想去的旅行目的地是？',
  '["日本京都","冰岛极光","马尔代夫","西藏高原"]'::jsonb,
  0
FROM public.challenges WHERE slug = 'demo';

INSERT INTO public.questions (challenge_id, position, text, options, correct_option)
SELECT id, 5,
  '我最爱的食物是？',
  '["火锅烧烤","甜品蛋糕","日料寿司","家常小炒"]'::jsonb,
  0
FROM public.challenges WHERE slug = 'demo';
