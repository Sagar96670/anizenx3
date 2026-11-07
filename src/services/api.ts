import { AnimeItem, MovieItem, SeasonInfo, EpisodeItem, ResolverResponse } from '../types';

export const LIVE_API_BASE = 'https://anime-api-new.antideploy.app';
const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || undefined;
export const API_BASE_URL = (envBase || LIVE_API_BASE).replace(/\/+$/, '');

/**
 * Universal fetch wrapper that directly calls the live ANIZENX API
 * with fallback support for relative endpoints if running behind a local/custom proxy.
 */
async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (res.ok) {
      return res;
    }

    // If direct call returned an error (e.g. 404) and we used an absolute URL,
    // attempt local proxy fallback if available in development.
    if (fullUrl.startsWith('http') && cleanEndpoint.startsWith('/api')) {
      try {
        const localRes = await fetch(cleanEndpoint, options);
        if (localRes.ok) return localRes;
      } catch {
        // Continue with original response
      }
    }

    return res;
  } catch (err) {
    // Network error on cross-origin fetch: try local fallback if applicable
    if (fullUrl.startsWith('http') && cleanEndpoint.startsWith('/api')) {
      return await fetch(cleanEndpoint, options);
    }
    throw err;
  }
}

export async function checkHealth(): Promise<{ status: boolean; message: string }> {
  try {
    const res = await apiFetch('/api/health');
    if (!res.ok) {
      return { status: false, message: `Server returned HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      status: Boolean(data.status),
      message: data.message || 'Server is healthy'
    };
  } catch (e: any) {
    console.error('API health check error:', e);
    return { status: false, message: e?.message || 'API connection failed' };
  }
}

export async function fetchAnimeList(
  page = 1,
  limit = 30,
  search = '',
  genre = ''
): Promise<{ status: boolean; total: number; anime: AnimeItem[] }> {
  try {
    const res = await apiFetch('/api/anime');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const data = await res.json();
    const rawList: AnimeItem[] = data.anime || data.data || data.results || (Array.isArray(data) ? data : []);

    let filtered = rawList;

    // Filter by search query if provided
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(q) ||
        item.synopsis?.toLowerCase().includes(q) ||
        item.keywords?.some(k => k.toLowerCase().includes(q))
      );
    }

    // Filter by genre if provided
    if (genre.trim()) {
      const g = genre.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.genres?.some(genreName => genreName.toLowerCase() === g)
      );
    }

    const total = filtered.length;

    // Apply pagination if limit is specified and greater than 0
    let anime = filtered;
    if (limit > 0 && total > limit) {
      const start = Math.max(0, (page - 1) * limit);
      anime = filtered.slice(start, start + limit);
    }

    return {
      status: data.status !== false && rawList.length > 0,
      total,
      anime
    };
  } catch (e) {
    console.error('Fetch anime list error:', e);
    return { status: false, total: 0, anime: [] };
  }
}

export async function fetchAnimeDetail(animeId: string): Promise<AnimeItem | null> {
  try {
    const res = await apiFetch(`/api/anime/${encodeURIComponent(animeId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.anime || data.data || data || null;
  } catch (e) {
    console.error('Fetch anime detail error:', e);
    return null;
  }
}

export async function fetchAnimeSeasons(animeId: string): Promise<{ total_seasons: number; seasons: SeasonInfo[] }> {
  try {
    const res = await apiFetch(`/api/anime/${encodeURIComponent(animeId)}/seasons`);
    if (!res.ok) return { total_seasons: 1, seasons: [] };
    const data = await res.json();
    const seasonsList: SeasonInfo[] = data.seasons || [];
    return {
      total_seasons: data.total_seasons || (seasonsList.length > 0 ? seasonsList.length : 1),
      seasons: seasonsList
    };
  } catch (e) {
    console.error('Fetch anime seasons error:', e);
    return { total_seasons: 1, seasons: [] };
  }
}

export async function fetchAnimeEpisodes(
  animeId: string,
  season = 1,
  page = 1,
  limit = 50
): Promise<EpisodeItem[]> {
  try {
    const res = await apiFetch(
      `/api/anime/${encodeURIComponent(animeId)}/episodes?season=${season}&page=${page}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.episodes || data.data || (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('Fetch anime episodes error:', e);
    return [];
  }
}

export async function fetchMoviesList(): Promise<{ status: boolean; total: number; movies: MovieItem[] }> {
  try {
    const res = await apiFetch('/api/movies');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const data = await res.json();
    const list: MovieItem[] = data.movies || data.data || data.results || (Array.isArray(data) ? data : []);
    return {
      status: data.status !== false && list.length > 0,
      total: data.total || list.length,
      movies: list
    };
  } catch (e) {
    console.error('Fetch movies list error:', e);
    return { status: false, total: 0, movies: [] };
  }
}

export async function fetchMovieDetail(movieId: string): Promise<MovieItem | null> {
  try {
    const res = await apiFetch(`/api/movies/${encodeURIComponent(movieId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.movie || data.data || data || null;
  } catch (e) {
    console.error('Fetch movie detail error:', e);
    return null;
  }
}

export async function resolveBlakiteVideo(
  animeId: string,
  episodeId: string,
  quality?: string
): Promise<ResolverResponse> {
  try {
    let url = `/api/resolve/blakite/${encodeURIComponent(animeId)}/${encodeURIComponent(episodeId)}`;
    if (quality && quality !== 'Auto') {
      url += `?quality=${encodeURIComponent(quality)}`;
    }
    const res = await apiFetch(url);
    if (!res.ok) {
      return { status: false, error: `Resolver HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    console.error('Resolve Blakite video error:', e);
    return { status: false, error: e?.message || 'Failed to resolve video stream' };
  }
}
