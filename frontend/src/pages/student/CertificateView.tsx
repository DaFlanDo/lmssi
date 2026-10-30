import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Share2, Check, ShieldCheck } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { CertificateDetail } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CertificateSheet } from '../../components/certificate/CertificateSheet';

export function CertificateView() {
  const { number } = useParams<{ number: string }>();
  const [data, setData] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!number) return;
    apiGet<CertificateDetail>(`/api/certificates/by-number/${number}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [number]);

  if (loading) return <LoadingSpinner fullPage />;
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-2xl font-black text-slate-800 mb-3">Сертификат не найден</h2>
        <p className="text-slate-500 mb-6">{error || 'Возможно, ссылка устарела.'}</p>
        <Link
          to="/dashboard"
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold"
        >
          На дашборд
        </Link>
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${data.certificate_number}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}&margin=0`;

  const copy = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{
        background:
          'radial-gradient(1200px 600px at 50% 0%, rgba(59,91,219,0.08), transparent 60%), radial-gradient(900px 600px at 50% 100%, rgba(30,58,138,0.12), transparent 60%), #f8fafc',
      }}
    >
      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8 no-print">
        <Link
          to="/certificates"
          className="flex items-center gap-2 text-slate-600 hover:text-brand font-bold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Мои сертификаты
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={copy}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl font-semibold shadow-sm border border-slate-200 hover:border-brand hover:text-brand transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Скопировано' : 'Скопировать ссылку'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-bold shadow-lg shadow-brand/30 hover:-translate-y-0.5 transition-all"
          >
            <Printer className="w-4 h-4" /> Распечатать / PDF
          </button>
        </div>
      </div>

      {/* Certificate */}
      <div className="max-w-5xl mx-auto">
        <CertificateSheet
          data={{
            certificate_number: data.certificate_number,
            user_full_name: data.user_full_name,
            course_title: data.course_title,
            issued_at: data.issued_at,
            completed_at: data.completed_at,
            score: data.score,
            total_lessons: data.total_lessons,
            verifyUrl,
            qrUrl,
          }}
        />
      </div>

      {/* Verification info */}
      <div className="max-w-5xl mx-auto mt-8 no-print">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-800">Сертификат подлинный</div>
            <div className="text-sm text-slate-500 mt-0.5">
              Подлинность можно проверить по ссылке:{' '}
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand font-semibold hover:underline"
              >
                {verifyUrl}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}