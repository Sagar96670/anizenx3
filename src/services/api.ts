import { AnimeItem, MovieItem, SeasonInfo, EpisodeItem, ResolverResponse } from '../types';

export async function checkHealth(): Promise<{ status: boolean; message: string }> {
  try {
    const res = await fetch('/api/health');
    return await res.json();
  } catch (e) {
    return { status: false, message: 'API connection failed' };
  }
}

export async function fetchAnimeList(page = 1, limit = 30, search = '', genre = ''): Promise<{ status: boolean; total: number; anime: AnimeItem[] }> {
  try {
    let url = `/api/anime?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    const res = await fetch(url);
    const data = await res.json();
    return {
      status: data.status || true,
      total: data.total || (data.anime ? data.anime.length : 0),
      anime: data.anime || data.data || data.results || []
    };
  } catch (e) {
    console.error('Fetch anime list error:', e);
    return { status: false, total: 0, anime: [] };
  }
}

export async function fetchAnimeDetail(animeId: string): Promise<AnimeItem | null> {
  try {
    const res = await fetch(`/api/anime/${animeId}`);
    const data = await res.json();
    return data.anime || data.data || data;
  } catch (e) {
    console.error('Fetch anime detail error:', e);
    return null;
  }
}

export async function fetchAnimeSeasons(animeId: string): Promise<{ total_seasons: number; seasons: SeasonInfo[] }> {
  try {
    const res = await fetch(`/api/anime/${animeId}/seasons`);
    const data = await res.json();
    return {
      total_seasons: data.total_seasons || 1,
      seasons: data.seasons || []
    };
  } catch (e) {
    console.error('Fetch anime seasons error:', e);
    return { total_seasons: 1, seasons: [] };
  }
}

export async function fetchAnimeEpisodes(animeId: string, season = 1, page = 1, limit = 50): Promise<EpisodeItem[]> {
  try {
    const res = await fetch(`/api/anime/${animeId}/episodes?season=${season}&page=${page}&limit=${limit}`);
    const data = await res.json();
    return data.episodes || data.data || [];
  } catch (e) {
    console.error('Fetch anime episodes error:', e);
    return [];
  }
}

export async function fetchMoviesList(): Promise<{ status: boolean; total: number; movies: MovieItem[] }> {
  try {
    const res = await fetch('/api/movies');
    const data = await res.json();
    return {
      status: data.status || true,
      total: data.total || (data.movies ? data.movies.length : 0),
      movies: data.movies || data.data || data.results || []
    };
  } catch (e) {
    console.error('Fetch movies list error:', e);
    return { status: false, total: 0, movies: [] };
  }
}

export async function fetchMovieDetail(movieId: string): Promise<MovieItem | null> {
  try {
    const res = await fetch(`/api/movies/${movieId}`);
    const data = await res.json();
    return data.movie || data.data || data;
  } catch (e) {
    console.error('Fetch movie detail error:', e);
    return null;
  }
}

export async function resolveBlakiteVideo(animeId: string, episodeId: string, quality?: string): Promise<ResolverResponse> {
  try {
    let url = `/api/resolve/blakite/${animeId}/${episodeId}`;
    if (quality) {
      url += `?quality=${encodeURIComponent(quality)}`;
    }
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error('Resolve Blakite video error:', e);
    return { status: false, error: 'Failed to resolve video stream' };
  }
}
