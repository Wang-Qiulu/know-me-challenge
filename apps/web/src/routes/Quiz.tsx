import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/track';

interface Question {
  id: string;
  position: number;
  text: string;
  options: string[];
}

interface ParticipantSession {
  participant_id: string;
  challenge_id: string;
  anon_token: string;
  nickname?: string; // 阶段 3 没存，这里兜底为 ''
}

const STORAGE_KEY = (slug: string) => `kmc:participant:${slug}`;

export default function Quiz() {
  const { inviteSlug } = useParams<{ inviteSlug: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]); // 长度 = 5，初始 null
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // 1) 读取 session + 加载题目
  useEffect(() => {
    if (!inviteSlug) return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY(inviteSlug));
      if (!raw) {
        // 路由守卫：没 session 就回邀请入口
        navigate(`/c/${inviteSlug}`, { replace: true });
        return;
      }
      const s = JSON.parse(raw) as ParticipantSession;
      setSession(s);
      // nickname 在 InviteEntry 没写入，这里从 localStorage 读
      try {
        const nick = window.localStorage.getItem('kmc:last_nickname') ?? '';
        if (nick) s.nickname = nick;
      } catch {
        /* noop */
      }

      loadQuestions(s.challenge_id);
    } catch {
      navigate(`/c/${inviteSlug}`, { replace: true });
    }
  }, [inviteSlug, navigate]);

  async function loadQuestions(challengeId: string) {
    if (!supabase) {
      setError('Supabase 未配置');
      setLoading(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from('questions_public')
      .select('id, position, text, options')
      .eq('challenge_id', challengeId)
      .order('position');
    if (qErr) {
      setError(`加载题目失败：${qErr.message}`);
      setLoading(false);
      return;
    }
    if (!data || data.length !== 5) {
      setError('题目数量异常，请联系创建者');
      setLoading(false);
      return;
    }
    setQuestions(data as Question[]);
    setAnswers(new Array(data.length).fill(null));
    setLoading(false);
  }

  // 2) 选择答案
  const selectOption = (optionIdx: number) => {
    if (!questions.length) return;
    const next = [...answers];
    next[currentIdx] = optionIdx;
    setAnswers(next);
  };

  // 3) 切换题
  const gotoPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const gotoNext = () => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1));

  // 4) 提交
  const allAnswered = answers.length === 5 && answers.every((a) => a !== null);

  const handleSubmit = async () => {
    if (!session || !inviteSlug) return;
    if (!allAnswered) {
      setError('请先回答全部 5 道题');
      return;
    }
    if (!supabase) {
      setError('Supabase 未配置');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const { data, error: subErr } = await supabase.functions.invoke<{
        submission_id: string;
        score: number;
        title_label: string;
        share_slug: string;
        already_submitted: boolean;
      }>('submit-quiz', {
        body: {
          invite_slug: inviteSlug,
          anon_token: session.anon_token,
          nickname: (session.nickname || '').trim() || '匿名',
          answers: answers.map((a) => a ?? 0),
        },
      });

      if (subErr || !data) {
        setError(`提交失败：${subErr?.message ?? '未知错误'}`);
        setSubmitting(false);
        return;
      }

      track('quiz_submitted', { score: data.score });
      navigate(`/c/${inviteSlug}/result/${data.share_slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交异常');
      setSubmitting(false);
    }
  };

  // —— 渲染分支 ——
  if (loading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-3 pt-6 text-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          加载题目中…
        </CardContent>
      </Card>
    );
  }

  if (error && questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>加载失败</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button asChild variant="outline">
            <Link to={`/c/${inviteSlug}`}>返回</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const q = questions[currentIdx];
  const selected = answers[currentIdx];
  const answeredCount = answers.filter((a) => a !== null).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* 顶部进度 */}
      <header className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            第 {currentIdx + 1} / {questions.length} 题
          </span>
          <span>
            已答 {answeredCount} / {questions.length}
          </span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* 当前题目 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{q.text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt, oi) => (
            <label
              key={oi}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors ${
                selected === oi
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-input hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name={`q-${currentIdx}`}
                checked={selected === oi}
                onChange={() => selectOption(oi)}
                className="accent-primary h-4 w-4"
              />
              <span>{opt}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* 底部错误提示 */}
      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
          {error}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={gotoPrev} disabled={currentIdx === 0}>
          上一题
        </Button>
        {currentIdx < questions.length - 1 ? (
          <Button className="flex-1" onClick={gotoNext} disabled={selected === null}>
            下一题
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? '提交中…' : '提交'}
          </Button>
        )}
      </div>

      {!allAnswered && currentIdx === questions.length - 1 && (
        <p className="text-muted-foreground text-center text-xs">
          还有 {questions.length - answeredCount} 道题未答，可点击上方题号切换
        </p>
      )}
    </div>
  );
}
