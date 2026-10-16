import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 邀请链接入口页
 * 阶段 3 待开发：
 *   - 输入昵称
 *   - localStorage 生成/读取 anon_token
 *   - 调用 get-or-create-participant
 *   - 状态分流：挑战不存在 / 已关闭 / 已答题 / 未答题
 */
export default function InviteEntry() {
  const { inviteSlug } = useParams<{ inviteSlug: string }>();
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
          <input
            type="text"
            placeholder="例如：小周"
            maxLength={12}
            disabled
            className="border-input bg-muted/30 flex h-11 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
          />
          <Button disabled className="w-full">
            开始答题
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            🚧 阶段 3 待开发 · 挑战 {inviteSlug}
          </p>
        </CardContent>
      </Card>

      <Button asChild variant="link">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
