import type { QuizQuestion, QuestionType, ModuleTestContent, QuizAnswer } from '../../../types';

// ── Test helpers (банк вопросов, перемешивание, клиентский грейдинг) ───────────
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const normShort = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/ё/g, 'е');
export const qTypeOf = (q: QuizQuestion): QuestionType => q.type ?? 'single';

// Верен ли канонический ответ (зеркалит бэкенд) — для подсветки разбора.
export function gradeClient(q: QuizQuestion, ans: QuizAnswer | undefined): boolean {
  const t = qTypeOf(q);
  if (t === 'multiple') {
    const chosen = new Set((Array.isArray(ans) ? ans : []).map(Number));
    const correct = new Set((q.correctIndices ?? []).map(Number));
    return correct.size > 0 && chosen.size === correct.size && [...correct].every((i) => chosen.has(i));
  }
  if (t === 'short') {
    const accepted = (q.correctText ?? '').split('|').map((x) => x.trim()).filter(Boolean);
    return accepted.length > 0 && accepted.some((a) => normShort(a) === normShort(ans));
  }
  if (t === 'ordering') {
    const order = Array.isArray(ans) ? ans.map(Number) : [];
    return order.length === q.options.length && order.every((v, i) => v === i);
  }
  return Number(ans) === Number(q.correctIndex);
}

export interface ServedQuestion {
  q: QuizQuestion;
  type: QuestionType;
  optionOrder: number[];   // исходные индексы вариантов в порядке показа
}

export type TestCfg = Required<Pick<ModuleTestContent,
  'questions' | 'pass_threshold' | 'questions_per_attempt' | 'shuffle_questions' |
  'shuffle_options' | 'time_limit_min' | 'show_correct_answers'>>;

export function parseTestContent(raw: string): TestCfg {
  try {
    const d = JSON.parse(raw);
    return {
      questions: d.questions ?? [],
      pass_threshold: d.pass_threshold ?? 70,
      questions_per_attempt: d.questions_per_attempt ?? 0,
      shuffle_questions: d.shuffle_questions ?? false,
      shuffle_options: d.shuffle_options ?? false,
      time_limit_min: d.time_limit_min ?? 0,
      show_correct_answers: d.show_correct_answers ?? true,
    };
  } catch {
    return {
      questions: [], pass_threshold: 70, questions_per_attempt: 0,
      shuffle_questions: false, shuffle_options: false, time_limit_min: 0, show_correct_answers: true,
    };
  }
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single: 'Один ответ', multiple: 'Несколько ответов', boolean: 'Верно / неверно',
  short: 'Короткий ответ', ordering: 'Расставьте по порядку',
};

export const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
