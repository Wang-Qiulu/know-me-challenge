import { cn } from '@/lib/utils';

interface LoadingProps {
  text?: string;
  className?: string;
}

/**
 * 统一的 loading 组件
 * - 使用 .kmc-spin 类（CSS animation）
 * - 默认 16px 圆环，文字 muted-foreground
 */
export function Loading({ text, className }: LoadingProps) {
  return (
    <div className={cn('text-muted-foreground flex items-center gap-3 text-sm', className)}>
      <span className="kmc-spin inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
      {text ?? '加载中…'}
    </div>
  );
}
