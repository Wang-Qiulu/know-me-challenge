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

type LoadState =
  { kind: 'loading' } | { kind: 'ready'; info: ChallengeInfo } | { kind: 'error'; message: string };

/**
 * 管理页（V1.1 简化）
 *
 * 设计：管理链接本身就是凭证 → 进入 /m/:manageSlug 直接展示管理面板
 * 不再需要 manage_token 输入步骤（V1.0 PRD 原本需要，已废弃）
 *
 * 支持的 action：get_info / update_title / close / reopen / delete / load participants
 */
export default function Manage() {
  const { manageSlug } = useParams<{ manageSlug: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [editTitle, setEditTitle] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);

  // 进入页面：直接调 get_info（manage_slug 本身就是凭证）
  useEffect(() => {
    if (!manageSlug) return;
    if (!supabase) {
      setState({ kind: 'error', message: '前端未配置 Supabase' });
      return;
    }
    loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageSlug]);

  const loadInfo = async () => {
    if (!manageSlug) return;
    if (!supabase) {
      setState({ kind: 'error', message: '前端未配置 Supabase' });
      return;
    }
    setState({ kind: 'loading' });
    const { data, error } = await supabase.functions.invoke<{ challenge: ChallengeInfo }>(
      'manage-challenge',
      { body: { manage_slug: manageSlug, action: 'get_info' } },
    );
    if (error || !data?.challenge) {
      const status = (error as { context?: { status?: number } })?.context?.status;
      const msg = (error as { message?: string })?.message ?? '';
      let userMsg = '无法加载挑战';
      if (status === 404) userMsg = '挑战不存在';
      else if (status === 403) userMsg = '挑战已被删除';
      else if (!status && (msg.includes('FunctionsFetchError') || msg.includes('Failed to send')))
        userMsg = '网络异常，请检查后重试';
      else if (msg) userMsg = `连接异常：${msg.slice(0, 80)}`;
      setState({ kind: 'error', message: userMsg });
      return;
    }
    setEditTitle(data.challenge.title);
    setState({ kind: 'ready', info: data.challenge });
    await loadParticipants(data.challenge.id);
  };

  const loadParticipants = async (challengeId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('submissions')
      .select('id, nickname, score, title_label, created_at')
      .eq('challenge_id', challengeId)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true });
    setParticipants((data as ParticipantRow[]) || []);
  };

  const callAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!manageSlug || state.kind !== 'ready') return;
    if (!supabase) {
      alert('前端未配置 Supabase');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean }>(
        'manage-challenge',
        {
          body: {
            manage_slug: manageSlug,
            action,
            data: extra,
          },
        },
      );
      if (error || !data?.ok) {
        alert(`操作失败：${error?.message ?? '未知错误'}`);
        return;
      }
      // 重新拉取
      await loadInfo();
      if (action === 'close') track('challenge_closed');
      if (action === 'delete') {
        track('challenge_closed');
        navigate('/');
        return;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTitle = () => {
    if (state.kind !== 'ready') return;
    if (editTitle.trim() === state.info.title) return;
    if (!editTitle.trim()) {
      alert('标题不能为空');
      return;
    }
    callAction('update_title', { title: editTitle.trim() });
  };

  const handleClose = () => {
    if (!confirm('确定关闭此挑战？关闭后无法再接受新提交')) return;
    callAction('close');
  };

  const handleReopen = () => {
    callAction('reopen');
  };

  const handleDelete = () => {
    if (
      !confirm('⚠️ 确定删除此挑战？\n删除后所有链接（邀请、成绩、管理）都会失效。\n此操作不可逆。')
    )
      return;
    callAction('delete');
  };

  // —— 渲染分支 ——
  if (state.kind === 'loading') {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-3 pt-6 text-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          加载管理面板…
        </CardContent>
      </Card>
    );
  }

  if (state.kind === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>无法打开管理</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">返回首页</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ready
  const info = state.info;
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
        <CardContent>
          <CopyRow
            label="邀请链接（发给朋友）"
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

      <p className="text-muted-foreground text-center text-xs">
        ⚠️ 这是私密管理链接，请勿公开分享。
      </p>

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
