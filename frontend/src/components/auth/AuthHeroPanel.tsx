import { motion } from 'framer-motion';
import { BrandMark } from '../BrandMark';
import { useOrg } from '../../contexts/OrgContext';

// Тонкий шум поверх градиента — та же фактура, что у hero-карточек дашборда.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Три «столпа» платформы. Намеренно без иконок — только номер, рубрика и строка.
const PILLARS = [
  {
    n: '01',
    label: 'Обучение',
    text: 'Курсы из модулей, уроков и тестов — траектория под каждую должность.',
  },
  {
    n: '02',
    label: 'Наставник',
    text: 'Встроенный ИИ проверяет открытые ответы и помогает разобраться в материале.',
  },
  {
    n: '03',
    label: 'Признание',
    text: 'Именные сертификаты с проверкой подлинности по номеру.',
  },
];

export function AuthHeroPanel() {
  const { org } = useOrg();

  return (
    <motion.div
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(150deg, var(--color-brand-dark) 0%, var(--color-brand) 78%, color-mix(in srgb, var(--color-brand) 70%, white) 100%)',
      }}
    >
      {/* Слой 1 — радиальные подсветки */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 80% 12%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(70% 60% at 8% 100%, rgba(0,0,0,0.30), transparent 55%)',
        }}
      />
      {/* Слой 2 — «дышащие» световые пятна */}
      <div className="hero-blob" style={{ width: 360, height: 360, top: -90, right: -70, background: 'rgba(255,255,255,0.10)', filter: 'blur(40px)' }} />
      <div className="hero-blob hero-blob-delay" style={{ width: 280, height: 280, bottom: -60, left: -50, background: 'rgba(255,255,255,0.07)', filter: 'blur(44px)' }} />
      {/* Слой 3 — едва заметная фактура шума */}
      <div className="absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: NOISE, opacity: 0.05 }} />
      {/* Тонкая внутренняя кромка справа — стык со светлой панелью */}
      <div className="absolute inset-y-0 right-0 w-px bg-white/15" />

      {/* Контент */}
      <div className="relative z-10 flex flex-col justify-between w-full px-14 py-14 text-white">
        {/* Шапка-локап */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/12 backdrop-blur-sm ring-1 ring-white/20">
            {org.logo_url ? (
              <img src={org.logo_url} alt="" className="w-7 h-7 object-contain" />
            ) : (
              <BrandMark size={24} />
            )}
          </span>
          <span className="text-sm font-bold tracking-wide text-white/85">{org.name}</span>
        </motion.div>

        {/* Заголовок */}
        <div className="max-w-md">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/55 mb-5"
          >
            Платформа корпоративного обучения
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.55 }}
            className="font-black leading-[1.05] tracking-tight"
            style={{ fontSize: 'clamp(2.4rem, 3.4vw, 3.4rem)' }}
          >
            {org.tagline}
          </motion.h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-7 h-px w-20 origin-left bg-white/30"
          />
        </div>

        {/* Столпы */}
        <div className="space-y-px">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
              className="group flex items-baseline gap-5 border-t border-white/12 py-4 first:border-t-0"
            >
              <span className="cert-serif text-base text-white/40 tabular-nums">{p.n}</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{p.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{p.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
