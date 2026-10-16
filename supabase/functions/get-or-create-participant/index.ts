// supabase/functions/get-or-create-participant/index.ts
//
// 用途：根据 invite_slug + 浏览器 anon_token，获取或创建稳定的匿名参与身份
// 权限：anon 可调用
// 入参：{ invite_slug, anon_token }
// 出参：
//   {
//     participant_id,
//     challenge_id,
//     challenge_status,                // 'published' | 'closed'
//     has_submission,                  // boolean
//     submission: null | {
//       share_slug, score, title_label,
//     }
//   }
//
// 调用一次即可拿到前端需要的所有信息（避免 RLS 阻挡下的多次查询）

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// 显式 CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body: { invite_slug?: string; anon_token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { invite_slug, anon_token } = body;
  if (!invite_slug || !anon_token) {
    return json({ error: 'missing_params' }, 400);
  }
  if (anon_token.length < 16 || anon_token.length > 128) {
    return json({ error: 'invalid_anon_token' }, 400);
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
    return json({ error: 'db_error', detail: cErr.message }, 500);
  }
  if (!challenge) {
    return json({ error: 'challenge_not_found' }, 404);
  }

  if (challenge.status === 'closed') {
    return json({ error: 'challenge_closed', challenge_id: challenge.id }, 410);
  }
  if (challenge.status !== 'published') {
    return json({ error: 'challenge_not_published' }, 403);
  }

  // 2) 获取/创建 participant
  const tokenHash = await sha256Hex(anon_token);
  let participantId: string;

  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('anon_token_hash', tokenHash)
    .maybeSingle();

  if (existing) {
    participantId = existing.id;
  } else {
    const { data: created, error: pErr } = await supabase
      .from('participants')
      .insert({ anon_token_hash: tokenHash })
      .select('id')
      .single();

    if (pErr || !created) {
      return json({ error: 'create_participant_failed', detail: pErr?.message }, 500);
    }
    participantId = created.id;
  }

  // 3) 查是否已有 submission
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, share_slug, score, title_label')
    .eq('challenge_id', challenge.id)
    .eq('participant_id', participantId)
    .maybeSingle();

  return json(
    {
      participant_id: participantId,
      challenge_id: challenge.id,
      challenge_status: challenge.status,
      has_submission: !!submission,
      submission: submission
        ? {
            share_slug: submission.share_slug,
            score: submission.score,
            title_label: submission.title_label,
          }
        : null,
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
