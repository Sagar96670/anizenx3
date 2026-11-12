export interface AnimeItem {
  id: string;
  tmdbId?: string;
  originalTmdbId?: string;
  title: string;
  language?: string;
  type?: string;
  category?: string;
  status?: string;
  poster: string;
  backdrop: string;
  genres: string[];
  synopsis: string;
  rating: string;
  releaseDate?: string;
  keywords?: string[];
}

export interface SeasonInfo {
  season: number;
  episode_count: number;
  status: string;
  title?: string;
  isManual?: boolean;
}

export interface EpisodeItem {
  episode_number: number;
  title: string;
  season: number;
  episodeId: string;
  source?: 'api' | 'manual';
  video_url?: string;
  qualities?: Record<string, string>;
  default_quality?: string;
  thumbnail?: string;
  description?: string;
  isManual?: boolean;
  manualId?: string;
  isMissing?: boolean;
  updatedAt?: string;
}

export interface ManualEpisode {
  id: string; // unique key e.g. `${animeId}_s${season}_e${episode_number}`
  animeId: string;
  animeTitle: string;
  season: number;
  episode_number: number;
  title: string;
  video_url: string;
  qualities?: Record<string, string>;
  default_quality?: string;
  thumbnail?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualSeason {
  animeId: string;
  season: number;
  episode_count?: number;
  title?: string;
  status?: string;
}

export interface MovieItem {
  id: string;
  tmdbId?: string;
  title: string;
  language?: string;
  type?: string;
  category?: string;
  status?: string;
  poster: string;
  backdrop: string;
  genres: string[];
  synopsis: string;
  rating: string;
  releaseDate?: string;
}

export interface ResolverResponse {
  status: boolean;
  animeTitle?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  quality?: string;
  available_qualities?: string[];
  format?: string;
  video_url?: string;
  error?: string;
  source?: 'api' | 'manual';
}

export interface DownloadResponse {
  status: boolean;
  animeTitle?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  available_qualities?: string[];
  downloads?: Record<string, string>;
  error?: string;
}

export type BlockType = 'episode' | 'season' | 'anime';

export interface BlockedRecord {
  id: string;
  type: BlockType;
  animeId: string;
  animeTitle?: string;
  season?: number;
  episode_number?: number;
  reason?: string;
  deletedAt: string;
}

export interface BlockedStore {
  episodes: Record<string, BlockedRecord>;
  seasons: Record<string, BlockedRecord>;
  anime: Record<string, BlockedRecord>;
}

export type UpdateType = 'NEW_ANIME' | 'NEW_SEASON' | 'NEW_EPISODE' | 'UPDATED';
export type UpdateBadge = 'NEW' | 'NEW SEASON' | 'NEW EPISODE' | 'UPDATED';

export interface UpdateRecord {
  id: string;
  animeId: string;
  animeTitle: string;
  season: number;
  episode: number;
  updateType: UpdateType;
  badge: UpdateBadge;
  poster: string;
  description?: string;
  timestamp: string;
}

export interface AnimeRankingItem {
  rank: number;
  animeId: string;
  title: string;
  poster: string;
  backdrop?: string;
  genres: string[];
  rating?: string;
  totalViews: number;
  recentViews: number;
  releaseDate?: string;
  lastViewedAt?: string;
}


