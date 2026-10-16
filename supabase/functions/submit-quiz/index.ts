// supabase/functions/submit-quiz/index.ts
//
// 用途：提交答题结果，服务端计分并写入 submissions
// 权限：anon 可调用（但所有读写都用 service_role）
// 入参：{ invite_slug, anon_token, nickname, answers: number[] }
// 出参：{ submission_id, score, title_label, share_slug, per_question_correct: boolean[] }
//
// 核心安全：
//   - correct_option 从 questions 表读取（service_role 权限），前端永远拿不到
//   - 依赖 submissions (challenge_id, participant_id) UNIQUE 约束保证幂等
//   - 重复提交 → 返回已有 submission（不报错，方便前端友好处理）

import { createClient } from 'jsr:@supabase/supabase-js@2';

// 显式 CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function scoreToTitle(score: number): string {
  return (
    ['最熟悉的陌生人', '点头之交', '普通朋友', '半知己', '心有灵犀', '灵魂挚友'][score] ??
    '神秘嘉宾'
  );
}

interface ExistingSubmission {
  id: string;
  score: number;
  title_label: string;
  share_slug: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body: {
    invite_slug?: string;
    anon_token?: string;
    nickname?: string;
    answers?: number[];
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { invite_slug, anon_token, nickname, answers } = body;

  // ---- 基础校验
  if (!invite_slug || !anon_token || !nickname || !Array.isArray(answers)) {
    return json({ error: 'missing_params' }, 400);
  }
  if (anon_token.length < 16 || anon_token.length > 128) {
    return json({ error: 'invalid_anon_token' }, 400);
  }
  const trimmedNick = nickname.trim();
  if (trimmedNick.length < 1 || trimmedNick.length > 12) {
    return json({ error: 'invalid_nickname' }, 400);
  }
  if (answers.length !== 5) {
    return json({ error: 'invalid_answers_count' }, 400);
  }
  if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a < 6)) {
    return json({ error: 'invalid_answers_value' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) 查挑战
  const { data: challenge, error: cErr } = await supabase
    .from('challenges')
    .select('id, status')
    .eq('slug', invite_slug)
    .neq('status', 'deleted')
    .maybeSingle();

  if (cErr) return json({ error: 'db_error', detail: cErr.message }, 500);
  if (!challenge) return json({ error: 'challenge_not_found' }, 404);
  if (challenge.status === 'closed')
    return json({ error: 'challenge_closed', challenge_id: challenge.id }, 410);
  if (challenge.status !== 'published') return json({ error: 'challenge_not_published' }, 403);

  // 2) 查题目（含 correct_option，仅 service_role 可读）
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, position, correct_option')
    .eq('challenge_id', challenge.id)
    .order('position');

  if (qErr) return json({ error: 'db_error', detail: qErr.message }, 500);
  if (!questions || questions.length === 0) {
    return json({ error: 'no_questions' }, 500);
  }

  // 3) 获取/创建 participant
  const tokenHash = await sha256Hex(anon_token);
  let participantId: string;

  const { data: existingP } = await supabase
    .from('participants')
    .select('id')
    .eq('anon_token_hash', tokenHash)
    .maybeSingle();

  if (existingP) {
    participantId = existingP.id;
  } else {
    const { data: created, error: pErr } = await supabase
      .from('participants')
      .insert({ anon_token_hash: tokenHash })
      .select('id')
      .single();
    if (pErr || !created) return json({ error: 'create_participant_failed' }, 500);
    participantId = created.id;
  }

  // 4) 先查是否已有 submission（避免后面 INSERT 失败时的歧义）
  const { data: existingSub } = await supabase
    .from('submissions')
    .select('id, score, title_label, share_slug, created_at')
    .eq('challenge_id', challenge.id)
    .eq('participant_id', participantId)
    .maybeSingle();

  if (existingSub) {
    // 重复提交：返回已有记录，不报错
    return json(
      {
        submission_id: existingSub.id,
        score: existingSub.score,
        title_label: existingSub.title_label,
        share_slug: existingSub.share_slug,
        already_submitted: true,
      },
      200,
    );
  }

  // 5) 服务端计分
  let score = 0;
  const perQuestionCorrect: boolean[] = [];
  for (let i = 0; i < questions.length; i++) {
    const correct = questions[i].correct_option === answers[i];
    perQuestionCorrect.push(correct);
    if (correct) score++;
  }
  const titleLabel = scoreToTitle(score);

  // 6) 生成唯一 share_slug
  const shareSlug = await generateUniqueShareSlug(supabase);

  // 7) 插入 submission（依赖 UNIQUE 约束做最后幂等保险）
  const { data: inserted, error: insErr } = await supabase
    .from('submissions')
    .insert({
      challenge_id: challenge.id,
      participant_id: participantId,
      nickname: trimmedNick,
      answers,
      score,
      title_label: titleLabel,
      share_slug: shareSlug,
    })
    .select('id, score, title_label, share_slug')
    .single();

  if (insErr) {
    // 唯一冲突（并发）：再查一次
    if (insErr.code === '23505') {
      const { data: retry } = await supabase
        .from('submissions')
        .select('id, score, title_label, share_slug')
        .eq('challenge_id', challenge.id)
        .eq('participant_id', participantId)
        .maybeSingle();
      if (retry) {
        return json(
          {
            submission_id: retry.id,
            score: retry.score,
            title_label: retry.title_label,
            share_slug: retry.share_slug,
            already_submitted: true,
          },
          200,
        );
      }
    }
    return json({ error: 'insert_failed', detail: insErr.message }, 500);
  }

  return json(
    {
      submission_id: inserted.id,
      score: inserted.score,
      title_label: inserted.title_label,
      share_slug: inserted.share_slug,
      already_submitted: false,
    },
    200,
  );
});

async function generateUniqueShareSlug(supabase: ReturnType<typeof createClient>): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const slug = generateSlug(10);
    const { data } = await supabase
      .from('submissions')
      .select('id')
      .eq('share_slug', slug)
      .maybeSingle();
    if (!data) return slug;
  }
  throw new Error('无法生成唯一 share_slug');
}

function generateSlug(len: number): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
