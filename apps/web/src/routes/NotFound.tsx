import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <div className="text-6xl">🧭</div>
      <h1 className="text-3xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground">这个挑战好像不存在</p>
      <p className="text-muted-foreground max-w-xs text-xs">
        链接可能拼错了，或者挑战已被创建者关闭/删除
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline">
          <Link to="/">返回首页</Link>
        </Button>
        <Button asChild>
          <Link to="/create">创建一个</Link>
        </Button>
      </div>
    </div>
  );
}
