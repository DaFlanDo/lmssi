// ── Active item union ─────────────────────────────────────────────────────────
export type ActiveItem =
  | { kind: 'lesson'; id: string }
  | { kind: 'test';   id: string };

export const TEST_TYPE_LABELS: Record<string, string> = {
  module: 'Тест по модулю',
  block:  'Тест по блоку',
  final:  'Итоговый тест',
};
