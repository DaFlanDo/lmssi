// Демо-стенд: вход одной кнопкой под сид-аккаунтами (backend/app/services/demo.py)

export type DemoRole = 'student' | 'hr' | 'admin';

export interface DemoInfo {
  enabled: boolean;
  /** роль → email сид-аккаунта */
  accounts: Partial<Record<DemoRole, string>>;
}

export const DEMO_ROLES: { role: DemoRole; title: string; text: string }[] = [
  {
    role: 'student',
    title: 'Сотрудник',
    text: 'Проходит назначенные курсы с тестами, спрашивает ИИ-наставника, получает сертификат.',
  },
  {
    role: 'hr',
    title: 'HR',
    text: 'Генерирует курс из документа с помощью ИИ, собирает уроки в конструкторе, следит за прогрессом.',
  },
  {
    role: 'admin',
    title: 'Администратор',
    text: 'Настраивает отделы и должности, управляет пользователями, смотрит аналитику.',
  },
];

export const isDemoRole = (value: string | undefined): value is DemoRole =>
  DEMO_ROLES.some((r) => r.role === value);
