import { useState } from 'react';
import { type DraftChallenge, validateDraft } from '@/types/challenge';
import { supabase } from '@/lib/supabase';

export interface PublishSuccess {
  challengeId: string;
  inviteSlug: string;
  manageSlug: string;
  manageToken: string;
}

export interface PublishError {
  code: string;
  message: string;
}

/**
 * 发布挑战（调用 publish-challenge Edge Function）
 * 注意：manageToken 仅在成功后返回一次，前端需立刻引导复制
 */
export function usePublish() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<PublishSuccess | null>(null);
  const [error, setError] = useState<PublishError | null>(null);

  const publish = async (draft: DraftChallenge) => {
    const v = validateDraft(draft);
    if (!v.ok) {
      setError({ code: 'invalid_draft', message: v.reason });
      return null;
    }
    if (!supabase) {
      setError({ code: 'no_supabase', message: 'Supabase 未配置' });
      return null;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke<PublishSuccess>(
        'publish-challenge',
        {
          body: {
            title: draft.title.trim(),
            questions: draft.questions.map((q) => ({
              text: q.text.trim(),
              options: q.options.map((o) => o.trim()),
              correct_option: q.correctOption,
            })),
          },
        },
      );

      if (fnErr) {
        let message = fnErr.message;
        try {
          const parsed = JSON.parse(fnErr.message);
          message = parsed.error || message;
        } catch {
          /* keep original */
        }
        setError({ code: 'invoke_failed', message });
        return null;
      }

      if (!data) {
        setError({ code: 'no_data', message: '发布失败：服务器无响应' });
        return null;
      }

      setSuccess(data);
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误';
      setError({ code: 'network_error', message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSuccess(null);
    setError(null);
  };

  return { loading, success, error, publish, reset };
}
