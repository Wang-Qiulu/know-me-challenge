import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/track';

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
  const { shareSlug } = useParams<{ inviteSlug: string; shareSlug: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<ResultPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

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
        <CardContent className="text-muted-foreground flex items-center gap-3 pt-6 text-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {state === 'loading' ? '加载成绩中…' : errorMsg || '网络异常'}
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

  const baseUrl = window.location.origin;
  const myShareUrl = `${baseUrl}/c/${challenge.slug}/result/${shareSlug}`;
  const inviteUrl = `${baseUrl}/c/${challenge.slug}`;

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
          <CardTitle className="text-base">分享这份成绩</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">个人成绩链接（发给创建者）</span>
              <button
                type="button"
                onClick={() => {
                  track('result_shared');
                  copyText(myShareUrl, setCopiedShare);
                }}
                className="text-primary text-xs hover:underline"
              >
                {copiedShare ? '已复制 ✓' : '复制'}
              </button>
            </div>
            <div className="bg-muted/30 break-all rounded-md border px-3 py-2 font-mono text-xs">
              {myShareUrl}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">邀请朋友（让他们也来答）</span>
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
