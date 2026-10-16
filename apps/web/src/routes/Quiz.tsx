import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 答题页
 * 阶段 4 完成真实交互：5 道单选题、进度条、上一题/下一题、提交校验、服务端计分
 */
export default function Quiz() {
  const { inviteSlug } = useParams<{ inviteSlug: string }>();
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">挑战 · {inviteSlug}</p>
        <h1 className="text-2xl font-semibold">开始答题</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>第 1 / 5 题</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">🚧 阶段 4 完成真实交互，当前为脚手架占位</p>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
