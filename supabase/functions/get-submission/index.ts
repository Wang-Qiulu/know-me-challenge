// supabase/functions/get-submission/index.ts
//
// 用途：获取单次成绩详情（含题目和正确答案）用于成绩页展示
// 权限：anon 可调用（任何人拿到 share_slug 都可看这份成绩，符合 PRD 第 12.3 节"个人成绩链接展示对应的那一次答题结果"）
// 入参：{ share_slug }
// 出参（成功 200）：
//   {
//     challenge: { id, slug, title, status, created_at, published_at },
//     submission: { id, nickname, score, title_label, answers, created_at },
//     questions: [{ position, text, options, correct_option }],   // 仅这份 submission 对应的题
//     per_question_correct: boolean[]                              // 长度 = 5
//   }
//
// 安全：
//   - 仅返回 share_slug 对应的那一份 submission（按 share_slug 查）
//   - 不返回 participant_id（即使是看自己的）
//   - 不返回 challenge.manage_slug / manage_token_hash

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { share_slug?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { share_slug } = body;
  if (
    !share_slug ||
    typeof share_slug !== 'string' ||
    share_slug.length < 6 ||
    share_slug.length > 32
  ) {
    return json({ error: 'invalid_share_slug' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) 查 submission
  const { data: submission, error: sErr } = await supabase
    .from('submissions')
    .select('id, challenge_id, nickname, score, title_label, answers, created_at')
    .eq('share_slug', share_slug)
    .maybeSingle();

  if (sErr) return json({ error: 'db_error', detail: sErr.message }, 500);
  if (!submission) return json({ error: 'submission_not_found' }, 404);

  // 2) 查 challenge（仅公开字段）
  const { data: challenge, error: cErr } = await supabase
    .from('challenges')
    .select('id, slug, title, status, created_at, published_at')
    .eq('id', submission.challenge_id)
    .maybeSingle();

  if (cErr) return json({ error: 'db_error', detail: cErr.message }, 500);
  if (!challenge) return json({ error: 'challenge_not_found' }, 404);

  // 3) 查题目（含 correct_option）
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('position, text, options, correct_option')
    .eq('challenge_id', challenge.id)
    .order('position');

  if (qErr) return json({ error: 'db_error', detail: qErr.message }, 500);
  if (!questions) return json({ error: 'no_questions' }, 500);

  // 4) 计算 per_question_correct
  const perQuestionCorrect: boolean[] = (questions as { correct_option: number }[]).map(
    (q, i) => q.correct_option === (submission.answers as number[])[i],
  );

  return json(
    {
      challenge: {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        status: challenge.status,
        created_at: challenge.created_at,
        published_at: challenge.published_at,
      },
      submission: {
        id: submission.id,
        nickname: submission.nickname,
        score: submission.score,
        title_label: submission.title_label,
        answers: submission.answers,
        created_at: submission.created_at,
      },
      questions: (
        questions as { position: number; text: string; options: string[]; correct_option: number }[]
      ).map((q) => ({
        position: q.position,
        text: q.text,
        options: q.options,
        correct_option: q.correct_option,
      })),
      per_question_correct: perQuestionCorrect,
    },
    200,
  );
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
