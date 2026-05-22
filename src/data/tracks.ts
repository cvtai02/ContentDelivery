export type Mood = 'lofi' | 'trending' | 'viet' | 'focus';

export interface Track {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  duration: string;
  mood: Mood;
}

export const TRACKS: Track[] = [
  // ── Lo-fi / Chill ──
  { id: '1',  title: 'lofi hip hop radio – beats to relax/study', artist: 'Lofi Girl',             youtubeId: 'jfKfPfyJRdk', duration: 'Live', mood: 'lofi' },
  { id: '2',  title: 'Coffee Shop Ambience & Jazz',               artist: 'Cozy Ambience',          youtubeId: 'h__fhhAmSbU', duration: '3:12', mood: 'lofi' },
  { id: '3',  title: 'Rainy Day Lofi',                            artist: 'Chillhop Music',         youtubeId: 'Dx5qFachd3A', duration: '2:48', mood: 'lofi' },
  { id: '4',  title: 'Night Drive Beats',                         artist: 'College Music',          youtubeId: '5qap5aO4i9A', duration: '3:30', mood: 'lofi' },

  // ── Trending ──
  { id: '5',  title: 'APT.',                                      artist: 'ROSE & Bruno Mars',      youtubeId: 'cLXxUNKhGXE', duration: '2:57', mood: 'trending' },
  { id: '6',  title: 'Espresso',                                  artist: 'Sabrina Carpenter',      youtubeId: 'eVli-tstM5E', duration: '2:55', mood: 'trending' },
  { id: '7',  title: 'Die With A Smile',                          artist: 'Lady Gaga & Bruno Mars', youtubeId: 'kPa7bsKwL-c', duration: '4:11', mood: 'trending' },
  { id: '8',  title: 'Not Like Us',                               artist: 'Kendrick Lamar',         youtubeId: '6ON7Sig7_KY', duration: '4:34', mood: 'trending' },

  // ── Nhạc Việt ──
  { id: '9',  title: 'Chúng Ta Của Hiện Tại',                    artist: 'Sơn Tùng M-TP',         youtubeId: '9f4eMxGb9tY', duration: '4:10', mood: 'viet' },
  { id: '10', title: 'Bắc Bling',                                 artist: 'Wren Evans',             youtubeId: 'cUkEiQGMzXI', duration: '3:04', mood: 'viet' },
  { id: '11', title: 'Túy Âm',                                    artist: 'Obito, Seachains',       youtubeId: 'GU4IJKTJY3U', duration: '4:22', mood: 'viet' },
  { id: '12', title: 'Nắng',                                      artist: 'MONO',                   youtubeId: '7R0OI2Fq14s', duration: '4:01', mood: 'viet' },

  // ── Focus / Instrumental ──
  { id: '13', title: 'Time',                                      artist: 'Hans Zimmer',            youtubeId: 'RxabLA7UQ9k', duration: '4:35', mood: 'focus' },
  { id: '14', title: 'Experience',                                 artist: 'Ludovico Einaudi',       youtubeId: 'hN_q-_jjF9o', duration: '5:15', mood: 'focus' },
  { id: '15', title: 'Clair de Lune',                             artist: 'Claude Debussy',         youtubeId: 'WNcsUNKnbDY', duration: '5:02', mood: 'focus' },
  { id: '16', title: 'Comptine d\'un autre été',                  artist: 'Yann Tiersen',           youtubeId: 'yYZGHEBgiqM', duration: '2:22', mood: 'focus' },
];

export const MOODS: { key: Mood; label: string; icon: string; color: string }[] = [
  { key: 'lofi',     label: 'Lo-fi',     icon: '☕', color: 'text-accent'   },
  { key: 'trending', label: 'Trending',  icon: '🔥', color: 'text-hot'      },
  { key: 'viet',     label: 'Nhạc Việt', icon: '🇻🇳', color: 'text-rise'    },
  { key: 'focus',    label: 'Focus',     icon: '🎯', color: 'text-warn'     },
];
