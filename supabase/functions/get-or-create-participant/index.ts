// supabase/functions/get-or-create-participant/index.ts
//
// 用途：根据 invite_slug + 浏览器 anon_token，获取或创建稳定的匿名参与身份
// 权限：anon 可调用（前端在进入邀请链接时调用）
// 入参：{ invite_slug: string, anon_token: string }
// 出参：{ participant_id, challenge_id, challenge_status }
//
// 流程：
//   1) 查 challenges by slug（用 service_role，可以读 manage_token_hash 等敏感字段）
//   2) 校验 status == 'published'
//   3) SHA256(anon_token) → 在 participants 表里 upsert
//   4) 返回 participant_id 和 challenge 状态

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// SHA256 hex
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { invite_slug?: string; anon_token?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { invite_slug, anon_token } = body;
  if (!invite_slug || !anon_token) {
    return new Response(JSON.stringify({ error: 'missing_params' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (anon_token.length < 16 || anon_token.length > 128) {
    return new Response(JSON.stringify({ error: 'invalid_anon_token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) 查挑战
  const { data: challenge, error: cErr } = await supabase
    .from('challenges')
    .select('id, slug, status')
    .eq('slug', invite_slug)
    .neq('status', 'deleted')
    .maybeSingle();

  if (cErr) {
    return new Response(JSON.stringify({ error: 'db_error', detail: cErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!challenge) {
    return new Response(JSON.stringify({ error: 'challenge_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (challenge.status === 'closed') {
    return new Response(JSON.stringify({ error: 'challenge_closed', challenge_id: challenge.id }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (challenge.status !== 'published') {
    return new Response(JSON.stringify({ error: 'challenge_not_published' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2) 计算 anon_token hash
  const tokenHash = await sha256Hex(anon_token);

  // 3) 查找或创建 participant
  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('anon_token_hash', tokenHash)
    .maybeSingle();

  let participantId: string;

  if (existing) {
    participantId = existing.id;
  } else {
    const { data: created, error: pErr } = await supabase
      .from('participants')
      .insert({ anon_token_hash: tokenHash })
      .select('id')
      .single();

    if (pErr || !created) {
      return new Response(
        JSON.stringify({ error: 'create_participant_failed', detail: pErr?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
    participantId = created.id;
  }

  return new Response(
    JSON.stringify({
      participant_id: participantId,
      challenge_id: challenge.id,
      challenge_status: challenge.status,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
