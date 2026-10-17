import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { track } from '@/lib/track';

interface LocationState {
  challengeId: string;
  inviteSlug: string;
  manageSlug: string;
}

interface CopyState {
  invite: boolean;
  manageUrl: boolean;
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
  const [copy, setCopy] = useState<CopyState>({ invite: false, manageUrl: false });

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

      {/* 管理链接（自带凭证：点进去就能管理） */}
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">🔗 管理链接（私密）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            点进去可以修改标题、查看参与记录、关闭或删除挑战。
            <br />
            ⚠️ 这是私密链接，请勿公开分享。
          </p>
          <CopyableField
            label="管理链接"
            value={manageUrl}
            copied={copy.manageUrl}
            onCopy={() => copyTo(manageUrl, 'manageUrl')}
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
    </div>
  );
}
