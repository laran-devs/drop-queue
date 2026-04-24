export type MediaType = 'youtube' | 'spotify' | 'file' | 'link' | 'soundcloud';

export interface MediaInfo {
  type: MediaType;
  embedUrl?: string;
  originalUrl: string;
}

export function getMediaInfo(url: string | null, filePath: string | null): MediaInfo {
  // 1. Direct File Case
  if (filePath) {
    return {
      type: 'file',
      originalUrl: filePath,
    };
  }

  if (!url) {
    return {
      type: 'link',
      originalUrl: '#',
    };
  }

  // 2. YouTube Parsing
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1`,
      originalUrl: url,
    };
  }

  // 3. Spotify Parsing
  const spotifyMatch = url.match(/(?:https?:\/\/)?(?:open\.spotify\.com\/track\/)([a-zA-Z0-9]{22})/);
  if (spotifyMatch && spotifyMatch[1]) {
    return {
      type: 'spotify',
      embedUrl: `https://open.spotify.com/embed/track/${spotifyMatch[1]}?utm_source=generator`,
      originalUrl: url,
    };
  }

  // 4. SoundCloud Parsing
  const scMatch = url.match(/(https?:\/\/(soundcloud\.com|snd\.sc)\/.*)/);
  if (scMatch) {
    return {
      type: 'soundcloud',
      originalUrl: url,
    };
  }

  // 5. Default Case (other links)
  return {
    type: 'link',
    originalUrl: url,
  };
}
