import { BrandLogo } from '../BrandLogo';

export interface CertificateSheetData {
  certificate_number: string;
  user_full_name: string;
  course_title: string;
  issued_at: string | null;
  completed_at?: string | null;
  score?: number | null;
  total_lessons?: number;
  verifyUrl: string;
  qrUrl: string;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

const NAVY = '#1e3a8a';
const INK = '#0f172a';
const SLATE = '#64748b';

// Тонкий угловой уголок рамки — сдержанный декор вместо лавровых венков.
function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: NAVY,
    borderStyle: 'solid',
    borderWidth: 0,
    opacity: 0.55,
  };
  const map: Record<string, React.CSSProperties> = {
    tl: { top: 30, left: 30, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
    tr: { top: 30, right: 30, borderTopWidth: 1.5, borderRightWidth: 1.5 },
    bl: { bottom: 30, left: 30, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
    br: { bottom: 30, right: 30, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  };
  return <div style={{ ...base, ...map[pos] }} />;
}

const S = {
  root: {
    position: 'relative' as const,
    width: '100%',
    minWidth: 720,
    aspectRatio: '1.414 / 1',
    borderRadius: 24,
    overflow: 'hidden',
    background: '#ffffff',
    boxShadow: '0 32px 80px -24px rgba(30,58,138,0.30), 0 0 0 1px rgba(37,99,235,0.06)',
  },
  content: {
    position: 'relative' as const,
    zIndex: 10,
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '52px 84px 44px',
    textAlign: 'center' as const,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: '0.4em',
    textTransform: 'uppercase' as const,
    color: SLATE,
    fontWeight: 700,
  },
};

export function CertificateSheet({ data }: { data: CertificateSheetData }) {
  const hasMetrics =
    !!data.total_lessons || (data.score !== null && data.score !== undefined);

  return (
    <div id="certificate-sheet" style={S.root}>
      {/* Очень мягкий тон сверху — ощущение бумаги, без пестроты */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(900px 380px at 50% -8%, rgba(37,99,235,0.05), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Одинарная тонкая рамка + волосок внутри (тон-в-тон, без золота) */}
      <div style={{ position: 'absolute', inset: 20, border: `1.5px solid ${NAVY}`, borderRadius: 16, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 27, border: '1px solid rgba(30,58,138,0.14)', borderRadius: 11, pointerEvents: 'none' }} />

      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      <div style={S.content}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BrandLogo size={38} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1, color: NAVY }}>
                LMS<span style={{ color: '#2563eb' }}>SI</span>
              </div>
              <div style={{ ...S.eyebrow, fontSize: 7.5, letterSpacing: '0.26em', marginTop: 3 }}>
                Корпоративное обучение
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={S.eyebrow}>Свидетельство о квалификации</div>
            <h1
              className="cert-serif"
              style={{ fontSize: '3.4rem', fontWeight: 900, letterSpacing: '0.14em', lineHeight: 1, color: NAVY, marginTop: 8 }}
            >
              СЕРТИФИКАТ
            </h1>
            {/* единственный тёплый штрих на всём документе */}
            <div style={{ width: 64, height: 2, borderRadius: 2, marginTop: 12, background: 'linear-gradient(90deg, transparent, #c9a227, transparent)' }} />
            <div style={{ ...S.eyebrow, marginTop: 12 }}>об успешном прохождении курса</div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 600 }}>
          <p className="cert-serif" style={{ color: SLATE, fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
            Настоящим удостоверяется, что
          </p>
          <h2 className="cert-name" style={{ fontSize: '2.5rem', color: INK, lineHeight: 1.15, marginBottom: 16 }}>
            {data.user_full_name}
          </h2>
          <div style={{ width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(30,58,138,0.30), transparent)', marginBottom: 16 }} />
          <p className="cert-serif" style={{ color: '#475569', fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}>
            успешно прошёл(а) обучение по программе повышения квалификации
          </p>
          <h3 className="cert-serif" style={{ fontSize: '1.3rem', fontWeight: 900, color: NAVY, lineHeight: 1.4 }}>
            «{data.course_title}»
          </h3>
        </div>

        {/* ── Metrics ────────────────────────────────────────────── */}
        {hasMetrics && (
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 14 }}>
            {data.total_lessons ? (
              <div style={{ textAlign: 'center', padding: '8px 24px', borderRadius: 12, background: 'rgba(37,99,235,0.045)', border: '1px solid rgba(37,99,235,0.12)' }}>
                <div className="cert-serif" style={{ fontSize: 22, fontWeight: 900, color: NAVY }}>{data.total_lessons}</div>
                <div style={{ ...S.eyebrow, fontSize: 8.5, letterSpacing: '0.22em', marginTop: 3 }}>Уроков</div>
              </div>
            ) : null}
            {data.score !== null && data.score !== undefined ? (
              <div style={{ textAlign: 'center', padding: '8px 24px', borderRadius: 12, background: 'rgba(37,99,235,0.045)', border: '1px solid rgba(37,99,235,0.12)' }}>
                <div className="cert-serif" style={{ fontSize: 22, fontWeight: 900, color: NAVY }}>{data.score}<span style={{ color: SLATE, fontSize: 14 }}>/100</span></div>
                <div style={{ ...S.eyebrow, fontSize: 8.5, letterSpacing: '0.22em', marginTop: 3 }}>Средний балл</div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Footer: дата · подпись · QR ─────────────────────────── */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* Дата */}
          <div style={{ textAlign: 'left', minWidth: 150 }}>
            <div style={{ ...S.eyebrow, fontSize: 8.5, color: '#94a3b8', marginBottom: 6 }}>Дата выдачи</div>
            <div className="cert-serif" style={{ fontSize: 14, color: INK, fontWeight: 700 }}>
              {formatDate(data.completed_at || data.issued_at)}
            </div>
          </div>

          {/* Подпись */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div className="cert-name" style={{ fontSize: 24, color: NAVY, lineHeight: 1, marginBottom: 6 }}>LMSSI</div>
            <div style={{ width: 180, height: 1, background: 'rgba(15,23,42,0.25)', margin: '0 auto 6px' }} />
            <div style={{ ...S.eyebrow, fontSize: 8, letterSpacing: '0.22em' }}>Учебный центр</div>
          </div>

          {/* QR + номер */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 150 }}>
            <img
              src={data.qrUrl}
              alt="QR-код для верификации"
              style={{ width: 72, height: 72, marginBottom: 6, borderRadius: 8, border: '1px solid rgba(30,58,138,0.18)', padding: 3, background: 'white' }}
            />
            <div style={{ ...S.eyebrow, fontSize: 8.5, letterSpacing: '0.16em' }}>№ {data.certificate_number}</div>
            <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>Проверка подлинности по QR</div>
          </div>
        </div>
      </div>
    </div>
  );
}
