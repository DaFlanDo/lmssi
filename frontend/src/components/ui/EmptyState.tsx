import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export type EmptyVariant =
  | 'courses'
  | 'users'
  | 'certificates'
  | 'groups'
  | 'positions'
  | 'search'
  | 'default';

interface Props {
  variant?: EmptyVariant;
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

/* ─── SVG illustrations ─────────────────────────────────────── */

function IllustrationCourses() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* open book */}
      <rect x="14" y="28" width="40" height="52" rx="6" fill="#e0e7ff" />
      <rect x="16" y="30" width="36" height="48" rx="5" fill="white" stroke="#c7d2fe" strokeWidth="1" />
      <line x1="22" y1="42" x2="44" y2="42" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="50" x2="44" y2="50" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="58" x2="36" y2="58" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
      <rect x="66" y="28" width="40" height="52" rx="6" fill="#ede9fe" />
      <rect x="68" y="30" width="36" height="48" rx="5" fill="white" stroke="#ddd6fe" strokeWidth="1" />
      <line x1="74" y1="42" x2="96" y2="42" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
      <line x1="74" y1="50" x2="96" y2="50" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
      <line x1="74" y1="58" x2="88" y2="58" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
      {/* spine */}
      <rect x="56" y="24" width="8" height="58" rx="4" fill="url(#bookSpine)" />
      {/* grad cap */}
      <ellipse cx="60" cy="19" rx="18" ry="5" fill="#2563eb" />
      <rect x="56" y="12" width="8" height="9" rx="2" fill="#1e3a8a" />
      <rect x="54" y="10" width="12" height="5" rx="2" fill="#1e3a8a" />
      {/* tassel */}
      <line x1="78" y1="19" x2="84" y2="30" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="84" cy="32" r="2" fill="#d4af37" />
      <defs>
        <linearGradient id="bookSpine" x1="56" y1="24" x2="64" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IllustrationUsers() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* person 1 (left) */}
      <circle cx="34" cy="32" r="14" fill="#e0e7ff" />
      <circle cx="34" cy="30" r="9" fill="#c7d2fe" />
      <path d="M14 70 C14 56 54 56 54 70" fill="#e0e7ff" />
      {/* person 2 (center, larger) */}
      <circle cx="60" cy="28" r="17" fill="#dbeafe" />
      <circle cx="60" cy="26" r="11" fill="#93c5fd" />
      <path d="M36 72 C36 54 84 54 84 72" fill="#dbeafe" />
      {/* person 3 (right) */}
      <circle cx="86" cy="32" r="14" fill="#ede9fe" />
      <circle cx="86" cy="30" r="9" fill="#ddd6fe" />
      <path d="M66 70 C66 56 106 56 106 70" fill="#ede9fe" />
      {/* plus badge */}
      <circle cx="92" cy="18" r="10" fill="#2563eb" />
      <line x1="92" y1="13" x2="92" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="87" y1="18" x2="97" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationCertificates() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* certificate paper */}
      <rect x="18" y="15" width="84" height="62" rx="10" fill="white" stroke="#e0e7ff" strokeWidth="2" />
      <rect x="18" y="15" width="84" height="18" rx="10" fill="#e0e7ff" />
      <rect x="18" y="27" width="84" height="6" fill="#e0e7ff" />
      {/* lines of text */}
      <rect x="32" y="44" width="56" height="4" rx="2" fill="#c7d2fe" />
      <rect x="40" y="54" width="40" height="3" rx="1.5" fill="#ddd6fe" />
      {/* gold ribbon */}
      <circle cx="60" cy="15" r="12" fill="url(#medalGold)" />
      <circle cx="60" cy="15" r="8" fill="url(#medalGoldInner)" />
      <line x1="54" y1="4" x2="54" y2="-2" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="3" x2="60" y2="-3" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
      <line x1="66" y1="4" x2="66" y2="-2" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
      {/* star */}
      <path d="M60 9 L61.5 13 L66 13 L62.5 15.5 L64 20 L60 17.5 L56 20 L57.5 15.5 L54 13 L58.5 13 Z" fill="white" />
      {/* bottom seal */}
      <circle cx="60" cy="72" r="10" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="60" cy="72" r="6" fill="#fef9c3" />
      <defs>
        <linearGradient id="medalGold" x1="48" y1="3" x2="72" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#d4af37" />
        </linearGradient>
        <linearGradient id="medalGoldInner" x1="52" y1="7" x2="68" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IllustrationGroups() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* root node */}
      <rect x="44" y="10" width="32" height="22" rx="8" fill="#2563eb" />
      <rect x="50" y="16" width="20" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="54" y="23" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      {/* vertical line */}
      <line x1="60" y1="32" x2="60" y2="46" stroke="#c7d2fe" strokeWidth="2" />
      {/* horizontal connector */}
      <line x1="26" y1="46" x2="94" y2="46" stroke="#c7d2fe" strokeWidth="2" />
      {/* child nodes */}
      <line x1="26" y1="46" x2="26" y2="58" stroke="#c7d2fe" strokeWidth="2" />
      <rect x="10" y="58" width="32" height="22" rx="8" fill="#e0e7ff" />
      <rect x="16" y="64" width="20" height="4" rx="2" fill="#c7d2fe" />
      <rect x="20" y="71" width="12" height="3" rx="1.5" fill="#ddd6fe" />

      <line x1="60" y1="46" x2="60" y2="58" stroke="#c7d2fe" strokeWidth="2" />
      <rect x="44" y="58" width="32" height="22" rx="8" fill="#ede9fe" />
      <rect x="50" y="64" width="20" height="4" rx="2" fill="#ddd6fe" />
      <rect x="54" y="71" width="12" height="3" rx="1.5" fill="#c4b5fd" />

      <line x1="94" y1="46" x2="94" y2="58" stroke="#c7d2fe" strokeWidth="2" />
      <rect x="78" y="58" width="32" height="22" rx="8" fill="#dbeafe" />
      <rect x="84" y="64" width="20" height="4" rx="2" fill="#93c5fd" />
      <rect x="88" y="71" width="12" height="3" rx="1.5" fill="#bfdbfe" />
    </svg>
  );
}

