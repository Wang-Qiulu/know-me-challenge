import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 成绩页
 * 阶段 5 完成真实交互：分数 + 称号 + 逐题对照 + 分享链接
 */
export default function Result() {
  const { inviteSlug, shareSlug } = useParams<{ inviteSlug: string; shareSlug: string }>();
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <h1 className="text-2xl font-semibold">你的成绩</h1>
      <Card>
        <CardHeader>
          <CardTitle>分数 / 称号</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            挑战 {inviteSlug} · 分享码 {shareSlug}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            🚧 阶段 5 完成真实交互，当前为脚手架占位
          </p>
        </CardContent>
      </Card>
      <Button asChild>
        <Link to={`/c/${inviteSlug}/leaderboard`}>查看排行榜</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
