/** 共享的题目/挑战类型（前后端共用，前端仅使用 correct_option 用于 UI 标记，不直接展示） */

export interface DraftQuestion {
  position: number; // 1-based
  text: string;
  options: string[];
  correctOption: number; // 0-based 索引
}

export interface DraftChallenge {
  title: string;
  questions: DraftQuestion[]; // 长度固定 5
}

export const REQUIRED_QUESTION_COUNT = 5;
export const MAX_OPTIONS = 6;
export const MIN_OPTIONS = 2;

/** 构造空草稿（5 道题，每道 4 个空选项） */
export function createEmptyDraft(): DraftChallenge {
  return {
    title: '你有多懂我？',
    questions: Array.from({ length: REQUIRED_QUESTION_COUNT }, (_, i) => ({
      position: i + 1,
      text: '',
      options: ['', '', '', ''],
      correctOption: 0,
    })),
  };
}

/** 校验草稿是否可发布 */
export function validateDraft(draft: DraftChallenge): { ok: true } | { ok: false; reason: string } {
  const title = draft.title.trim();
  if (!title) return { ok: false, reason: '标题不能为空' };
  if (title.length > 50) return { ok: false, reason: '标题最多 50 字' };

  if (draft.questions.length !== REQUIRED_QUESTION_COUNT) {
    return { ok: false, reason: `必须 ${REQUIRED_QUESTION_COUNT} 道题` };
  }

  for (let i = 0; i < draft.questions.length; i++) {
    const q = draft.questions[i];
    const t = q.text.trim();
    if (!t) return { ok: false, reason: `第 ${i + 1} 题题干不能为空` };
    if (t.length > 200) return { ok: false, reason: `第 ${i + 1} 题题干最多 200 字` };
    if (q.options.length < MIN_OPTIONS || q.options.length > MAX_OPTIONS) {
      return { ok: false, reason: `第 ${i + 1} 题选项数应在 ${MIN_OPTIONS}-${MAX_OPTIONS}` };
    }
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j].trim();
      if (!opt) return { ok: false, reason: `第 ${i + 1} 题第 ${j + 1} 个选项不能为空` };
      if (opt.length > 200)
        return { ok: false, reason: `第 ${i + 1} 题第 ${j + 1} 个选项最多 200 字` };
    }
    if (q.correctOption < 0 || q.correctOption >= q.options.length) {
      return { ok: false, reason: `第 ${i + 1} 题必须设置一个正确答案` };
    }
  }

  return { ok: true };
}
