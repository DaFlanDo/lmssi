// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  identification_number: string;
  full_name: string;
  password: string;
  group_id?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  identification_number?: string;
  full_name: string;
  role: 'admin' | 'hr' | 'student';
  is_active: boolean;
  group_id?: number;
  group_name?: string;
  created_at?: string;
}

export interface UserUpdate {
  full_name?: string;
  role?: string;
  is_active?: boolean;
  group_id?: number;
}

// ─── Groups (отделы / должности) ─────────────────────────────────────────────

export interface CourseShort {
  id: string;
  title: string;
  description: string;
}

// Группа — узел иерархии «отдел → должность». К любому узлу можно привязать
// траекторию курсов; сотрудник наследует курсы должности + её отдела.
export interface Group {
  id: number;
  name: string;
  description?: string;
  parent_id?: number | null;
  user_count: number;
  courses: CourseShort[];
  course_count: number;
}

export interface GroupCourseAttach {
  course_id: string;
}

export interface GroupCoursesReorder {
  course_ids: string[];
}

// ─── Quiz types ───────────────────────────────────────────────────────────────

// Тип вопроса. 'single' — один верный (по умолчанию, обратная совместимость),
// 'multiple' — несколько верных, 'boolean' — верно/неверно,
// 'short' — короткий текстовый ответ, 'ordering' — упорядочить шаги.
export type QuestionType = 'single' | 'multiple' | 'boolean' | 'short' | 'ordering';

export interface QuizQuestion {
  id: string;
  type?: QuestionType;          // нет поля → 'single'
  question: string;
  options: string[];            // single / multiple / boolean / ordering (в верном порядке)
  correctIndex: number;         // single / boolean
  correctIndices?: number[];    // multiple
  correctText?: string;         // short — принимаемые ответы через «|»
}

export interface ModuleTestContent {
  questions: QuizQuestion[];
  pass_threshold: number;       // 0–100, процент правильных для прохождения
  questions_per_attempt?: number; // 0/undefined = все вопросы (иначе случайная выборка)
  shuffle_questions?: boolean;  // перемешивать порядок вопросов
  shuffle_options?: boolean;    // перемешивать варианты ответов
  time_limit_min?: number;      // 0/undefined = без ограничения времени
  show_correct_answers?: boolean; // показывать разбор после сдачи (по умолчанию true)
}

// 'module' — тест по всему модулю, 'block' — тест по блоку, 'final' — итоговый
export type ModuleTestType = 'module' | 'block' | 'final';

export interface ModuleTest {
  id: string;
  type: ModuleTestType;
  title: string;
  content: string;   // JSON-строка ModuleTestContent
  order: number;
}

// ─── Course / Module / Lesson / Block ────────────────────────────────────────

export interface BlockRead {
  id: string;
  type: string;
  content: string;
  order: number;
  lesson_id: string;
}

export interface BlockCreate {
  id: string;
  type: string;
  content: string;
  order: number;
}

export interface LessonRead {
  id: string;
  title: string;
  type: string;
  duration: string;
  order: number;
  module_id: string;
  blocks: BlockRead[];
}

export interface LessonCreate {
  id: string;
  title: string;
  type: string;
  duration: string;
  order: number;
  blocks: BlockCreate[];
}

export interface ModuleRead {
  id: string;
  title: string;
  order: number;
  course_id: string;
  lessons: LessonRead[];
  tests: ModuleTest[];
}

export interface ModuleCreate {
  id: string;
  title: string;
  order: number;
  lessons: LessonCreate[];
  tests: ModuleTest[];
}

export interface CourseRead {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  cover_image?: string | null;
  created_by: number | null;
  created_at: string | null;
  sequential: boolean;
  require_video: boolean;
  modules: ModuleRead[];
}

export interface CourseCreate {
  id: string;
  title: string;
  description: string;
  sequential?: boolean;
  require_video?: boolean;
  modules: ModuleCreate[];
}

export interface CourseListItem {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  cover_image?: string | null;
  created_at: string | null;
  module_count: number;
  lesson_count: number;
}

