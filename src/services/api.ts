import { AnimeItem, MovieItem, SeasonInfo, EpisodeItem, ResolverResponse } from '../types';

export const LIVE_API_BASE = 'https://anime-api-new.antideploy.app';
const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || undefined;
export const API_BASE_URL = (envBase || LIVE_API_BASE).replace(/\/+$/, '');

// ==========================================
// CLIENT-SIDE HIGH-PERFORMANCE CACHE ENGINE
// ==========================================
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL for catalog & details
const STORAGE_PREFIX = 'anizenx_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache stores for instant 0ms access
let memoryAnimeCatalog: AnimeItem[] | null = null;
let memoryMoviesCatalog: MovieItem[] | null = null;
let inFlightCatalogPromise: Promise<AnimeItem[]> | null = null;
let inFlightMoviesPromise: Promise<MovieItem[]> | null = null;

const animeDetailCache = new Map<string, CacheEntry<AnimeItem>>();
const movieDetailCache = new Map<string, CacheEntry<MovieItem>>();
const seasonsCache = new Map<string, CacheEntry<{ total_seasons: number; seasons: SeasonInfo[] }>>();
const episodesCache = new Map<string, CacheEntry<EpisodeItem[]>>();
const resolverCache = new Map<string, CacheEntry<ResolverResponse>>();

/**
 * Safe helper to read from sessionStorage without crashing in private browsing/iframes
 */
function readStorage<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Safe helper to write to sessionStorage with storage quota guard
 */
function writeStorage<T>(key: string, data: T): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // If storage is full or restricted, in-memory cache still functions seamlessly
  }
}

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
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (res.ok) {
      return res;
    }

    if (fullUrl.startsWith('http') && cleanEndpoint.startsWith('/api')) {
      try {
        const localRes = await fetch(cleanEndpoint, options);
        if (localRes.ok) return localRes;
      } catch {
        // Fallback to original response
      }
    }

    return res;
  } catch (err) {
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
      message: data.message || 'Server is healthy',
    };
  } catch (e: any) {
    console.error('API health check error:', e);
    return { status: false, message: e?.message || 'API connection failed' };
  }
}

/**
 * Synchronously checks if anime catalog is already available in memory or session storage.
 * Enables instant 0ms first-render on page loads without skeleton flicker.
 */
export function getSynchronousCachedAnimeList(): AnimeItem[] | null {
  if (memoryAnimeCatalog && memoryAnimeCatalog.length > 0) {
    return memoryAnimeCatalog;
  }
  const stored = readStorage<AnimeItem[]>('anime_catalog');
  if (stored && stored.length > 0) {
    memoryAnimeCatalog = stored;
    return stored;
  }
  return null;
}

/**
 * Synchronously checks if movies catalog is already available in memory or session storage.
 */
export function getSynchronousCachedMoviesList(): MovieItem[] | null {
  if (memoryMoviesCatalog && memoryMoviesCatalog.length > 0) {
    return memoryMoviesCatalog;
  }
  const stored = readStorage<MovieItem[]>('movies_catalog');
  if (stored && stored.length > 0) {
    memoryMoviesCatalog = stored;
    return stored;
  }
  return null;
}

/**
 * Internal loader for the full anime catalog with in-flight deduplication and caching.
 */
async function loadFullAnimeCatalog(): Promise<AnimeItem[]> {
  const sync = getSynchronousCachedAnimeList();
  if (sync) return sync;

  // If another component is already fetching the catalog, reuse the same promise!
  if (inFlightCatalogPromise) {
    return inFlightCatalogPromise;
  }

  inFlightCatalogPromise = (async () => {
    try {
      const res = await apiFetch('/api/anime');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      const rawList: AnimeItem[] =
        data.anime || data.data || data.results || (Array.isArray(data) ? data : []);

      if (rawList.length > 0) {
        memoryAnimeCatalog = rawList;
        writeStorage('anime_catalog', rawList);
      }
      return rawList;
    } finally {
      inFlightCatalogPromise = null;
    }
  })();

  return inFlightCatalogPromise;
}

/**
 * Optimized fetchAnimeList:
 * Uses fast in-memory filtering from the cached catalog.
 * Avoids repeated 450 KB network round-trips on every search keystroke, filter, or page change.
 */
