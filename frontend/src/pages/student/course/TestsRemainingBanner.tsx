import { motion } from 'framer-motion';
import { Award, Trophy } from 'lucide-react';

// Уроки пройдены на 100%, но для сертификата ещё нужно сдать тесты
export function TestsRemainingBanner({ testsPassed, testsTotal, onGoToTest }: {
  testsPassed: number;
  testsTotal: number;
  onGoToTest: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto mb-4 flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[24px] border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white shadow-sm"
    >
      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
        <Award className="w-6 h-6 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-extrabold text-slate-800">Все уроки пройдены — остался последний шаг!</h4>
        <p className="text-sm text-slate-500 font-medium">
          Сдайте {testsTotal === 1 ? 'итоговый тест' : 'тесты'}, чтобы получить сертификат.
          Пройдено: {testsPassed}/{testsTotal}.
        </p>
      </div>
      <button
        onClick={onGoToTest}
        className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 transition-all shrink-0 flex items-center gap-2"
      >
        <Trophy className="w-4 h-4" /> Перейти к тесту
      </button>
    </motion.div>
  );
}
