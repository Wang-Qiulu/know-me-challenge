import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 管理页
 * 阶段 7 完成真实交互：管理凭证校验、修改标题、关闭/删除、查看参与记录
 */
export default function Manage() {
  const { manageSlug } = useParams<{ manageSlug: string }>();
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <h1 className="text-2xl font-semibold">管理挑战</h1>
      <Card>
        <CardHeader>
          <CardTitle>管理凭证</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">管理码 {manageSlug}</p>
          <p className="text-muted-foreground mt-2 text-sm">
            🚧 阶段 7 完成真实交互，当前为脚手架占位
          </p>
        </CardContent>
      </Card>
      <Button asChild variant="outline">
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
