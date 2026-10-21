import { useState, useRef } from 'react';
import { UploadCloud, Film, Image as ImageIcon, Link2, X } from 'lucide-react';
import { uploadFile, API_BASE_URL } from '../../../../lib/api';

interface Props {
  content: string;
  onChange: (v: string) => void;
}

type Tab = 'upload' | 'url';

/** Resolve a potentially relative server path to a full URL */
function resolveUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  return `${API_BASE_URL}${url}`;
}

function detectType(url: string): 'youtube' | 'image' | 'video' | 'other' {
  if (!url) return 'other';
  if (url.includes('youtu')) return 'youtube';
  if (/\.(jpeg|jpg|gif|png|webp|svg)(\?|$)/i.test(url)) return 'image';
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return 'video';
  return 'other';
}

function getYoutubeId(url: string): string {
  if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
  return url.split('/').pop() || '';
}

export function VideoBlock({ content, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadFile(files[0]);
      onChange(res.url);
    } catch {
      setError('Ошибка загрузки. Попробуйте ещё раз.');
    } finally {
      setUploading(false);
    }
  }

  // ── Preview mode (content already set) ────────────────────────────────────
  if (content) {
    const type = detectType(content);
    const src  = resolveUrl(content);

    return (
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 my-2 group/media">
        {type === 'youtube' && (
          <iframe
            className="w-full aspect-video"
            src={`https://www.youtube.com/embed/${getYoutubeId(content)}`}
            allowFullScreen
          />
        )}
        {type === 'image' && (
          <img src={src} alt="Медиа" className="w-full max-h-[400px] object-cover" />
        )}
        {type === 'video' && (
          <video src={src} controls className="w-full aspect-video bg-black" />
        )}
        {type === 'other' && (
          <div className="flex items-center gap-3 px-5 py-4 text-slate-600 text-sm">
            <Film className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{content}</span>
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => onChange('')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" /> Удалить
          </button>
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-xl text-sm font-bold hover:bg-blue-50 hover:text-brand transition-colors"
          >
            <UploadCloud className="w-4 h-4" /> Заменить
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            accept="video/mp4,video/webm,image/png,image/jpeg,image/gif,image/webp"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>
    );
  }

  // ── Upload / URL form ──────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-slate-200 bg-white my-2 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {[
          { id: 'upload' as Tab, label: 'Загрузить файл', Icon: UploadCloud },
          { id: 'url'    as Tab, label: 'YouTube / URL',  Icon: Link2     },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              tab === id
                ? 'text-brand border-b-2 border-brand bg-blue-50/40'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Upload drop zone */}
      {tab === 'upload' && (
        <div
          className={`m-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            dragging
              ? 'border-brand bg-blue-50 scale-[1.01]'
              : 'border-slate-200 hover:border-brand/50 hover:bg-slate-50'
          }`}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none">
            {uploading ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3 animate-pulse">
                  <UploadCloud className="w-6 h-6 text-brand" />
                </div>
                <p className="text-sm font-semibold text-brand">Загружаем...</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <Film className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-brand" />
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">
                  Перетащите файл сюда или{' '}
                  <span className="text-brand underline underline-offset-2">выберите</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">MP4, WebM, PNG, JPG, GIF · до 50 МБ</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="video/mp4,video/webm,image/png,image/jpeg,image/gif,image/webp"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* URL input */}
      {tab === 'url' && (
        <div className="p-4 flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && urlInput.trim()) onChange(urlInput.trim()); }}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:border-brand text-sm font-medium text-slate-700 placeholder-slate-400"
            autoFocus
          />
          <button
            onClick={() => urlInput.trim() && onChange(urlInput.trim())}
            disabled={!urlInput.trim()}
            className="px-5 py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Добавить
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-semibold px-4 pb-3">{error}</p>}
    </div>
  );
}
