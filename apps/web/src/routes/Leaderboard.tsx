import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 排行榜
 * 阶段 6 完成真实交互：按分数降序、并列排名、当前用户高亮
 */
export default function Leaderboard() {
  const { inviteSlug } = useParams<{ inviteSlug: string }>();
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <h1 className="text-2xl font-semibold">排行榜</h1>
      <Card>
        <CardHeader>
          <CardTitle>挑战 {inviteSlug}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">🚧 阶段 6 完成真实交互，当前为脚手架占位</p>
        </CardContent>
      </Card>
      <Button asChild variant="outline">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
