import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { track } from '@/lib/track';

interface LocationState {
  challengeId: string;
  inviteSlug: string;
  manageSlug: string;
  manageToken: string;
}

interface CopyState {
  invite: boolean;
  manageUrl: boolean;
  manageToken: boolean;
}

function CopyableField({
  label,
  value,
  hint,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  hint?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{label}</span>
        <button type="button" onClick={onCopy} className="text-primary text-xs hover:underline">
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <div className="bg-muted/30 break-all rounded-md border px-3 py-2 font-mono text-xs">
        {value}
      </div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export default function CreateSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const [copy, setCopy] = useState<CopyState>({
    invite: false,
    manageUrl: false,
    manageToken: false,
  });

  useEffect(() => {
    // 没有 state 直接进 → 回到首页
    if (!state) {
      navigate('/', { replace: true });
      return;
    }
    track('challenge_published');
  }, [state, navigate]);

  if (!state) return null;

  const baseUrl = window.location.origin;
  const inviteUrl = `${baseUrl}/c/${state.inviteSlug}`;
  const manageUrl = `${baseUrl}/m/${state.manageSlug}`;
  const manageToken = state.manageToken;

  const copyTo = async (text: string, key: keyof CopyState) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopy((c) => ({ ...c, [key]: true }));
      setTimeout(() => setCopy((c) => ({ ...c, [key]: false })), 2000);
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">🎉 挑战发布成功！</h1>
        <p className="text-muted-foreground text-sm">把链接发给朋友，让他们测测懂不懂你</p>
      </header>

      {/* 邀请链接 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📨 邀请链接（发给朋友）</CardTitle>
        </CardHeader>
        <CardContent>
          <CopyableField
            label="邀请链接"
            value={inviteUrl}
            copied={copy.invite}
            onCopy={() => copyTo(inviteUrl, 'invite')}
          />
        </CardContent>
      </Card>

      {/* 管理凭证（核心：明文一次性 + 强提示） */}
      <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-base text-amber-700 dark:text-amber-300">
            🔐 管理凭证（仅展示一次！）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            ⚠️ 请立即复制并妥善保管。丢失后只能删除挑战重建。
          </p>
          <CopyableField
            label="管理链接"
            value={manageUrl}
            copied={copy.manageUrl}
            onCopy={() => copyTo(manageUrl, 'manageUrl')}
          />
          <CopyableField
            label="管理 token（修改/关闭/删除时需要）"
            value={manageToken}
            hint="建议存到手机备忘录或密码管理器"
            copied={copy.manageToken}
            onCopy={() => copyTo(manageToken, 'manageToken')}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Button asChild size="lg">
          <Link to={`/c/${state.inviteSlug}/leaderboard`}>查看排行榜（目前为空）</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">返回首页</Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-center text-xs">
        凭据不会保存在浏览器，刷新本页后只能重新创建挑战。
      </p>
    </div>
  );
}
