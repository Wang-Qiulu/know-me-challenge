// supabase/functions/manage-challenge/index.ts
//
// 用途：管理挑战（查看 / 改标题 / 关闭 / 重新开启 / 删除）
// 权限：持有 manage_slug 即可操作（slug 本身就是凭证，10 字符 base36 ≈ 47 bits 熵）
// 入参：{ manage_slug, action, data? }
//   action: 'get_info' | 'update_title' | 'close' | 'reopen' | 'delete'
//   data:   { title?: string }  (update_title 时必填)
//
// 设计决策（V1.1 简化）：
//   - 不再要求 manage_token（用户体验上链接即可直接管理）
//   - manage_token_hash 字段保留在 DB（兼容老数据，不再写入/校验）
//   - 已删除挑战拒绝所有 action

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Action = 'get_info' | 'update_title' | 'close' | 'reopen' | 'delete';

interface ManageRequest {
  manage_slug?: string;
  action?: Action;
  data?: { title?: string };
}

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

  let body: ManageRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { manage_slug, action, data } = body;
  if (!manage_slug || !action) {
    return json({ error: 'missing_params' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) 查挑战（不再校验 token）
  const { data: challenge, error: cErr } = await supabase
    .from('challenges')
    .select('id, slug, manage_slug, title, status, created_at, published_at, closed_at')
    .eq('manage_slug', manage_slug)
    .maybeSingle();

  if (cErr) return json({ error: 'db_error', detail: cErr.message }, 500);
  if (!challenge) return json({ error: 'challenge_not_found' }, 404);
  if (challenge.status === 'deleted') {
    return json({ error: 'challenge_deleted' }, 403);
  }

  // 2) 执行 action
  switch (action) {
    case 'get_info': {
      const { count } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challenge.id);
      return json(
        {
          challenge: {
            id: challenge.id,
            slug: challenge.slug,
            title: challenge.title,
            status: challenge.status,
            created_at: challenge.created_at,
            published_at: challenge.published_at,
            closed_at: challenge.closed_at,
            submission_count: count ?? 0,
          },
        },
        200,
      );
    }

    case 'update_title': {
      const title = data?.title?.trim();
      if (!title || title.length > 50) {
        return json({ error: 'invalid_title' }, 400);
      }
      const { error: uErr } = await supabase
        .from('challenges')
        .update({ title })
        .eq('id', challenge.id);
      if (uErr) return json({ error: 'update_failed', detail: uErr.message }, 500);
      return json({ ok: true, title }, 200);
    }

    case 'close': {
      if (challenge.status === 'closed') {
        return json({ ok: true, already_closed: true }, 200);
      }
      const { error: uErr } = await supabase
        .from('challenges')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', challenge.id);
      if (uErr) return json({ error: 'close_failed', detail: uErr.message }, 500);
      return json({ ok: true }, 200);
    }

    case 'reopen': {
      if (challenge.status !== 'closed') {
        return json({ error: 'not_closed' }, 400);
      }
      const { error: uErr } = await supabase
        .from('challenges')
        .update({ status: 'published', closed_at: null })
        .eq('id', challenge.id);
      if (uErr) return json({ error: 'reopen_failed', detail: uErr.message }, 500);
      return json({ ok: true }, 200);
    }

    case 'delete': {
      // 软删：status='deleted'，关联数据保留（ON DELETE CASCADE 不会触发）
      const { error: uErr } = await supabase
        .from('challenges')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', challenge.id);
      if (uErr) return json({ error: 'delete_failed', detail: uErr.message }, 500);
      return json({ ok: true }, 200);
    }

    default:
      return json({ error: 'unknown_action' }, 400);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
