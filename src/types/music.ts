export type MusicTab = 'tiktok-vn' | 'tiktok-global' | 'douyin';

export interface Track {
  name: string;
  artist: string;
  plays: string;
  emoji: string;
  hot: boolean;
}

export type MusicCharts = Record<MusicTab, Track[]>;
