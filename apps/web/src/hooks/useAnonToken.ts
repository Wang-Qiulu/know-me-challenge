import { useCallback, useEffect, useState } from 'react';

/**
 * 每个浏览器生成一个稳定的 UUID，写入 localStorage。
 * 同一浏览器同一 challenge 多次访问，匿名身份保持一致。
 * 清缓存 / 换设备 / 隐私模式 会重新生成新的匿名身份（PRD 第十四章明确接受此限制）。
 */
const STORAGE_KEY = 'kmc:anon_token:v1';

function generateUuidV4(): string {
  // 简单实现：用 crypto.randomUUID（现代浏览器原生支持）
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // 兜底（不期望走到）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAnonToken(): {
  token: string | null;
  refresh: () => void;
} {
  const [token, setToken] = useState<string | null>(null);

  // 首次挂载时读取或生成
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      let t = window.localStorage.getItem(STORAGE_KEY);
      if (!t) {
        t = generateUuidV4();
        window.localStorage.setItem(STORAGE_KEY, t);
      }
      setToken(t);
    } catch {
      // localStorage 不可用（隐私模式 / 禁用），仍生成一个 session 内有效 token
      setToken(generateUuidV4());
    }
  }, []);

  const refresh = useCallback(() => {
    const t = generateUuidV4();
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // noop
    }
    setToken(t);
  }, []);

  return { token, refresh };
}
