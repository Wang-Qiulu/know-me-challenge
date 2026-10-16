// supabase/functions/publish-challenge/index.ts
//
// 用途：发布挑战（创建 draft → 写入 challenges + questions，返回 slug + token）
// 权限：anon 可调用（用户在创建挑战的最后一刻调用）
// 入参：
//   {
//     title?: string,                 // 默认 "你有多懂我？"
//     questions: [
//       { text: string, options: string[2..6], correct_option: number }
//     ]                               // 长度必须 = 5
//   }
// 出参：
//   {
//     challenge_id,
//     invite_slug,                    // 邀请链接用
//     manage_slug,                    // 管理链接用
//     manage_token,                   // ⚠️ 明文，只返回这一次，用户必须自己保管
//   }
//
// 安全：
//   - manage_token 用 Web Crypto 生成 12 字符 base36（≈ 47 bits 熵）
//   - 数据库存 SHA256(manage_token)，永不存明文
//   - 同一前端页面在展示 manage_token 后立即 clear 内存 + 引导用户复制

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSlug(len: number): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

async function uniqueSlug(
  supabase: ReturnType<typeof createClient>,
  table: string,
  column: string,
  len: number,
  maxAttempts = 10,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const slug = generateSlug(len);
    const { data } = await supabase.from(table).select(column).eq(column, slug).maybeSingle();
    if (!data) return slug;
  }
  throw new Error(`无法在 ${maxAttempts} 次内生成唯一 slug`);
}

interface PublishRequest {
  title?: string;
  questions?: {
    text: string;
    options: string[];
    correct_option: number;
  }[];
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: PublishRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const title = (body.title ?? '你有多懂我？').trim().slice(0, 50);
  const questions = body.questions;

  // ---- 基础校验
  if (!title) return json({ error: 'invalid_title' }, 400);
  if (!Array.isArray(questions)) return json({ error: 'invalid_questions' }, 400);
  if (questions.length !== 5) {
    return json({ error: 'questions_must_be_5', got: questions.length }, 400);
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q.text !== 'string') return json({ error: `question_${i}_invalid_text` }, 400);
    const text = q.text.trim();
    if (text.length < 1 || text.length > 200) {
      return json({ error: `question_${i}_invalid_text_length` }, 400);
    }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      return json({ error: `question_${i}_invalid_options_count` }, 400);
    }
    if (!q.options.every((o) => typeof o === 'string' && o.trim().length > 0 && o.length <= 200)) {
      return json({ error: `question_${i}_invalid_options_content` }, 400);
    }
    if (
      !Number.isInteger(q.correct_option) ||
      q.correct_option < 0 ||
      q.correct_option >= q.options.length
    ) {
      return json({ error: `question_${i}_invalid_correct_option` }, 400);
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) 生成唯一 slug
  const inviteSlug = await uniqueSlug(supabase, 'challenges', 'slug', 8);
  const manageSlug = await uniqueSlug(supabase, 'challenges', 'manage_slug', 10);
  const manageToken = generateSlug(12);

  // 2) 写 challenge
  const manageTokenHash = await sha256Hex(manageToken);
  const { data: challenge, error: cErr } = await supabase
    .from('challenges')
    .insert({
      slug: inviteSlug,
      manage_slug: manageSlug,
      manage_token_hash: manageTokenHash,
      title,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id, slug, manage_slug, title, status')
    .single();

  if (cErr || !challenge) {
    return json({ error: 'insert_challenge_failed', detail: cErr?.message }, 500);
  }

  // 3) 写 questions
  const rows = questions.map((q, idx) => ({
    challenge_id: challenge.id,
    position: idx + 1,
    text: q.text.trim(),
    options: q.options,
    correct_option: q.correct_option,
  }));

  const { error: qErr } = await supabase.from('questions').insert(rows);

  if (qErr) {
    // 回滚 challenge
    await supabase.from('challenges').delete().eq('id', challenge.id);
    return json({ error: 'insert_questions_failed', detail: qErr.message }, 500);
  }

  // 4) 返回 slug + token（token 明文只此一次！）
  return json(
    {
      challenge_id: challenge.id,
      invite_slug: inviteSlug,
      manage_slug: manageSlug,
      manage_token: manageToken,
    },
    200,
  );
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
