import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDraft } from '@/hooks/useDraft';
import { REQUIRED_QUESTION_COUNT, validateDraft } from '@/types/challenge';
import { track } from '@/lib/track';

export default function Create() {
  const navigate = useNavigate();
  const { draft, setDraft, reset } = useDraft();

  const updateTitle = (title: string) => setDraft({ ...draft, title });
  const updateQuestionText = (idx: number, text: string) => {
    const next = [...draft.questions];
    next[idx] = { ...next[idx], text };
    setDraft({ ...draft, questions: next });
  };
  const updateOption = (qi: number, oi: number, value: string) => {
    const next = [...draft.questions];
    const options = [...next[qi].options];
    options[oi] = value;
    next[qi] = { ...next[qi], options };
    setDraft({ ...draft, questions: next });
  };
  const setCorrect = (qi: number, correctOption: number) => {
    const next = [...draft.questions];
    next[qi] = { ...next[qi], correctOption };
    setDraft({ ...draft, questions: next });
  };
  const handleNext = () => {
    const v = validateDraft(draft);
    if (!v.ok) {
      alert(v.reason);
      return;
    }
    track('challenge_created'); // 编辑完成准备发布
    navigate('/create/preview');
  };
  const handleReset = () => {
    if (confirm('确认清空所有题目，重新开始？')) reset();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">创建你的挑战</h1>
        <p className="text-muted-foreground text-sm">
          共 {REQUIRED_QUESTION_COUNT} 道题，逐题编辑题干、选项和你的真实答案
        </p>
      </header>

      {/* 标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">挑战标题</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => updateTitle(e.target.value)}
            maxLength={50}
            placeholder="例如：你有多懂我？"
            className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
          <p className="text-muted-foreground mt-1 text-xs">{draft.title.length} / 50</p>
        </CardContent>
      </Card>

      {/* 题目 */}
      {draft.questions.map((q, qi) => (
        <Card key={qi}>
          <CardHeader>
            <CardTitle className="text-base">
              第 {qi + 1} / {REQUIRED_QUESTION_COUNT} 题
            </CardTitle>
            <CardDescription>题干 + 选项 + 标记你的真实答案</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              value={q.text}
              onChange={(e) => updateQuestionText(qi, e.target.value)}
              maxLength={200}
              placeholder="例如：我最喜欢的电影类型是？"
              className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    q.correctOption === oi
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-input hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={q.correctOption === oi}
                    onChange={() => setCorrect(qi, oi)}
                    className="accent-primary h-4 w-4"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    maxLength={200}
                    placeholder={`选项 ${oi + 1}`}
                    className="flex-1 bg-transparent focus-visible:outline-none"
                  />
                </label>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              选中圆圈 = 你的真实答案（朋友猜这个才算对）
            </p>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={handleNext}>
          下一步：预览
        </Button>
        <Button variant="ghost" onClick={handleReset}>
          清空重写
        </Button>
        <Button asChild variant="link">
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    </div>
  );
}
