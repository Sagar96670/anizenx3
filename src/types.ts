export interface AnimeItem {
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
  keywords?: string[];
}

export interface SeasonInfo {
  season: number;
  episode_count: number;
  status: string;
}

export interface EpisodeItem {
  episode_number: number;
  title: string;
  season: number;
  episodeId: string;
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
}
