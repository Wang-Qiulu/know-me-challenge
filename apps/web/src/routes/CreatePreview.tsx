import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDraft } from '@/hooks/useDraft';
import { usePublish } from '@/hooks/usePublish';

export default function CreatePreview() {
  const navigate = useNavigate();
  const { draft } = useDraft();
  const { loading, success, error, publish } = usePublish();

  const handlePublish = async () => {
    const result = await publish(draft);
    if (result) {
      navigate('/create/success', { state: result });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">发布前预览</h1>
        <p className="text-muted-foreground text-sm">
          这就是朋友打开链接后看到的题目。✅ 标记为你的真实答案，<strong>预览中不展示</strong>。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{draft.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.questions.map((q, qi) => (
            <div key={qi} className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">
                {qi + 1}. {q.text}
              </p>
              <ul className="text-muted-foreground space-y-1 text-sm">
                {q.options.map((opt, oi) => (
                  <li key={oi} className="flex items-center gap-2">
                    <span className="border-muted-foreground/40 inline-block h-3 w-3 rounded-full border" />
                    {opt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
          发布失败：{error.message}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={handlePublish} disabled={loading}>
          {loading ? '发布中…' : '确认发布'}
        </Button>
        <Button asChild variant="outline">
          <Link to="/create">返回编辑</Link>
        </Button>
      </div>

      {success && (
        <p className="text-muted-foreground text-xs">✅ 已发布（manage_token 已生成，正在跳转…）</p>
      )}
    </div>
  );
}