// ─── Enrollment ──────────────────────────────────────────────────────────────

export interface EnrollmentRead {
  id: number;
  user_id: number;
  course_id: string;
  assigned_by: number | null;
  assigned_at: string;
  due_date?: string | null;
}

export interface EnrollmentCreate {
  user_id: number;
  course_id: string;
  due_date?: string | null;
}

export interface GroupEnrollmentCreate {
  group_id: number;
  course_id: string;
  due_date?: string | null;
}

export interface GroupEnrollmentResult {
  enrolled: number;
  skipped: number;
}

export interface UserEnrollmentDetail {
  enrollment_id: number;
  course_id: string;
  course_title: string;
  course_description: string;
  assigned_at: string | null;
  completed_at: string | null;
  due_date?: string | null;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationRead {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string | null;
  related_course_id: string | null;
}

export interface UnreadCountRead {
  count: number;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface LessonProgressRead {
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface TestProgressRead {
  test_id: string;
  passed: boolean;
  best_score: number;
}

export interface CourseProgressRead {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  lessons: LessonProgressRead[];
  tests_total: number;
  tests_passed: number;
  certificate_eligible: boolean;
  tests: TestProgressRead[];
}

// ─── Open-answer (AI-graded) ──────────────────────────────────────────────────

export interface OpenAnswerResult {
  score: number;        // 0..100
  passed: boolean;
  feedback: string;
  answer: string;
  attempted_at: string | null;
}

// ─── Quiz ────────────────────────────────────────────────────────────────────

// Ответ зависит от типа вопроса: number | number[] | string
export type QuizAnswer = number | number[] | string;

export interface ModuleTestSubmit {
  test_id: string;
  answers: Record<string, QuizAnswer>;  // {question_id: answer}
  question_ids?: string[];              // показанная выборка (банк вопросов)
  focus_violations?: number;
}

export interface ModuleTestAttemptRead {
  id: number;
  test_id: string;
  answers: Record<string, QuizAnswer>;
  score: number;
  passed: boolean;
  focus_violations?: number;
  attempted_at: string | null;
  new_certificate?: boolean;
  certificate_number?: string | null;
}

export interface QuizSubmit {
  lesson_id: string;
  block_id: string;
  answers: Record<string, number>;
}

export interface QuizAttemptRead {
  id: number;
  block_id: string;
  answers: Record<string, number>;
  score: number;
  passed: boolean;
  attempted_at: string | null;
}

// ─── Certificates ────────────────────────────────────────────────────────────

export interface CertificateRead {
  id: number;
  certificate_number: string;
  user_id: number;
  course_id: string;
  issued_at: string | null;
  score: number | null;
}

export interface CertificateDetail {
  certificate_number: string;
  issued_at: string | null;
  score: number | null;
  user_full_name: string;
  course_id: string;
  course_title: string;
  course_description: string;
  total_lessons: number;
  completed_at: string | null;
}

export interface CertificateVerification {
  valid: boolean;
  certificate_number: string;
  user_full_name: string | null;
  course_title: string | null;
  issued_at: string | null;
  score: number | null;
}

export interface LessonCompleteResponse {
  status: string;
  course_id: string | null;
  certificate_number: string | null;
  new_certificate: boolean;
}

// ─── Print Tests ─────────────────────────────────────────────────────────────

export interface PrintTestQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface PrintTestQuestionsUpdate {
  questions: PrintTestQuestion[];
}

export interface PrintVariantRead {
  code: string;
  test_id: string;
  test_title: string;
  questions: PrintTestQuestion[];
  created_at?: string | null;
}

export interface PrintTestRead {
  id: string;
  title: string;
  topic: string;
  course_id?: string | null;
  questions_pool: string;
  questions_per_test: number;
  created_by?: number | null;
  created_at?: string | null;
}

export interface PrintTestVariant {
  test_id: string;
  title: string;
  questions: PrintTestQuestion[];
  questions_per_test: number;
  total_pool: number;
}
