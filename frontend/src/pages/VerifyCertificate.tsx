import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, Award, Calendar, User, BookOpen } from 'lucide-react';
import { publicGet } from '../lib/api';
import type { CertificateVerification } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { LaurelOrnament } from '../components/certificate/LaurelOrnament';
import { BrandLogo } from '../components/BrandLogo';

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function VerifyCertificate() {
  const { number } = useParams<{ number: string }>();
  const [data, setData] = useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!number) return;
    publicGet<CertificateVerification>(`/api/certificates/verify/${number}`)
      .then(setData)
      .catch(() =>
        setData({
          valid: false,
          certificate_number: number || '',
          user_full_name: null,
          course_title: null,
          issued_at: null,
          score: null,
        })
      )
      .finally(() => setLoading(false));
  }, [number]);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{
        background:
          'radial-gradient(1200px 600px at 50% 0%, rgba(212,175,55,0.18), transparent 60%), radial-gradient(900px 600px at 50% 100%, rgba(30,58,138,0.12), transparent 60%), #f8fafc',
      }}
    >
      {/* Header brand */}
      <Link to="/" className="flex items-center gap-3 mb-8 group">
        <BrandLogo size={40} />
        <div>
          <div className="font-black text-lg text-slate-800">
            LMS<span className="text-brand">SI</span>
          </div>
          <div className="text-[9px] text-slate-500 font-bold tracking-[0.25em] uppercase">
            Проверка сертификата
          </div>
        </div>
      </Link>

      <div
        className="w-full max-w-2xl rounded-[28px] p-10 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #fdfbf3 0%, #f9f4e3 100%)',
          border: '2px solid #c9a227',
          boxShadow:
            '0 25px 60px -15px rgba(201,162,39,0.35), inset 0 0 0 6px #fdfbf3, inset 0 0 0 7px rgba(201,162,39,0.4)',
        }}
      >
        <LaurelOrnament className="absolute top-4 left-4 opacity-50" size={70} />
        <LaurelOrnament className="absolute top-4 right-4 opacity-50" size={70} flip />
        <LaurelOrnament className="absolute bottom-4 left-4 opacity-50" size={70} flip />
        <LaurelOrnament className="absolute bottom-4 right-4 opacity-50" size={70} />

        <div className="relative z-10 flex flex-col items-center text-center">
          {data?.valid ? (
            <>
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                style={{
                  background:
                    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 12px 30px rgba(16,185,129,0.4)',
                }}
              >
                <ShieldCheck className="w-12 h-12 text-white" />
              </div>
              <div className="text-[10px] tracking-[0.4em] uppercase text-emerald-700 font-black mb-2">
                Подлинный
              </div>
              <h1 className="cert-serif text-4xl font-black text-slate-900 mb-2">
                Сертификат подтверждён
              </h1>
              <p className="text-slate-500 max-w-md mb-8">
                Этот сертификат был выдан системой LMSSI и является подлинным документом
                о прохождении обучения.
              </p>

              <div className="cert-divider w-full mb-8">
                <Award className="w-4 h-4" />
              </div>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div
                  className="p-4 rounded-2xl text-left"
                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(201,162,39,0.25)' }}
                >
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-bold mb-2">
                    <User className="w-3.5 h-3.5" /> Владелец
                  </div>
                  <div className="cert-serif font-bold text-slate-800">
                    {data.user_full_name || '—'}
                  </div>
                </div>
                <div
                  className="p-4 rounded-2xl text-left"
                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(201,162,39,0.25)' }}
                >
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-bold mb-2">
                    <Calendar className="w-3.5 h-3.5" /> Дата выдачи
                  </div>
                  <div className="cert-serif font-bold text-slate-800">
                    {formatDate(data.issued_at)}
                  </div>
                </div>
                <div
                  className="p-4 rounded-2xl text-left sm:col-span-2"
                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(201,162,39,0.25)' }}
                >
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-bold mb-2">
                    <BookOpen className="w-3.5 h-3.5" /> Программа обучения
                  </div>
                  <div className="cert-serif font-bold text-slate-800 text-lg leading-snug">
                    «{data.course_title || '—'}»
                  </div>
                </div>
                {data.score !== null && (
                  <div
                    className="p-4 rounded-2xl text-left sm:col-span-2 flex items-center justify-between"
                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(201,162,39,0.25)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-bold mb-1">
                        Средний балл по тестам
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Чем выше — тем лучше освоен материал
                      </div>
                    </div>
                    <div className="cert-gold-text cert-serif text-3xl font-black">
                      {data.score}/100
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[10px] tracking-[0.25em] uppercase text-slate-400 font-bold">
                № {data.certificate_number}
              </div>
            </>
          ) : (
            <>
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                style={{
                  background:
                    'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  boxShadow: '0 12px 30px rgba(239,68,68,0.4)',
                }}
              >
                <ShieldX className="w-12 h-12 text-white" />
              </div>
              <div className="text-[10px] tracking-[0.4em] uppercase text-red-700 font-black mb-2">
                Не найден
              </div>
              <h1 className="cert-serif text-4xl font-black text-slate-900 mb-3">
                Сертификат не подтверждён
              </h1>
              <p className="text-slate-500 max-w-md mb-6">
                Сертификата с номером{' '}
                <span className="font-bold text-slate-700">
                  {data?.certificate_number}
                </span>{' '}
                не существует в нашей системе. Возможно, номер указан с ошибкой.
              </p>
            </>
          )}
        </div>
      </div>

      <Link
        to="/"
        className="mt-8 text-sm text-slate-500 hover:text-brand font-semibold transition-colors"
      >
        ← На главную
      </Link>
    </div>
  );
}