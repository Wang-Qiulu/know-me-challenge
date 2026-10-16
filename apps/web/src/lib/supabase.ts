import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 客户端单例
 *
 * 注意：
 * - VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 必须在 .env 中配置（参考 .env.example）
 * - anon key 是公开的（受 RLS 保护），不会暴露服务端 secret
 * - 阶段 1 后会加入数据查询函数封装
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // V1.0 不引入正式账号体系，使用匿名身份
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (!isSupabaseConfigured) {
  // 开发期友好提示，不抛错以免阻塞本地 UI 开发
  console.warn(
    '[supabase] 未配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，相关功能将在阶段 1 之后启用。',
  );
}
