import { useCallback, useEffect, useState } from 'react';
import { type DraftChallenge, createEmptyDraft } from '@/types/challenge';

const STORAGE_KEY = 'kmc:draft:v1';

/** 创建挑战的草稿持久化 hook（页面刷新不丢失） */
export function useDraft() {
  const [draft, setDraft] = useState<DraftChallenge>(() => {
    if (typeof window === 'undefined') return createEmptyDraft();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyDraft();
      const parsed = JSON.parse(raw) as DraftChallenge;
      // 兼容老版本或损坏数据
      if (!parsed.questions || parsed.questions.length !== 5) return createEmptyDraft();
      return parsed;
    } catch {
      return createEmptyDraft();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // 忽略 quota 等错误
    }
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(createEmptyDraft());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }, []);

  return { draft, setDraft, reset };
}