export async function fetchAnimeList(
  page = 1,
  limit = 30,
  search = '',
  genre = ''
): Promise<{ status: boolean; total: number; anime: AnimeItem[] }> {
  try {
    const rawList = await loadFullAnimeCatalog();

    let filtered = rawList;

    // Filter by search query if provided
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.synopsis?.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }

    // Filter by genre if provided
    if (genre.trim()) {
      const g = genre.trim().toLowerCase();
      filtered = filtered.filter((item) =>
        item.genres?.some((genreName) => genreName.toLowerCase() === g)
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
      status: rawList.length > 0,
      total,
      anime,
    };
  } catch (e) {
    console.error('Fetch anime list error:', e);
    return { status: false, total: 0, anime: [] };
  }
}

/**
 * Optimized fetchAnimeDetail with instant memory/catalog lookup and caching.
 */
export async function fetchAnimeDetail(animeId: string): Promise<AnimeItem | null> {
  const cleanId = String(animeId);

  // 1. Check in-memory detail cache
  const cached = animeDetailCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Check session storage
  const stored = readStorage<AnimeItem>(`anime_${cleanId}`);
  if (stored) {
    animeDetailCache.set(cleanId, { data: stored, timestamp: Date.now() });
    return stored;
  }

  // 3. Fast lookup from cached catalog if present
  if (memoryAnimeCatalog) {
    const match = memoryAnimeCatalog.find((a) => String(a.id) === cleanId);
    if (match) {
      animeDetailCache.set(cleanId, { data: match, timestamp: Date.now() });
      // We can return match immediately or fetch full detail in background
    }
  }

  try {
    const res = await apiFetch(`/api/anime/${encodeURIComponent(cleanId)}`);
    if (!res.ok) {
      // Fallback to catalog match if API fails
      if (memoryAnimeCatalog) {
        return memoryAnimeCatalog.find((a) => String(a.id) === cleanId) || null;
      }
      return null;
    }
    const data = await res.json();
    const item: AnimeItem | null = data.anime || data.data || data || null;
    if (item) {
      animeDetailCache.set(cleanId, { data: item, timestamp: Date.now() });
      writeStorage(`anime_${cleanId}`, item);
    }
    return item;
  } catch (e) {
    console.error('Fetch anime detail error:', e);
    if (memoryAnimeCatalog) {
      return memoryAnimeCatalog.find((a) => String(a.id) === cleanId) || null;
    }
    return null;
  }
}

/**
 * Optimized fetchAnimeSeasons with caching.
 */
export async function fetchAnimeSeasons(
  animeId: string
): Promise<{ total_seasons: number; seasons: SeasonInfo[] }> {
  const cleanId = String(animeId);
  const cacheKey = `seasons_${cleanId}`;

  const cached = seasonsCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const stored = readStorage<{ total_seasons: number; seasons: SeasonInfo[] }>(cacheKey);
  if (stored) {
    seasonsCache.set(cleanId, { data: stored, timestamp: Date.now() });
    return stored;
  }

  try {
    const res = await apiFetch(`/api/anime/${encodeURIComponent(cleanId)}/seasons`);
    if (!res.ok) return { total_seasons: 1, seasons: [] };
    const data = await res.json();
    const seasonsList: SeasonInfo[] = data.seasons || [];
    const result = {
      total_seasons: data.total_seasons || (seasonsList.length > 0 ? seasonsList.length : 1),
      seasons: seasonsList,
    };

    seasonsCache.set(cleanId, { data: result, timestamp: Date.now() });
    writeStorage(cacheKey, result);
    return result;
  } catch (e) {
    console.error('Fetch anime seasons error:', e);
    return { total_seasons: 1, seasons: [] };
  }
}

/**
 * Optimized fetchAnimeEpisodes with per-season caching.
 */
