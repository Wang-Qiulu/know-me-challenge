import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 创建挑战页 / 邀请链接入口（昵称输入）
 * 当前为阶段 0 的占位 UI，真实流程在阶段 2、3 完成
 */
export default function Create() {
  const { inviteSlug } = useParams<{ inviteSlug?: string }>();
  const isInvite = Boolean(inviteSlug);

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <h1 className="text-2xl font-semibold">{isInvite ? '加入挑战' : '创建你的挑战'}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{isInvite ? '输入你的昵称' : '5 道默认题目'}</CardTitle>
          <CardDescription>
            {isInvite ? '告诉朋友你希望他们怎么称呼你' : '从默认模板开始，编辑题目和你的真实答案'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            🚧 阶段 {isInvite ? '3' : '2'} 完成真实交互，当前为脚手架占位
          </p>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
