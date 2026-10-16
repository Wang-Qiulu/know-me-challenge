import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { track } from '@/lib/track';

/**
 * 首页：核心 CTA「创建你的挑战」
 * 阶段 2 完成实际创建流程；当前为占位 UI，验证路由与样式
 */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-stretch justify-center gap-6 py-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">懂我挑战</h1>
        <p className="text-muted-foreground">测测朋友有多了解你</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>5 道题 · 1 个真相</CardTitle>
          <CardDescription>创建你的挑战，邀请朋友答题，看看他们有多懂你。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild size="lg" className="w-full" onClick={() => track('challenge_created')}>
            <Link to="/create">创建你的挑战</Link>
          </Button>
          <p className="text-muted-foreground text-center text-xs">无需注册，分享即参与</p>
        </CardContent>
      </Card>

      <footer className="text-muted-foreground mt-4 text-xs">
        <p className="text-center">V1.0 MVP · 移动端优先</p>
      </footer>
    </div>
  );
}
