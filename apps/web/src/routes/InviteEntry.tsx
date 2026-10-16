import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnonToken } from '@/hooks/useAnonToken';
import { track } from '@/lib/track';
import { supabase } from '@/lib/supabase';

interface ParticipantInfo {
  participant_id: string;
  challenge_id: string;
  challenge_status: string;
  has_submission: boolean;
  submission: { share_slug: string; score: number; title_label: string } | null;
}

/** 状态机：loading | ready | closed | not_found | network_error */
type EntryState = 'loading' | 'ready' | 'closed' | 'not_found' | 'network_error' | 'config_error';

export default function InviteEntry() {
  const { inviteSlug } = useParams<{ inviteSlug: string }>();
  const navigate = useNavigate();
  const { token: anonToken } = useAnonToken();

  const [state, setState] = useState<EntryState>('loading');
  const [info, setInfo] = useState<ParticipantInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 进入页面：调用 Edge Function 拿身份 + 状态
  useEffect(() => {
    if (!inviteSlug || !anonToken) return;
    if (!supabase) {
      setState('config_error');
      return;
    }
    setState('loading');
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<ParticipantInfo>(
          'get-or-create-participant',
          { body: { invite_slug: inviteSlug, anon_token: anonToken } },
        );

        if (error) {
          // FunctionsHttpError 包含 HTTP 状态码
          const ctx = (error as { context?: { status?: number } }).context;
          const status = ctx?.status;
          if (status === 404) {
            setState('not_found');
            return;
          }
          if (status === 410) {
            setState('closed');
            return;
          }
          // FunctionsFetchError（CORS/网络）走这个分支
          const msg = (error as { message?: string }).message ?? '未知错误';
          if (msg.includes('FunctionsFetchError') || msg.includes('Failed to send')) {
            setErrorMsg('网络异常，请检查网络后重试');
          } else {
            setErrorMsg(msg);
          }
          setState('network_error');
          return;
        }

        if (!data) {
          setErrorMsg('服务器无响应');
          setState('network_error');
          return;
        }

        setInfo(data);

        // 已答题：直接跳到成绩页
        if (data.has_submission && data.submission) {
          track('result_viewed');
          navigate(`/c/${inviteSlug}/result/${data.submission.share_slug}`, { replace: true });
          return;
        }

        setState('ready');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : '未知异常');
        setState('network_error');
      }
    })();
  }, [inviteSlug, anonToken, navigate]);

  const handleStart = () => {
    if (!anonToken || !inviteSlug || !info) return;
    // 把 participant 信息存到 sessionStorage，让 quiz 页用
    try {
      window.sessionStorage.setItem(
        `kmc:participant:${inviteSlug}`,
        JSON.stringify({
          participant_id: info.participant_id,
          challenge_id: info.challenge_id,
          anon_token: anonToken,
        }),
      );
    } catch {
      // noop
    }
    track('quiz_started');
    navigate(`/c/${inviteSlug}/quiz`);
  };

  // —— 状态渲染 ——
  if (state === 'config_error') {
    return (
      <Card>
        <CardContent className="text-destructive pt-6 text-sm">
          前端未配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
        </CardContent>
      </Card>
    );
  }

  if (state === 'not_found') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>挑战不存在</CardTitle>
          <CardDescription>这个链接可能已被删除或失效</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'closed') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>挑战已关闭</CardTitle>
          <CardDescription>创建者已关闭此挑战，无法继续答题</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'network_error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>连接失败</CardTitle>
          <CardDescription>{errorMsg || '请稍后再试'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'loading' || !anonToken || !info) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-3 pt-6 text-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          正在准备挑战…
        </CardContent>
      </Card>
    );
  }

  // —— ready 状态：昵称输入 ——
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">📨 收到挑战邀请</p>
        <h1 className="text-2xl font-semibold">开始答题</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">请输入你的昵称</CardTitle>
          <CardDescription>告诉朋友你希望他们怎么称呼你</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <NicknameInput />
          <Button className="w-full" size="lg" onClick={handleStart}>
            开始答题
          </Button>
        </CardContent>
      </Card>

      <Button asChild variant="link">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}

/** 昵称输入子组件：本地 state，不影响主流程状态机 */
function NicknameInput() {
  const [nick, setNick] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem('kmc:last_nickname') ?? '';
    } catch {
      return '';
    }
  });

  return (
    <div className="space-y-1">
      <input
        type="text"
        value={nick}
        onChange={(e) => {
          const v = e.target.value.slice(0, 12);
          setNick(v);
          try {
            window.localStorage.setItem('kmc:last_nickname', v);
          } catch {
            // noop
          }
        }}
        placeholder="例如：小周"
        maxLength={12}
        className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
      />
      <p className="text-muted-foreground text-xs">昵称会显示在排行榜上。{nick.length} / 12</p>
    </div>
  );
}
