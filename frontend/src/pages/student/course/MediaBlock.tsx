import { useEffect, useRef } from 'react';
import { PlayCircle, Lock } from 'lucide-react';
import { ytVideoId } from './video';

// ── Media block (с трекингом просмотра для гейта видео) ───────────────────────

// Ленивая загрузка YouTube IFrame API (один раз на страницу)
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const w = window as unknown as { YT?: { Player: unknown }; onYouTubeIframeAPIReady?: () => void };
    if (w.YT && w.YT.Player) { resolve(); return; }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

function YouTubeWatch({ videoId, onWatch, noSeek }: { videoId: string; onWatch?: (frac: number) => void; noSeek?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onWatchRef = useRef(onWatch);
  const noSeekRef = useRef(noSeek);
  useEffect(() => { onWatchRef.current = onWatch; }, [onWatch]);
  useEffect(() => { noSeekRef.current = noSeek; }, [noSeek]);
  useEffect(() => {
    type Pl = {
      getCurrentTime: () => number; getDuration: () => number;
      seekTo: (s: number, allow: boolean) => void; destroy: () => void;
    };
    let player: (Pl & { pauseVideo?: () => void; playVideo?: () => void }) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let maxWatched = 0;
    const SEEK_TOLERANCE = 1.5;

    const handleVisibility = () => {
      if (document.hidden) {
        player?.pauseVideo?.();
      } else {
        player?.playVideo?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return;
      const YT = (window as unknown as { YT: { Player: new (el: HTMLElement, opts: unknown) => Pl } }).YT;
      player = new YT.Player(hostRef.current, {
        videoId,
        events: {
          onReady: () => {
            poll = setInterval(() => {
              if (!player) return;
              const dur = player.getDuration();
              const t = player.getCurrentTime();
              if (dur <= 0) return;
              if (noSeekRef.current && t > maxWatched + SEEK_TOLERANCE) {
                player.seekTo(maxWatched, true);
              } else if (t <= maxWatched + SEEK_TOLERANCE) {
                maxWatched = Math.max(maxWatched, t);
              }
              onWatchRef.current?.(maxWatched / dur);
            }, 500);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      document.removeEventListener('visibilitychange', handleVisibility);
      try { player?.destroy(); } catch { /* noop */ }
    };
  }, [videoId]);

  return (
    <div className="mt-6">
      <div className="w-full aspect-video rounded-[24px] shadow-xl overflow-hidden bg-black">
        <div ref={hostRef} className="w-full h-full" />
      </div>
      {noSeek && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-2">
          <Lock className="w-3 h-3" /> Перемотка вперёд недоступна — ролик нужно досмотреть
        </p>
      )}
    </div>
  );
}

export function MediaBlock({ block, onWatch }: { block: { id?: string; content: string }; onWatch?: (frac: number) => void }) {
  const url = block.content || '';
  const vid = ytVideoId(url);
  const maxWatchedRef = useRef(0);
  const SEEK_TOLERANCE = 1.5;

  if (vid) {
    // Если трекинг не нужен — лёгкий iframe; иначе плеер с IFrame API и блокировкой перемотки.
    if (!onWatch) {
      return <iframe className="w-full aspect-video rounded-[24px] mt-6 shadow-xl" src={`https://www.youtube.com/embed/${vid}`} allowFullScreen />;
    }
    return <YouTubeWatch videoId={vid} onWatch={onWatch} noSeek />;
  }
  if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))
    return <img src={url} alt="Media" className="w-full rounded-[24px] mt-6 max-h-[500px] object-cover shadow-xl" />;
  if (url.match(/\.(mp4|webm|ogg)$/i))
    return (
      <div className="mt-6">
        <video
          src={url}
          controls
          onTimeUpdate={onWatch ? (e) => {
            const v = e.currentTarget;
            if (!v.duration) return;
            if (v.currentTime <= maxWatchedRef.current + SEEK_TOLERANCE) {
              maxWatchedRef.current = Math.max(maxWatchedRef.current, v.currentTime);
            }
            onWatch(maxWatchedRef.current / v.duration);
          } : undefined}
          onSeeking={onWatch ? (e) => {
            // Прыжок вперёд дальше досмотренного — возвращаем назад.
            const v = e.currentTarget;
            if (v.currentTime > maxWatchedRef.current + SEEK_TOLERANCE) {
              v.currentTime = maxWatchedRef.current;
            }
          } : undefined}
          className="w-full rounded-[24px] aspect-video shadow-xl bg-black"
        />
        {onWatch && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-2">
            <Lock className="w-3 h-3" /> Перемотка вперёд недоступна — ролик нужно досмотреть
          </p>
        )}
      </div>
    );
  return (
    <div className="my-10 p-3 bg-slate-50/80 rounded-[28px] border border-slate-100 flex items-center justify-center h-[350px]">
      <PlayCircle className="w-16 h-16 text-slate-300" />
    </div>
  );
}
