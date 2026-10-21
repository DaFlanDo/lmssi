import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Bot,
  PenLine,
  Eye,
  Blocks,
  Layers,
  BarChart3,
  Award,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Building2,
  Trophy,
  Star,
  Quote,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { HeroAura } from '../components/ui/HeroAura';
import { CountUp } from '../components/ui/CountUp';
import { useOrg } from '../contexts/OrgContext';

/* ────────────────────────────────────────────────────────────────────────────
   Промо-страница Lumen — «лицо продукта».
   Публичный лендинг: герой, возможности (bento), ИИ-блок, роли, сертификаты,
   цифры и финальный CTA. Полностью на фирменной палитре и компонентах проекта.
   ──────────────────────────────────────────────────────────────────────────── */

/** Появление при попадании в зону видимости. */
function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Маленький бейдж-«пилюля» над заголовком секции. */
function Eyebrow({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'gold' }) {
  const styles =
    tone === 'gold'
      ? { background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.22)' }
      : { background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.16)' };
  return (
    <span
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
      style={styles}
    >
      <Sparkles className="w-3.5 h-3.5" />
      {children}
    </span>
  );
}

/* ── Wordmark Lumen ─────────────────────────────────────────────────────────── */
function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, letterSpacing: '-0.01em' }}
    >
      <span style={{ color: '#1e293b' }}>Lu</span>
      <span
        style={{
          background: 'linear-gradient(to right, #2563eb, #d4af37)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        men
      </span>
    </span>
  );
}