function IllustrationPositions() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* briefcase */}
      <rect x="20" y="38" width="80" height="50" rx="12" fill="#e0e7ff" />
      <rect x="20" y="38" width="80" height="50" rx="12" fill="url(#briefcaseFill)" />
      <path d="M42 38 V30 C42 26 46 24 50 24 H70 C74 24 78 26 78 30 V38" stroke="#2563eb" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* handle top */}
      <rect x="48" y="22" width="24" height="12" rx="6" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
      {/* center clasp */}
      <rect x="48" y="56" width="24" height="10" rx="5" fill="white" />
      <circle cx="60" cy="61" r="3" fill="#2563eb" />
      {/* star badge top right */}
      <circle cx="90" cy="28" r="13" fill="url(#starBg)" />
      <path d="M90 19 L91.8 24.5 L98 24.5 L93 28 L95 34 L90 30.5 L85 34 L87 28 L82 24.5 L88.2 24.5 Z" fill="white" />
      <defs>
        <linearGradient id="briefcaseFill" x1="20" y1="38" x2="100" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dbeafe" />
          <stop offset="1" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient id="starBg" x1="77" y1="15" x2="103" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IllustrationSearch() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* magnifier */}
      <circle cx="50" cy="44" r="28" fill="#e0e7ff" />
      <circle cx="50" cy="44" r="22" fill="white" stroke="#c7d2fe" strokeWidth="2.5" />
      {/* x inside */}
      <line x1="42" y1="36" x2="58" y2="52" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="36" x2="42" y2="52" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      {/* handle */}
      <line x1="72" y1="66" x2="88" y2="82" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      {/* sparkles */}
      <circle cx="92" cy="18" r="4" fill="#c7d2fe" />
      <circle cx="104" cy="34" r="3" fill="#ddd6fe" />
      <circle cx="100" cy="50" r="2" fill="#e0e7ff" />
    </svg>
  );
}

function IllustrationDefault() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      {/* box */}
      <rect x="22" y="40" width="76" height="50" rx="10" fill="#e0e7ff" />
      <rect x="22" y="40" width="76" height="20" rx="10" fill="#c7d2fe" />
      <rect x="22" y="50" width="76" height="10" fill="#c7d2fe" />
      {/* lid */}
      <rect x="16" y="32" width="88" height="16" rx="8" fill="#dbeafe" />
      {/* ribbon */}
      <rect x="56" y="32" width="8" height="58" rx="4" fill="url(#ribbonGrad)" />
      <ellipse cx="60" cy="34" rx="14" ry="7" fill="url(#ribbonGrad)" />
      {/* sparkles */}
      <path d="M96 20 L97.5 24 L102 24 L98.5 27 L100 31 L96 28.5 L92 31 L93.5 27 L90 24 L94.5 24 Z" fill="#f59e0b" opacity="0.8" />
      <path d="M18 18 L19 21 L22 21 L19.5 23 L20.5 26 L18 24.5 L15.5 26 L16.5 23 L14 21 L17 21 Z" fill="#c7d2fe" />
      <defs>
        <linearGradient id="ribbonGrad" x1="56" y1="32" x2="64" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const illustrations: Record<EmptyVariant, () => React.ReactElement> = {
  courses: IllustrationCourses,
  users: IllustrationUsers,
  certificates: IllustrationCertificates,
  groups: IllustrationGroups,
  positions: IllustrationPositions,
  search: IllustrationSearch,
  default: IllustrationDefault,
};

/* ─── Component ─────────────────────────────────────────────── */

export function EmptyState({
  variant = 'default',
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: Props) {
  const Illustration = illustrations[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-12' : 'py-20'}`}
    >
      {/* blob background */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
            transform: 'scale(2.5)',
          }}
        />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          {Icon ? (
            <div
              className="w-24 h-24 rounded-[28px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #e0e7ff 0%, #dbeafe 100%)',
                boxShadow: '0 12px 40px rgba(37,99,235,0.15)',
              }}
            >
              <Icon className="w-12 h-12" style={{ color: '#2563eb' }} />
            </div>
          ) : (
            <div
              className="w-28 h-28 rounded-[28px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #f0f4ff 0%, #e8f0ff 100%)',
                boxShadow: '0 12px 40px rgba(37,99,235,0.12)',
              }}
            >
              <Illustration />
            </div>
          )}
        </motion.div>
      </div>

      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className={`font-black text-slate-800 mb-2 tracking-tight ${compact ? 'text-xl' : 'text-2xl'}`}
        style={{ letterSpacing: '-0.02em' }}
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className={`text-slate-500 font-medium max-w-xs leading-relaxed ${compact ? 'text-sm' : ''}`}
      >
        {description}
      </motion.p>

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="flex items-center gap-3 mt-8"
        >
          {action && (
            <button
              onClick={action.onClick}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white transition-all hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              }}
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-5 py-3 rounded-2xl font-bold text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm"
            >
              {secondaryAction.label}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
