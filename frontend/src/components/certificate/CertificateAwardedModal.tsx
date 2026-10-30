import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Award, X, ArrowRight } from 'lucide-react';

interface Props {
  open: boolean;
  certificateNumber: string | null;
  onClose: () => void;
}

// Декоративные смещения конфетти — вычисляем один раз вне рендера
const CONFETTI_OFFSETS = Array.from({ length: 14 }, () => -80 - Math.random() * 60);

export function CertificateAwardedModal({ open, certificateNumber, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && certificateNumber && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 250, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[28px] p-10 text-center overflow-hidden"
            style={{
              background:
                '#ffffff',
              border: '1px solid #c7d2fe',
              boxShadow:
                '0 30px 80px -20px rgba(30,58,138,0.2), inset 0 0 0 6px #ffffff, inset 0 0 0 7px rgba(30,58,138,0.2)',
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/70 hover:bg-white text-slate-500 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Confetti dots */}
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.8],
                  y: [0, CONFETTI_OFFSETS[i]],
                  x: (i - 7) * 14,
                }}
                transition={{
                  duration: 1.6,
                  delay: 0.2 + i * 0.04,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full pointer-events-none"
                style={{
                  background: i % 2 ? '#93c5fd' : '#1e3a8a',
                }}
              />
            ))}

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6"
                style={{
                  background:
                    'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 100%)',
                  boxShadow: '0 12px 30px rgba(30,58,138,0.2)',
                }}
              >
                <Award className="w-12 h-12 text-white" />
              </motion.div>

              <div className="text-[10px] tracking-[0.4em] uppercase text-blue-800 font-black mb-2">
                Поздравляем!
              </div>
              <h2 className="cert-serif text-3xl font-black text-slate-900 mb-3">
                Курс завершён
              </h2>
              <p className="text-slate-600 font-medium mb-1">
                Вы успешно прошли весь материал.
              </p>
              <p className="text-slate-600 font-medium mb-6">
                Сертификат уже ждёт вас.
              </p>

              <div className="cert-divider mb-6">
                <span className="text-[10px] tracking-[0.3em] uppercase font-bold">
                  № {certificateNumber}
                </span>
              </div>

              <button
                onClick={() => {
                  navigate(`/certificates/${certificateNumber}`);
                  onClose();
                }}
                className="w-full px-6 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"
                style={{
                  background:
                    'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  boxShadow: '0 12px 30px rgba(30,58,138,0.4)',
                }}
              >
                Посмотреть сертификат <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="mt-3 text-sm text-slate-500 hover:text-slate-700 font-semibold"
              >
                Позже
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}