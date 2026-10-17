import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/track';

interface ChallengeInfo {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'closed' | 'deleted';
  created_at: string;
  published_at: string | null;
  closed_at: string | null;
  submission_count: number;
}

interface ParticipantRow {
  id: string;
  nickname: string;
  score: number;
  title_label: string;
  created_at: string;
}

type ViewState =
  | { kind: 'enter_token' } // 第一次进入：输入 token
  | { kind: 'verifying' }
  | { kind: 'verified'; info: ChallengeInfo }
  | { kind: 'error'; message: string };

const SESSION_KEY = (slug: string) => `kmc:manage:${slug}`;

export default function Manage() {
  const { manageSlug } = useParams<{ manageSlug: string }>();
  const navigate = useNavigate();

  const [view, setView] = useState<ViewState>({ kind: 'enter_token' });
  const [token, setToken] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);

  // 进入页面：尝试用 sessionStorage 的 token 自动验证
  useEffect(() => {
    if (!manageSlug) return;
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(SESSION_KEY(manageSlug));
    } catch {
      // noop
    }
    if (stored) {
      setToken(stored);
      verify(stored);
    }
  }, [manageSlug]);

  // 加载参与者列表（仅 verified 之后）
  const loadParticipants = async (challengeId: string) => {
    const { data } = await supabase!
      .from('submissions')
      .select('id, nickname, score, title_label, created_at')
      .eq('challenge_id', challengeId)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true });
    setParticipants((data as ParticipantRow[]) || []);
  };

  // 验证 token
  const verify = async (t: string) => {
    if (!manageSlug) return;
    if (!supabase) {
      setView({ kind: 'error', message: '前端未配置 Supabase' });
      return;
    }
    setView({ kind: 'verifying' });
    const { data, error } = await supabase.functions.invoke<{ challenge: ChallengeInfo }>(
      'manage-challenge',
      {
        body: { manage_slug: manageSlug, manage_token: t, action: 'get_info' },
      },
    );
    if (error || !data) {
      const status = (error as { context?: { status?: number } })?.context?.status;
      const msg = (error as { message?: string })?.message ?? '';
      let userMsg = '凭证无效或挑战已删除';
      if (!status) {
        // 无 status 说明是网络/CORS/parse 错
        if (msg.includes('FunctionsFetchError') || msg.includes('Failed to send')) {
          userMsg = '网络异常，请检查后重试';
        } else {
          userMsg = `连接异常：${msg.slice(0, 80)}`;
        }
      } else if (status === 403) {
        userMsg = '管理 token 不正确，请重新输入';
      } else if (status === 404) {
        userMsg = '挑战不存在或已删除';
      } else if (status >= 500) {
        userMsg = `服务器异常（${status}），请稍后重试`;
      }
      setView({ kind: 'error', message: userMsg });
      // 只有 403（凭证错）才清 sessionStorage
      if (status === 403) {
        try {
          window.sessionStorage.removeItem(SESSION_KEY(manageSlug!));
        } catch {
          // noop
        }
      }
      return;
    }
    try {
      window.sessionStorage.setItem(SESSION_KEY(manageSlug), t);
    } catch {
      // noop
    }
    setEditTitle(data.challenge.title);
    setView({ kind: 'verified', info: data.challenge });
    await loadParticipants(data.challenge.id);
  };

  const handleSubmitToken = async () => {
    if (!token.trim()) {
      setView({ kind: 'error', message: '请输入管理 token' });
      return;
    }
    await verify(token.trim());
  };

  const callManage = async (action: string, extra?: Record<string, unknown>) => {
    if (!manageSlug || view.kind !== 'verified') return;
    if (!supabase) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean }>(
        'manage-challenge',
        {
          body: {
            manage_slug: manageSlug,
            manage_token: token,
            action,
            data: extra,
          },
        },
      );
      if (error || !data?.ok) {
        alert(`操作失败：${error?.message ?? '未知错误'}`);
        return;
      }
      // 重新拉取信息
      const { data: refreshed } = await supabase.functions.invoke<{ challenge: ChallengeInfo }>(
        'manage-challenge',
        { body: { manage_slug: manageSlug, manage_token: token, action: 'get_info' } },
      );
      if (refreshed?.challenge) {
        setView({ kind: 'verified', info: refreshed.challenge });
        await loadParticipants(refreshed.challenge.id);
        if (action === 'update_title') {
          setEditTitle(refreshed.challenge.title);
        }
      }
      if (action === 'close') track('challenge_closed');
      if (action === 'delete') {
        track('challenge_closed'); // delete 也算关闭
        try {
          window.sessionStorage.removeItem(SESSION_KEY(manageSlug));
        } catch {
          // noop
        }
        navigate('/');
        return;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTitle = () => {
    if (view.kind !== 'verified') return;
    if (editTitle.trim() === view.info.title) return;
    if (!editTitle.trim()) {
      alert('标题不能为空');
      return;
    }
    callManage('update_title', { title: editTitle.trim() });
  };

  const handleClose = () => {
    if (!confirm('确定关闭此挑战？关闭后无法再接受新提交')) return;
    callManage('close');
  };

  const handleReopen = () => {
    callManage('reopen');
  };

  const handleDelete = () => {
    if (
      !confirm('⚠️ 确定删除此挑战？\n删除后所有链接（邀请、成绩、管理）都会失效。\n此操作不可逆。')
    )
      return;
    callManage('delete');
  };

  // —— 渲染分支 ——
  if (view.kind === 'verifying') {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-3 pt-6 text-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          验证中…
        </CardContent>
      </Card>
    );
  }

  if (view.kind === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>无法进入管理</CardTitle>
          <CardDescription>{view.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={() => {
              setToken('');
              setView({ kind: 'enter_token' });
            }}
          >
            重新输入
          </Button>
          <Button asChild variant="link">
            <Link to="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (view.kind === 'enter_token') {
    return (
      <div className="flex flex-1 flex-col gap-6 py-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">管理挑战</h1>
          <p className="text-muted-foreground text-sm">
            请输入管理 token（发布成功时一次性展示过）
          </p>
        </header>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="管理 token"
              autoFocus
              className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
            <Button className="w-full" onClick={handleSubmitToken}>
              进入管理
            </Button>
          </CardContent>
        </Card>
        <Button asChild variant="link">
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  // view.kind === 'verified'
  const info = view.info;
  const statusLabel = {
    draft: '草稿',
    published: '已发布',
    closed: '已关闭',
    deleted: '已删除',
  }[info.status];

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">管理挑战</p>
        <h1 className="text-2xl font-semibold">{info.title}</h1>
        <p className="text-muted-foreground text-xs">
          状态：<span className="font-medium">{statusLabel}</span>
          {' · '}
          {info.submission_count} 人参与
        </p>
      </header>

      {/* 链接 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">链接</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <CopyRow
            label="邀请链接"
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/c/${info.slug}`}
          />
        </CardContent>
      </Card>

      {/* 修改标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">修改标题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
            maxLength={50}
            className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
          <p className="text-muted-foreground text-xs">{editTitle.length} / 50</p>
          <Button
            onClick={handleSaveTitle}
            disabled={submitting || editTitle.trim() === info.title}
          >
            保存
          </Button>
        </CardContent>
      </Card>

      {/* 状态管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">状态管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {info.status === 'published' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClose}
              disabled={submitting}
            >
              关闭挑战
            </Button>
          )}
          {info.status === 'closed' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleReopen}
              disabled={submitting}
            >
              重新开启
            </Button>
          )}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={submitting}
          >
            删除挑战
          </Button>
        </CardContent>
      </Card>

      {/* 参与者 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">参与者 ({participants.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {participants.length === 0 ? (
            <p className="text-muted-foreground px-6 py-4 text-sm">还没有人参与</p>
          ) : (
            <ol className="divide-y">
              {participants.map((p, idx) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="text-muted-foreground w-6 text-xs tabular-nums">{idx + 1}</span>
                  <span className="flex-1 truncate">{p.nickname}</span>
                  <span className="text-muted-foreground text-xs">{p.title_label}</span>
                  <span className="w-8 text-right font-semibold tabular-nums">{p.score}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="link">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{label}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              alert('复制失败');
            }
          }}
          className="text-primary text-xs hover:underline"
        >
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <div className="bg-muted/30 break-all rounded-md border px-3 py-2 font-mono text-xs">
        {value}
      </div>
    </div>
  );
}
