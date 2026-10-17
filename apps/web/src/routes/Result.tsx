import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/track';
import { RESULT_TEMPLATES, renderResultTemplate, type ResultTemplate } from '@/lib/share-templates';

interface Question {
  position: number;
  text: string;
  options: string[];
  correct_option: number;
}

interface Submission {
  id: string;
  nickname: string;
  score: number;
  title_label: string;
  answers: number[];
  created_at: string;
}

interface Challenge {
  id: string;
  slug: string;
  title: string;
  status: string;
}

interface ResultPayload {
  challenge: Challenge;
  submission: Submission;
  questions: Question[];
  per_question_correct: boolean[];
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'network_error' | 'config_error';

export default function Result() {
  const { shareSlug } = useParams<{ shareSlug: string; inviteSlug: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<ResultPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [resultShareTpl, setResultShareTpl] = useState<ResultTemplate>(() => RESULT_TEMPLATES[0]);

  // Hooks 必须在所有 early return 之前（react-hooks/rules-of-hooks）
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const myShareUrl =
    shareSlug && data ? `${baseUrl}/c/${data.challenge.slug}/result/${shareSlug}` : '';
  const inviteUrl = data ? `${baseUrl}/c/${data.challenge.slug}` : '';
  const resultShareText = useMemo(
    () => (myShareUrl ? renderResultTemplate(resultShareTpl, myShareUrl) : ''),
    [resultShareTpl, myShareUrl],
  );

  useEffect(() => {
    if (!shareSlug) return;
    if (!supabase) {
      setState('config_error');
      return;
    }
    track('result_viewed');

    (async () => {
      try {
        const { data: d, error: e } = await supabase.functions.invoke<ResultPayload>(
          'get-submission',
          { body: { share_slug: shareSlug } },
        );
        if (e) {
          const status = (e as { context?: { status?: number } }).context?.status;
          if (status === 404) {
            setState('not_found');
            return;
          }
          setErrorMsg((e as { message?: string }).message ?? '加载失败');
          setState('network_error');
          return;
        }
        if (!d) {
          setState('network_error');
          setErrorMsg('服务器无响应');
          return;
        }
        setData(d);
        setState('ready');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '未知异常');
        setState('network_error');
      }
    })();
  }, [shareSlug]);

  if (state === 'config_error') {
    return (
      <Card>
        <CardContent className="text-destructive pt-6 text-sm">前端未配置 Supabase</CardContent>
      </Card>
    );
  }

  if (state === 'not_found') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>成绩不存在</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">这个分享链接可能无效或已被删除</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'network_error' || (state === 'loading' && !data)) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Loading text={state === 'loading' ? '加载成绩中…' : errorMsg || '网络异常'} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { challenge, submission, questions, per_question_correct } = data;
  const fullCount = questions.length;
  const correctCount = submission.score;

  const copyText = async (text: string, setter: (b: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* 头部：分数 + 称号 */}
      <header className="from-primary/5 to-primary/15 rounded-lg border bg-gradient-to-br p-6 text-center">
        <p className="text-muted-foreground text-sm">{submission.nickname} 的成绩</p>
        <div className="mt-2 flex items-baseline justify-center gap-2">
          <span className="text-primary text-5xl font-bold">{correctCount}</span>
          <span className="text-muted-foreground text-2xl">/ {fullCount}</span>
        </div>
        <p className="mt-3 text-2xl font-semibold">{submission.title_label}</p>
      </header>

      {/* 逐题对照 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">逐题对照</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, qi) => {
            const userAns = submission.answers[qi];
            const correctAns = q.correct_option;
            const isRight = per_question_correct[qi];
            return (
              <div
                key={qi}
                className={`rounded-md border p-3 ${
                  isRight
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : 'border-destructive/40 bg-destructive/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium">{qi + 1}.</span>
                  <span className="flex-1 text-sm">{q.text}</span>
                  <span
                    className={`text-xs font-semibold ${
                      isRight ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                    }`}
                  >
                    {isRight ? '✓ 对' : '✗ 错'}
                  </span>
                </div>
                <div className="mt-2 space-y-1 pl-5 text-xs">
                  <p className="text-muted-foreground">
                    你的答案：
                    <span className="text-foreground font-medium">
                      {q.options[userAns] ?? '（未答）'}
                    </span>
                  </p>
                  {!isRight && (
                    <p className="text-muted-foreground">
                      正确答案：
                      <span className="text-foreground font-medium">{q.options[correctAns]}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 分享 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">分享给创建者</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 个人成绩链接 + 营销文案 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                文案风格：{resultShareTpl.emoji} {resultShareTpl.title}
              </span>
              <button
                type="button"
                onClick={() => {
                  let next = resultShareTpl;
                  while (next.id === resultShareTpl.id) {
                    next = RESULT_TEMPLATES[Math.floor(Math.random() * RESULT_TEMPLATES.length)];
                  }
                  setResultShareTpl(next);
                  setCopiedShare(false);
                }}
                className="text-primary text-xs hover:underline"
              >
                换一个
              </button>
            </div>
            <pre className="bg-muted/30 whitespace-pre-wrap break-words rounded-md border px-3 py-2 text-xs">
              {resultShareText}
            </pre>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              track('result_shared');
              copyText(resultShareText, setCopiedShare);
            }}
          >
            {copiedShare ? '已复制 ✓' : '复制整段文案'}
          </Button>
          <details className="text-muted-foreground text-xs">
            <summary className="hover:text-foreground cursor-pointer">只复制纯链接</summary>
            <div className="bg-muted/20 mt-2 break-all rounded-md border px-3 py-2 font-mono text-xs">
              {myShareUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => copyText(myShareUrl, setCopiedShare)}
            >
              只复制链接
            </Button>
          </details>
        </CardContent>
      </Card>

      {/* 邀请朋友（让创建者也能传播） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">邀请朋友也来答</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">邀请链接</span>
              <button
                type="button"
                onClick={() => copyText(inviteUrl, setCopiedInvite)}
                className="text-primary text-xs hover:underline"
              >
                {copiedInvite ? '已复制 ✓' : '复制'}
              </button>
            </div>
            <div className="bg-muted/30 break-all rounded-md border px-3 py-2 font-mono text-xs">
              {inviteUrl}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex flex-col gap-2">
        <Button asChild size="lg">
          <Link to={`/c/${challenge.slug}/leaderboard`}>查看排行榜</Link>
        </Button>
        <Button asChild variant="outline" size="lg" onClick={() => track('challenge_create_again')}>
          <Link to="/create">创建自己的挑战</Link>
        </Button>
        <Button asChild variant="link">
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    </div>
  );
}
