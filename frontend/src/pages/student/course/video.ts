// Распознавание видео-ссылок: YouTube или прямой файл
export const ytVideoId = (url: string): string | null => {
  if (!url.includes('youtu')) return null;
  return url.includes('v=') ? url.split('v=')[1].split('&')[0] : (url.split('/').pop() || null);
};

export const isPlayableVideo = (url: string): boolean =>
  !!ytVideoId(url) || /\.(mp4|webm|ogg)$/i.test(url);
