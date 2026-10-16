import * as React from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 顶层布局：
 * - 移动端优先，最大宽度 480px 居中（保留桌面端的呼吸感）
 * - 顶部留出安全区
 */
export default function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <main
      className={cn(
        'bg-background mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-6 pt-4',
        className,
      )}
    >
      {children}
    </main>
  );
}
