/**
 * 最小埋点（阶段 8 完整化）
 * V1.0 先在控制台输出，阶段 8 接 events 表
 */
export type AnalyticsEvent =
  | 'challenge_created'
  | 'challenge_published'
  | 'quiz_started'
  | 'quiz_submitted'
  | 'result_viewed'
  | 'result_shared'
  | 'leaderboard_viewed'
  | 'challenge_create_again'
  | 'challenge_closed';

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log('[track]', event, props ?? {});
  }
  // TODO(阶段 8): 上报到 Supabase events 表
}
