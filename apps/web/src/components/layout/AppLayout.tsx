import * as React from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 顶层布局（移动端优先 + 响应式）
 *
 * 断点策略：
 * - < sm (640px)：满宽，最大宽度 448px，移动端优先
 * - sm ~ md     ：最大 560px，留出桌面端呼吸感
 * - md ~ lg     ：最大 640px，开始感觉像"小卡片"
 * - lg+         ：最大 720px，不再变宽，避免内容过长难读
 *
 * 同时：
 * - iOS 安全区适配（顶部 notch + 底部 home indicator）
 * - 微妙渐变背景增加层次感
 * - 选择文本优化（按钮/标签不可选）
 */
export default function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <main
      className={cn(
        'bg-background relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8 pt-4',
        'sm:max-w-lg sm:px-6',
        'md:max-w-xl md:px-8 md:pt-6',
        'lg:max-w-2xl',
        // iOS 安全区
        'pt-[max(1rem,env(safe-area-inset-top))]',
        'pb-[max(2rem,env(safe-area-inset-bottom))]',
        // 优化触摸：禁掉双击缩放，按钮/标签不可选文本
        'touch-manipulation select-none',
        className,
      )}
    >
      {/* 微妙背景渐变：顶部 primary 浅色光晕 */}
      <div
        aria-hidden="true"
        className="from-primary/[0.06] pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b to-transparent"
      />
      <div className="kmc-fade-in flex flex-1 flex-col">{children}</div>
    </main>
  );
}