export async function fetchAnimeEpisodes(
  animeId: string,
  season = 1,
  page = 1,
  limit = 50
): Promise<EpisodeItem[]> {
  const cleanId = String(animeId);
  const cacheKey = `episodes_${cleanId}_s${season}_p${page}_l${limit}`;

  const cached = episodesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const stored = readStorage<EpisodeItem[]>(cacheKey);
  if (stored) {
    episodesCache.set(cacheKey, { data: stored, timestamp: Date.now() });
    return stored;
  }

  try {
    const res = await apiFetch(
      `/api/anime/${encodeURIComponent(cleanId)}/episodes?season=${season}&page=${page}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const episodes: EpisodeItem[] = data.episodes || data.data || (Array.isArray(data) ? data : []);

    if (episodes.length > 0) {
      episodesCache.set(cacheKey, { data: episodes, timestamp: Date.now() });
      writeStorage(cacheKey, episodes);
    }
    return episodes;
  } catch (e) {
    console.error('Fetch anime episodes error:', e);
    return [];
  }
}

/**
 * Optimized fetchMoviesList with deduplication and caching.
 */
export async function fetchMoviesList(): Promise<{ status: boolean; total: number; movies: MovieItem[] }> {
  const sync = getSynchronousCachedMoviesList();
  if (sync && sync.length > 0) {
    return { status: true, total: sync.length, movies: sync };
  }

  if (inFlightMoviesPromise) {
    const movies = await inFlightMoviesPromise;
    return { status: movies.length > 0, total: movies.length, movies };
  }

  inFlightMoviesPromise = (async () => {
    try {
      const res = await apiFetch('/api/movies');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      const list: MovieItem[] =
        data.movies || data.data || data.results || (Array.isArray(data) ? data : []);

      if (list.length > 0) {
        memoryMoviesCatalog = list;
        writeStorage('movies_catalog', list);
      }
      return list;
    } finally {
      inFlightMoviesPromise = null;
    }
  })();

  try {
    const movies = await inFlightMoviesPromise;
    return { status: movies.length > 0, total: movies.length, movies };
  } catch (e) {
    console.error('Fetch movies list error:', e);
    return { status: false, total: 0, movies: [] };
  }
}

/**
 * Optimized fetchMovieDetail with instant memory/catalog lookup and caching.
 */
export async function fetchMovieDetail(movieId: string): Promise<MovieItem | null> {
  const cleanId = String(movieId);
  const cacheKey = `movie_${cleanId}`;

  const cached = movieDetailCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const stored = readStorage<MovieItem>(cacheKey);
  if (stored) {
    movieDetailCache.set(cleanId, { data: stored, timestamp: Date.now() });
    return stored;
  }

  if (memoryMoviesCatalog) {
    const match = memoryMoviesCatalog.find((m) => String(m.id) === cleanId);
    if (match) {
      movieDetailCache.set(cleanId, { data: match, timestamp: Date.now() });
    }
  }

  try {
    const res = await apiFetch(`/api/movies/${encodeURIComponent(cleanId)}`);
    if (!res.ok) {
      if (memoryMoviesCatalog) {
        return memoryMoviesCatalog.find((m) => String(m.id) === cleanId) || null;
      }
      return null;
    }
    const data = await res.json();
    const item: MovieItem | null = data.movie || data.data || data || null;
    if (item) {
      movieDetailCache.set(cleanId, { data: item, timestamp: Date.now() });
      writeStorage(cacheKey, item);
    }
    return item;
  } catch (e) {
    console.error('Fetch movie detail error:', e);
    if (memoryMoviesCatalog) {
      return memoryMoviesCatalog.find((m) => String(m.id) === cleanId) || null;
    }
    return null;
  }
}

/**
 * Optimized resolveBlakiteVideo with resolution caching for repeat plays and fast quality switching.
 */
export async function resolveBlakiteVideo(
  animeId: string,
  episodeId: string,
  quality?: string
): Promise<ResolverResponse> {
  const cleanId = String(animeId);
  const cleanEp = String(episodeId);
  const cacheKey = `res_${cleanId}_${cleanEp}_${quality || 'default'}`;

  const cached = resolverCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    let url = `/api/resolve/blakite/${encodeURIComponent(cleanId)}/${encodeURIComponent(cleanEp)}`;
    if (quality && quality !== 'Auto') {
      url += `?quality=${encodeURIComponent(quality)}`;
    }
    const res = await apiFetch(url);
    if (!res.ok) {
      return { status: false, error: `Resolver HTTP ${res.status}` };
    }
    const data: ResolverResponse = await res.json();
    if (data && data.status && data.video_url) {
      resolverCache.set(cacheKey, { data, timestamp: Date.now() });
    }
    return data;
  } catch (e: any) {
    console.error('Resolve Blakite video error:', e);
    return { status: false, error: e?.message || 'Failed to resolve video stream' };
  }
}