/* ── Навигация ──────────────────────────────────────────────────────────────── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: 'Возможности' },
    { href: '#ai', label: 'ИИ' },
    { href: '#roles', label: 'Роли' },
    { href: '#certificates', label: 'Сертификаты' },
  ];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        className="w-full max-w-6xl flex items-center justify-between rounded-[2rem] px-4 sm:px-6 py-3 transition-all duration-300"
        style={
          scrolled
            ? {
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 12px 40px -12px rgba(37,99,235,0.18)',
              }
            : { background: 'transparent', border: '1px solid transparent' }
        }
      >
        <a href="#top" className="flex items-center gap-2.5 shrink-0">
          <BrandMark size={28} />
          <Wordmark className="text-2xl" />
        </a>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-900/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-900/5 transition-colors"
          >
            Войти
          </Link>
          <Link
            to="/register"
            className="group inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand shadow-lg shadow-brand/30 hover:-translate-y-0.5 transition-all"
          >
            Начать
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}

/* ── Плавающая мини-карточка «продукт» в герое ──────────────────────────────── */
function FloatingPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-md"
    >
      {/* Главная стеклянная карточка — «дашборд» */}
      <div
        className="relative rounded-[28px] p-6 overflow-hidden"
        style={{
          background: 'white',
          boxShadow: '0 40px 80px -24px rgba(37,99,235,0.28), 0 8px 24px -8px rgba(15,23,42,0.08)',
          border: '1px solid rgba(255,255,255,0.9)',
        }}
      >
        {/* hero-полоска внутри */}
        <div className="relative h-28 rounded-2xl overflow-hidden mb-4">
          <HeroAura spotlight={false} />
          <div className="relative z-10 h-full flex flex-col justify-center px-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Прогресс обучения</p>
            <p className="text-2xl font-black mt-0.5">Охрана труда · 2025</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: '72%' }}
                transition={{ duration: 1.4, delay: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* мини-статы */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { v: 12, l: 'Курса' },
            { v: 96, l: 'Балл' },
            { v: 4, l: 'Диплома' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xl font-black text-slate-800">
                <CountUp value={s.v} />
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>

        {/* список уроков */}
        <div className="space-y-2">
          {[
            { t: 'Введение в технику безопасности', done: true },
            { t: 'Средства индивидуальной защиты', done: true },
            { t: 'Итоговое тестирование', done: false },
          ].map((row) => (
            <div key={row.t} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white border border-slate-100">
              {row.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
              )}
              <span className={`text-sm font-semibold ${row.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {row.t}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Плавающий бейдж сертификата */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.1 }}
        className="absolute -right-5 -bottom-5 sm:-right-8 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'white',
          boxShadow: '0 20px 50px -12px rgba(201,162,39,0.4)',
          border: '1px solid rgba(212,175,55,0.25)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #d4af37, #b8860b)' }}
        >
          <Award className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Сертификат</p>
          <p className="text-sm font-black text-slate-800">Выдан · №2025-014</p>
        </div>
      </motion.div>

      {/* Плавающий бейдж ИИ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.3 }}
        className="absolute -left-4 -top-5 sm:-left-10 rounded-2xl px-4 py-3 flex items-center gap-2.5"
        style={{
          background: 'white',
          boxShadow: '0 20px 50px -12px rgba(37,99,235,0.35)',
          border: '1px solid rgba(37,99,235,0.12)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
        >
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-black text-slate-800">ИИ-наставник</p>
          <p className="text-[11px] font-semibold text-slate-400">отвечает за 2 сек</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Герой ──────────────────────────────────────────────────────────────────── */
function Hero({ orgName }: { orgName: string }) {
  return (
    <section id="top" className="relative pt-36 sm:pt-44 pb-24 px-5 overflow-hidden">
      {/* Фоновые «дышащие» пятна */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="animate-blob absolute -top-24 -left-24 w-[34rem] h-[34rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.14), transparent 70%)' }}
        />
        <div
          className="animate-blob animation-delay-2000 absolute top-10 -right-24 w-[30rem] h-[30rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)' }}
        />
        <div
          className="animate-blob animation-delay-4000 absolute bottom-0 left-1/3 w-[26rem] h-[26rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)' }}
        />
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Левая колонка — текст */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.16)' }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Корпоративная LMS нового поколения
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-6 font-black text-slate-900 leading-[1.05]"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.25rem)', letterSpacing: '-0.03em' }}
          >
            Обучение, которое{' '}
            <span className="gradient-text">ведёт за руку</span> — от найма до сертификата
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-6 text-lg sm:text-xl text-slate-500 font-medium max-w-xl leading-relaxed"
          >
            <Wordmark className="text-xl" /> превращает документы в курсы за минуты, проверяет знания
            с помощью ИИ и выдаёт проверяемые сертификаты. Платформа обучения для {orgName}.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-black text-white bg-brand shadow-xl shadow-brand/30 hover:-translate-y-1 transition-all"
            >
              Начать обучение
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-slate-700 bg-white border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 transition-all"
            >
              Войти в систему
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.36 }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500"
          >
            {['Генерация курсов из PDF/DOCX', 'Проверка ответов ИИ', 'Прокторинг тестов'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Правая колонка — превью */}
        <div className="hidden lg:block">
          <FloatingPreview />
        </div>
      </div>
    </section>
  );
}

/* ── Полоса доверия ─────────────────────────────────────────────────────────── */
function TrustStrip({ orgName }: { orgName: string }) {
  const roles = [
    { icon: Building2, label: 'Администратор', color: '#7c3aed', bg: 'rgba(139,92,246,0.1)' },
    { icon: Briefcase, label: 'HR-специалист', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { icon: GraduationCap, label: 'Сотрудник', color: '#059669', bg: 'rgba(16,185,129,0.1)' },
  ];
  return (
    <section className="px-5 pb-8">
      <Reveal>
        <div className="max-w-6xl mx-auto rounded-[28px] bg-white border border-slate-100 px-6 sm:px-10 py-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.05)]">
          <p className="text-sm font-semibold text-slate-400 text-center md:text-left max-w-xs">
            Единая среда обучения для всех ролей{' '}
            <span className="text-slate-600">{orgName}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {roles.map((r) => (
              <div
                key={r.label}
                className="inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 border border-slate-100 bg-slate-50/60"
              >
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: r.bg }}
                >
                  <r.icon className="w-4 h-4" style={{ color: r.color }} />
                </span>
                <span className="text-sm font-bold text-slate-700">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Возможности (bento) ────────────────────────────────────────────────────── */
interface Feature {
  icon: typeof Sparkles;
  title: string;
  text: string;
  span: string;
  accent: 'blue' | 'gold' | 'emerald' | 'violet';
}

const FEATURES: Feature[] = [
  {
    icon: Wand2,
    title: 'Генерация курсов из документов',
    text: 'Загрузите PDF или DOCX — ИИ разберёт материал на модули, уроки и тесты. Готовый курс за минуты вместо недель.',
    span: 'md:col-span-7',
    accent: 'gold',
  },
  {
    icon: Bot,
    title: 'ИИ-наставник 24/7',
    text: 'Встроенный ассистент отвечает на вопросы прямо в уроке, опираясь на материал курса.',
    span: 'md:col-span-5',
    accent: 'blue',
  },
  {
    icon: PenLine,
    title: 'Проверка открытых ответов ИИ',
    text: 'Свободный ответ оценивается по заданным критериям с баллом и развёрнутой обратной связью.',
    span: 'md:col-span-5',
    accent: 'gold',
  },
  {
    icon: Blocks,
    title: 'Конструктор drag-and-drop',
    text: 'Текст, видео, тесты, чек-листы и открытые задания. Slash-меню, автосохранение и живое превью «как видит студент».',
    span: 'md:col-span-7',
    accent: 'blue',
  },
  {
    icon: Eye,
    title: 'Прокторинг тестов',
    text: 'Фиксация ухода из окна во время теста — честная оценка знаний.',
    span: 'md:col-span-4',
    accent: 'violet',
  },
  {
    icon: Layers,
    title: 'Траектории по должностям',
    text: 'Программа обучения привязана к должности: при найме сотрудник автоматически получает нужные курсы.',
    span: 'md:col-span-4',
    accent: 'emerald',
  },
  {
    icon: BarChart3,
    title: 'Аналитика и напоминания',
    text: 'Прогресс по сотрудникам и курсам, дедлайны и авто-напоминания о просрочках.',
    span: 'md:col-span-4',
    accent: 'blue',
  },
];

const ACCENTS = {
  blue: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
  gold: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  emerald: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  violet: { bg: 'rgba(139,92,246,0.1)', color: '#7c3aed' },
} as const;

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const a = ACCENTS[feature.accent];
  return (
    <Reveal delay={(index % 3) * 0.08} className={feature.span}>
      <div className="group h-full bento-card p-7 flex flex-col">
        <span
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:-rotate-3"
          style={{ background: a.bg }}
        >
          <feature.icon className="w-6 h-6" style={{ color: a.color }} />
        </span>
        <h3 className="text-lg font-extrabold text-slate-800 mb-2">{feature.title}</h3>
        <p className="text-sm font-medium text-slate-500 leading-relaxed">{feature.text}</p>
      </div>
    </Reveal>
  );
}

function Features() {
  return (
    <section id="features" className="px-5 py-20 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mb-12">
          <Eyebrow>Возможности</Eyebrow>
          <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            Всё, чтобы обучать{' '}
            <span className="gradient-text">по-настоящему</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 font-medium">
            От создания курса до проверяемого сертификата — единый продуманный путь без сторонних сервисов.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── ИИ-блок (тёмный) ───────────────────────────────────────────────────────── */
function AISpotlight() {
  const items = [
    { icon: Wand2, t: 'Курс из документа', d: 'PDF/DOCX → структура за минуты' },
    { icon: PenLine, t: 'Оценка ответов', d: 'балл и фидбек по критериям' },
    { icon: Bot, t: 'Наставник в уроке', d: 'ответы по материалу курса' },
  ];
  return (
    <section id="ai" className="px-5 py-12 scroll-mt-24">
      <Reveal>
        <div className="max-w-6xl mx-auto relative rounded-[36px] overflow-hidden">
          <HeroAura spotlight />
          <div className="relative z-10 px-7 sm:px-14 py-16 sm:py-20">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest text-white"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                Искусственный интеллект
              </span>
              <h2 className="mt-6 text-4xl sm:text-5xl font-black text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
                ИИ берёт на себя{' '}
                <span className="ai-gradient-text">рутину</span>, вы — результат
              </h2>
              <p className="mt-5 text-lg text-blue-100/90 font-medium leading-relaxed">
                Три ИИ-механизма работают на одном шлюзе: генерация курсов, проверка свободных
                ответов и наставник внутри урока. Это не «галочка для презентации» — это ядро продукта.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-3 gap-4">
              {items.map((it, i) => (
                <motion.div
                  key={it.t}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
                  >
                    <it.icon className="w-5 h-5 text-white" />
                  </span>
                  <p className="text-base font-black text-white">{it.t}</p>
                  <p className="text-sm font-medium text-blue-100/80 mt-1">{it.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Роли / как это работает ────────────────────────────────────────────────── */
function Roles() {
  const roles = [
    {
      icon: Building2,
      tag: 'Администратор',
      color: '#7c3aed',
      bg: 'rgba(139,92,246,0.1)',
      title: 'Строит структуру',
      points: ['Отделы и должности деревом', 'Управление пользователями', 'Брендинг и настройки'],
    },
    {
      icon: Briefcase,
      tag: 'HR-специалист',
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.1)',
      title: 'Создаёт обучение',
      points: ['Курсы в конструкторе и через ИИ', 'Траектории по должностям', 'Аналитика и печать тестов'],
    },
    {
      icon: GraduationCap,
      tag: 'Сотрудник',
      color: '#059669',
      bg: 'rgba(16,185,129,0.1)',
      title: 'Учится и растёт',
      points: ['Курсы, тесты и ИИ-наставник', 'Прогресс и дедлайны', 'Проверяемые сертификаты'],
    },
  ];
  return (
    <section id="roles" className="px-5 py-20 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mb-12">
          <Eyebrow>Роли</Eyebrow>
          <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            Один поток — от структуры до{' '}
            <span className="gradient-text">диплома</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 font-medium">
            Каждая роль видит ровно то, что ей нужно. Данные текут естественно: должность → программа →
            прогресс → сертификат.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {roles.map((r, i) => (
            <Reveal key={r.tag} delay={i * 0.1}>
              <div className="relative h-full bento-card p-7 overflow-hidden">
                <span
                  className="absolute top-6 right-6 text-6xl font-black opacity-[0.06]"
                  style={{ color: r.color }}
                >
                  {i + 1}
                </span>
                <span
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: r.bg }}
                >
                  <r.icon className="w-6 h-6" style={{ color: r.color }} />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: r.color }}>
                  {r.tag}
                </p>
                <h3 className="text-xl font-extrabold text-slate-800 mb-4">{r.title}</h3>
                <ul className="space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm font-medium text-slate-600">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: r.color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Сертификаты ────────────────────────────────────────────────────────────── */
function Certificates() {
  return (
    <section id="certificates" className="px-5 py-20 scroll-mt-24">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <Eyebrow tone="gold">Сертификаты</Eyebrow>
          <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            Достижение, которому{' '}
            <span
              style={{
                background: 'linear-gradient(120deg, #b8860b, #d4af37 50%, #b8860b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              можно верить
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 font-medium leading-relaxed">
            Сертификат выдаётся только после прохождения всех обязательных тестов. У каждого — уникальный
            номер и публичная страница проверки подлинности.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              'Честный гейт: без сдачи тестов — нет диплома',
              'Уникальный номер и QR-проверка',
              'Премиальный бланк в фирменном стиле',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-base font-semibold text-slate-700">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(212,175,55,0.14)' }}
                >
                  <ShieldCheck className="w-4 h-4" style={{ color: '#b8860b' }} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Визуал сертификата */}
        <Reveal delay={0.1}>
          <motion.div
            whileHover={{ rotate: 0, scale: 1.02 }}
            initial={{ rotate: -2 }}
            className="relative rounded-[24px] bg-white p-8 sm:p-10"
            style={{
              boxShadow: '0 40px 80px -24px rgba(201,162,39,0.35)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            {/* двойная рамка */}
            <div
              className="absolute inset-3 rounded-[18px] pointer-events-none"
              style={{ border: '2px solid #1e3a8a' }}
            />
            <div
              className="absolute inset-5 rounded-[12px] pointer-events-none"
              style={{ border: '1px solid rgba(201,162,39,0.4)' }}
            />
            <div className="relative text-center py-4">
              <div
                className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b8860b)' }}
              >
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Сертификат</p>
              <p
                className="mt-3 text-3xl"
                style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 700, color: '#1e293b' }}
              >
                Иван Иванов
              </p>
              <div className="my-4 mx-auto w-24 h-px" style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
              <p className="text-sm font-semibold text-slate-500">успешно завершил курс</p>
              <p className="text-base font-extrabold text-slate-800 mt-1">«Охрана труда и техника безопасности»</p>
              <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>№ 2025-014</span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Подлинность подтверждена
                </span>
              </div>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Цифры ──────────────────────────────────────────────────────────────────── */
function Stats() {
  const stats = [
    { v: 3, suffix: '', l: 'ИИ-механизма в ядре' },
    { v: 5, suffix: '+', l: 'типов учебных блоков' },
    { v: 100, suffix: '%', l: 'честный гейт сертификата' },
    { v: 24, suffix: '/7', l: 'ИИ-наставник на связи' },
  ];
  return (
    <section className="px-5 py-12">
      <Reveal>
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bento-card p-7 text-center"
            >
              <p className="text-4xl sm:text-5xl font-black gradient-text">
                <CountUp value={s.v} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{s.l}</p>
            </motion.div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ── Отзыв / цитата ─────────────────────────────────────────────────────────── */
function Testimonial() {
  return (
    <section className="px-5 py-12">
      <Reveal>
        <div className="max-w-4xl mx-auto bento-card p-9 sm:p-12 text-center">
          <Quote className="w-10 h-10 mx-auto mb-6" style={{ color: 'rgba(37,99,235,0.25)' }} />
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-snug" style={{ letterSpacing: '-0.01em' }}>
            «Раньше адаптация нового сотрудника занимала недели. Теперь должность сама назначает программу,
            а ИИ собирает курс из наших же регламентов».
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
            >
              HR
            </div>
            <div className="text-left">
              <p className="text-sm font-extrabold text-slate-800">Отдел кадров</p>
              <p className="text-xs font-semibold text-slate-400">внедрение Lumen</p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5" style={{ fill: '#fbbf24', color: '#fbbf24' }} />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Финальный CTA ──────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="px-5 py-16">
      <Reveal>
        <div className="max-w-6xl mx-auto relative rounded-[36px] overflow-hidden">
          <HeroAura spotlight />
          <div className="relative z-10 px-7 sm:px-14 py-16 sm:py-20 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-7"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <Sparkles className="w-8 h-8" style={{ color: '#fbbf24' }} />
            </motion.div>
            <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
              Готовы учить иначе?
            </h2>
            <p className="mt-5 text-lg sm:text-xl text-blue-100/90 font-medium max-w-2xl mx-auto">
              Создайте аккаунт и пройдите путь от первого курса до сертификата вместе с <Wordmark className="text-xl" />.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-brand-dark bg-white hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.22)' }}
              >
                Создать аккаунт
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                У меня уже есть вход
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Подвал ─────────────────────────────────────────────────────────────────── */
function Footer({ orgName }: { orgName: string }) {
  return (
    <footer className="px-5 pt-10 pb-12">
      <div className="max-w-6xl mx-auto border-t border-slate-200/70 pt-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <Wordmark className="text-xl" />
          <span className="text-sm font-medium text-slate-400 ml-2 hidden sm:inline">
            · Корпоративная платформа обучения
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm font-semibold text-slate-500">
          <a href="#features" className="hover:text-slate-800 transition-colors">Возможности</a>
          <a href="#ai" className="hover:text-slate-800 transition-colors">ИИ</a>
          <Link to="/login" className="hover:text-slate-800 transition-colors">Войти</Link>
        </div>
      </div>
      <p className="max-w-6xl mx-auto mt-6 text-xs font-medium text-slate-400 text-center sm:text-left">
        © {new Date().getFullYear()} {orgName}. Сделано с вниманием к деталям.
      </p>
    </footer>
  );
}

/* ── Страница ───────────────────────────────────────────────────────────────── */
export function LandingPage() {
  const { org } = useOrg();
  const orgName = org?.name && org.name !== 'Lumen LMS' ? org.name : 'ОАО «Барановичхлебпродукт»';

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => {
      html.style.scrollBehavior = prev;
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#F4F7FF' }}>
      <LandingNav />
      <main>
        <Hero orgName={orgName} />
        <TrustStrip orgName={orgName} />
        <Features />
        <AISpotlight />
        <Roles />
        <Stats />
        <Certificates />
        <Testimonial />
        <FinalCTA />
      </main>
      <Footer orgName={orgName} />
    </div>
  );
}

export default LandingPage;
