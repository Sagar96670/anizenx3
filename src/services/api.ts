import {
  AnimeItem,
  MovieItem,
  SeasonInfo,
  EpisodeItem,
  ResolverResponse,
  ManualEpisode,
  ManualSeason,
  BlockedRecord,
  BlockedStore,
  BlockType,
} from '../types';

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
 * Invalidate in-memory and session cache for an anime to reflect immediate episode/season changes
 */
export function invalidateAnimeCache(animeId?: string): void {
  if (animeId) {
    const cleanId = String(animeId).trim();
    seasonsCache.delete(cleanId);
    for (const key of episodesCache.keys()) {
      if (key.includes(`_${cleanId}_`)) {
        episodesCache.delete(key);
      }
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(`${STORAGE_PREFIX}seasons_${cleanId}`);
      }
    } catch {
      // ignore
    }
  } else {
    seasonsCache.clear();
    episodesCache.clear();
    memoryAnimeCatalog = null;
  }
}

/**
 * Universal fetch wrapper that directly calls the live ANIZENX API
 * with fallback support for relative endpoints if running behind a local/custom proxy.
 */
async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Internal backend endpoints must NEVER be sent to external anime-api-new.antideploy.app
  const isLocalBackendRoute =
    cleanEndpoint.startsWith('/api/manual') ||
    cleanEndpoint.startsWith('/api/admin') ||
    cleanEndpoint.startsWith('/api/resolve') ||
    cleanEndpoint.startsWith('/api/blocks');

  if (isLocalBackendRoute) {
    try {
      const localRes = await fetch(cleanEndpoint, options);
      if (
        localRes.ok ||
        localRes.status === 400 ||
        localRes.status === 401 ||
        localRes.status === 403 ||
        localRes.status === 404 ||
        localRes.status === 409
      ) {
        return localRes;
      }
    } catch (err) {
      console.warn(`Direct fetch to local route ${cleanEndpoint} failed:`, err);
    }
  }

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
    const [rawList, blocks] = await Promise.all([
      loadFullAnimeCatalog(),
      fetchBlockedRecords(),
    ]);

    // Filter out permanently blocked anime
    let filtered = rawList.filter((item) => !blocks.anime[String(item.id)]);

    // Filter by search query if provided
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          String(item.id).toLowerCase().includes(q) ||
          (item.tmdbId && String(item.tmdbId).toLowerCase().includes(q)) ||
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

  // Check if anime is permanently blocked
  const blocks = await fetchBlockedRecords(cleanId);
  if (blocks.anime[cleanId]) {
    return null;
  }

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
    const text = await res.text();
    let data: ResolverResponse;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        status: false,
        error: `Resolver returned invalid response (HTTP ${res.status}). Server may be temporarily unreachable.`,
      };
    }
    if (data && data.status && data.video_url) {
      resolverCache.set(cacheKey, { data, timestamp: Date.now() });
    }
    return data;
  } catch (e: any) {
    console.error('Resolve Blakite video error:', e);
    return { status: false, error: e?.message || 'Failed to resolve video stream' };
  }
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
const ADMIN_TOKEN_KEY = 'anizenx_admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export async function adminLogin(secret: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await apiFetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    const data = await res.json();
    if (res.ok && data.status && data.token) {
      setAdminToken(data.token);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.error || 'Authentication failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Login request failed' };
  }
}

export async function verifyAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await apiFetch('/api/admin/verify', {
      headers: { 'x-admin-token': token },
    });
    const data = await res.json();
    return Boolean(data.status && data.authenticated);
  } catch {
    return false;
  }
}

// ==========================================
// MANUAL EPISODES & SEASONS APIS
// ==========================================
// Persistent browser-side backup so manual episodes NEVER disappear across reloads or network hiccups
const MANUAL_BACKUP_STORAGE_KEY = 'anizenx_manual_episodes_backup_v2';

function getLocalManualBackup(): Record<string, ManualEpisode> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(MANUAL_BACKUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function updateLocalManualBackup(episodes: ManualEpisode[]) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const store = getLocalManualBackup();
    episodes.forEach((ep) => {
      const key = `${ep.animeId}_s${ep.season}_e${ep.episode_number}`;
      store[key] = ep;
    });
    window.localStorage.setItem(MANUAL_BACKUP_STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

function removeLocalManualBackup(idOrKey: string) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const store = getLocalManualBackup();
    delete store[idOrKey];
    for (const [k, ep] of Object.entries(store)) {
      if (ep.id === idOrKey) {
        delete store[k];
      }
    }
    window.localStorage.setItem(MANUAL_BACKUP_STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

// ==========================================
// PERMANENT BLOCKS & DELETIONS ENGINE
// ==========================================
const BLOCKED_BACKUP_STORAGE_KEY = 'anizenx_blocked_records_backup_v2';
let memoryBlockedStore: BlockedStore | null = null;
let inFlightBlockedPromise: Promise<BlockedStore> | null = null;

function getLocalBlockedBackup(): BlockedStore {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { episodes: {}, seasons: {}, anime: {} };
    }
    const raw = window.localStorage.getItem(BLOCKED_BACKUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { episodes: {}, seasons: {}, anime: {} };
  } catch {
    return { episodes: {}, seasons: {}, anime: {} };
  }
}

function updateLocalBlockedBackup(store: BlockedStore) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(BLOCKED_BACKUP_STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export async function fetchBlockedRecords(animeId?: string, forceRefresh = false): Promise<BlockedStore> {
  if (!forceRefresh && memoryBlockedStore) {
    return memoryBlockedStore;
  }

  if (inFlightBlockedPromise && !forceRefresh) {
    return await inFlightBlockedPromise;
  }

  inFlightBlockedPromise = (async () => {
    try {
      let url = '/api/blocks';
      if (animeId) {
        url += `?animeId=${encodeURIComponent(animeId)}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status && data.blocks) {
          const blocks: BlockedStore = {
            episodes: data.blocks.episodes || {},
            seasons: data.blocks.seasons || {},
            anime: data.blocks.anime || {},
          };
          memoryBlockedStore = blocks;
          updateLocalBlockedBackup(blocks);
          return blocks;
        }
      }
    } catch (err) {
      console.warn('fetchBlockedRecords warning:', err);
    }

    // Fallback to local storage backup
    const backup = getLocalBlockedBackup();
    memoryBlockedStore = backup;
    return backup;
  })();

  try {
    return await inFlightBlockedPromise;
  } finally {
    inFlightBlockedPromise = null;
  }
}

export async function blockEpisodeAPI(
  animeId: string,
  season: number,
  episodeNumber: number,
  animeTitle?: string,
  reason?: string
): Promise<{ success: boolean; block?: BlockedRecord; message: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch('/api/admin/blocks/episode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({ animeId, season, episode_number: episodeNumber, animeTitle, reason }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.block) {
      if (memoryBlockedStore) {
        memoryBlockedStore.episodes[data.block.id] = data.block;
        updateLocalBlockedBackup(memoryBlockedStore);
      }
      removeLocalManualBackup(data.block.id);
      invalidateAnimeCache(animeId);
    }
    return {
      success: Boolean(res.ok && data.success),
      block: data.block,
      message: data.message || 'Episode deleted and blocked successfully',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to block episode' };
  }
}

export async function blockSeasonAPI(
  animeId: string,
  season: number,
  animeTitle?: string,
  reason?: string
): Promise<{ success: boolean; block?: BlockedRecord; message: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch('/api/admin/blocks/season', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({ animeId, season, animeTitle, reason }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.block) {
      if (memoryBlockedStore) {
        memoryBlockedStore.seasons[data.block.id] = data.block;
        updateLocalBlockedBackup(memoryBlockedStore);
      }
      invalidateAnimeCache(animeId);
    }
    return {
      success: Boolean(res.ok && data.success),
      block: data.block,
      message: data.message || 'Season deleted and blocked successfully',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to block season' };
  }
}

export async function blockAnimeAPI(
  animeId: string,
  animeTitle?: string,
  reason?: string
): Promise<{ success: boolean; block?: BlockedRecord; message: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch('/api/admin/blocks/anime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({ animeId, animeTitle, reason }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.block) {
      if (memoryBlockedStore) {
        memoryBlockedStore.anime[data.block.id] = data.block;
        updateLocalBlockedBackup(memoryBlockedStore);
      }
      invalidateAnimeCache();
    }
    return {
      success: Boolean(res.ok && data.success),
      block: data.block,
      message: data.message || 'Anime deleted and blocked successfully',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to block anime' };
  }
}

export async function restoreBlockAPI(
  type: BlockType,
  id: string
): Promise<{ success: boolean; message: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch('/api/admin/blocks/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({ type, id }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (memoryBlockedStore) {
        if (type === 'episode') delete memoryBlockedStore.episodes[id];
        if (type === 'season') delete memoryBlockedStore.seasons[id];
        if (type === 'anime') delete memoryBlockedStore.anime[id];
        updateLocalBlockedBackup(memoryBlockedStore);
      }
      invalidateAnimeCache();
    }
    return {
      success: Boolean(res.ok && data.success),
      message: data.message || 'Item restored successfully',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to restore item' };
  }
}

export async function fetchAdminBlocks(): Promise<BlockedStore> {
  const token = getAdminToken();
  try {
    const res = await apiFetch('/api/admin/blocks', {
      headers: token ? { 'x-admin-token': token } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data.blocks || { episodes: {}, seasons: {}, anime: {} };
    }
  } catch {}
  return fetchBlockedRecords(undefined, true);
}


export async function fetchManualEpisodes(animeId?: string, season?: number): Promise<ManualEpisode[]> {
  const cleanId = animeId ? String(animeId).trim() : undefined;
  try {
    let url = '/api/manual/episodes';
    const params = new URLSearchParams();
    if (cleanId) params.append('animeId', cleanId);
    if (season !== undefined) params.append('season', String(season));
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await apiFetch(url);
    if (res.ok) {
      const data = await res.json();
      const serverEpisodes: ManualEpisode[] = data.episodes || [];
      if (serverEpisodes.length > 0) {
        updateLocalManualBackup(serverEpisodes);
        return serverEpisodes;
      }
    }
  } catch (err) {
    console.warn('fetchManualEpisodes network warning:', err);
  }

  // Backup fallback from localStorage so manual episodes are NEVER lost
  const backupStore = getLocalManualBackup();
  let backupList = Object.values(backupStore);
  if (cleanId) {
    backupList = backupList.filter((e) => String(e.animeId).trim() === cleanId);
  }
  if (season !== undefined) {
    backupList = backupList.filter((e) => Number(e.season) === Number(season));
  }
  return backupList;
}

export async function saveManualEpisode(
  payload: Omit<ManualEpisode, 'id' | 'createdAt' | 'updatedAt'>,
  override = false
): Promise<{ success: boolean; episode?: ManualEpisode; exists?: boolean; message?: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch('/api/manual/episodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify({ ...payload, override }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.episode) {
      updateLocalManualBackup([data.episode]);
      invalidateAnimeCache(payload.animeId);
    }
    return {
      success: Boolean(res.ok && data.success),
      episode: data.episode,
      exists: data.exists,
      message: data.message || (res.ok ? 'Episode saved' : 'Failed to save episode'),
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error saving episode' };
  }
}

export async function deleteManualEpisode(id: string): Promise<{ success: boolean; message: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch(`/api/manual/episodes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: token ? { 'x-admin-token': token } : {},
    });
    const data = await res.json();
    if (res.ok && data.success) {
      removeLocalManualBackup(id);
      invalidateAnimeCache();
    }
    return {
      success: Boolean(res.ok && data.success),
      message: data.message || (res.ok ? 'Deleted successfully' : 'Delete failed'),
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Delete error' };
  }
}

/**
 * Delete an individual quality URL from a manual episode without deleting the episode
 */
export async function deleteManualEpisodeQuality(
  animeId: string,
  season: number,
  episodeNumber: number,
  quality: string
): Promise<{ success: boolean; episode?: ManualEpisode; message?: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch(
      `/api/manual/episodes/${encodeURIComponent(animeId)}/${season}/${episodeNumber}/quality/${encodeURIComponent(quality)}`,
      {
        method: 'DELETE',
        headers: token ? { 'x-admin-token': token } : {},
      }
    );
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.episode) {
        updateLocalManualBackup([data.episode]);
      }
      invalidateAnimeCache(animeId);
    }
    return {
      success: Boolean(res.ok && data.success),
      episode: data.episode,
      message: data.message || (res.ok ? 'Quality deleted successfully' : 'Failed to delete quality'),
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Delete quality error' };
  }
}

export async function fetchManualSeasons(animeId: string): Promise<ManualSeason[]> {
  try {
    const res = await apiFetch(`/api/manual/seasons?animeId=${encodeURIComponent(animeId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.seasons || [];
  } catch (err) {
    console.error('fetchManualSeasons error:', err);
    return [];
  }
}

export async function saveManualSeason(payload: ManualSeason): Promise<{ success: boolean; message: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch('/api/manual/seasons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      invalidateAnimeCache(payload.animeId);
    }
    return { success: Boolean(res.ok && data.success), message: data.message || 'Season saved' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Save season error' };
  }
}

export async function deleteManualSeason(animeId: string, season: number): Promise<{ success: boolean; message: string }> {
  const token = getAdminToken();
  try {
    const res = await apiFetch(`/api/manual/seasons/${encodeURIComponent(animeId)}/${season}`, {
      method: 'DELETE',
      headers: token ? { 'x-admin-token': token } : {},
    });
    const data = await res.json();
    if (res.ok && data.success) {
      invalidateAnimeCache(animeId);
    }
    return { success: Boolean(res.ok && data.success), message: data.message || 'Season deleted' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Delete season error' };
  }
}

// ==========================================
// CORE MERGING ENGINES
// ==========================================

/**
 * Merges API seasons with manually created seasons and manual episodes into a unified list.
 * Episode counts are calculated from the FINAL MERGED unique episode list:
 * - Uses composite unique identity: `${animeId}_s${season}_e${episode_number}`
 * - Counts both API and MANUAL unique episodes without double-counting.
 * - If API Episode 7 and MANUAL Episode 7 exist, they count as ONE episode.
 * - If API Episodes 1-6 and MANUAL Episode 7 exist, count is 7.
 */
export async function fetchMergedSeasons(animeId: string): Promise<{ total_seasons: number; seasons: SeasonInfo[] }> {
  try {
    const cleanId = String(animeId).trim();
    const [apiData, manualList, allManualEpisodes, blocks] = await Promise.all([
      fetchAnimeSeasons(cleanId),
      fetchManualSeasons(cleanId),
      fetchManualEpisodes(cleanId),
      fetchBlockedRecords(cleanId),
    ]);

    // If whole anime is blocked, return no seasons
    if (blocks.anime[cleanId]) {
      return { total_seasons: 0, seasons: [] };
    }

    const allSeasonNums = new Set<number>();
    (apiData.seasons || []).forEach((s) => allSeasonNums.add(Number(s.season)));
    (manualList || []).forEach((ms) => allSeasonNums.add(Number(ms.season)));
    (allManualEpisodes || []).forEach((me) => allSeasonNums.add(Number(me.season)));

    // Filter out permanently blocked seasons
    const activeSeasonNums = Array.from(allSeasonNums).filter(
      (sNum) => !blocks.seasons[`${cleanId}_s${sNum}`]
    );

    if (activeSeasonNums.length === 0) {
      return { total_seasons: 0, seasons: [] };
    }

    const seasons: SeasonInfo[] = activeSeasonNums
      .sort((a, b) => a - b)
      .map((seasonNum) => {
        const apiSeason = (apiData.seasons || []).find((s) => Number(s.season) === seasonNum);
        const manualSeason = (manualList || []).find((ms) => Number(ms.season) === seasonNum);
        const manualEpsForSeason = (allManualEpisodes || []).filter(
          (me) => Number(me.season) === seasonNum
        );

        // 1. Calculate unique episodes using anime_id + season_number + episode_number
        const uniqueEpisodeKeys = new Set<string>();

        // Add base API episodes (1 to apiSeason.episode_count), skipping blocked episodes
        const baseApiCount = apiSeason?.episode_count || 0;
        for (let ep = 1; ep <= baseApiCount; ep++) {
          const key = `${cleanId}_s${seasonNum}_e${ep}`;
          if (!blocks.episodes[key]) {
            uniqueEpisodeKeys.add(key);
          }
        }

        // Add manual episodes, skipping blocked episodes
        manualEpsForSeason.forEach((me) => {
          const epNum = Number(me.episode_number);
          if (!isNaN(epNum) && epNum > 0) {
            const key = `${cleanId}_s${seasonNum}_e${epNum}`;
            if (!blocks.episodes[key]) {
              uniqueEpisodeKeys.add(key);
            }
          }
        });

        // Determine final unique count
        let finalCount = uniqueEpisodeKeys.size;
        if (finalCount === 0 && manualSeason?.episode_count) {
          finalCount = manualSeason.episode_count;
        }

        return {
          season: seasonNum,
          episode_count: finalCount,
          title: manualSeason?.title || apiSeason?.title || `Season ${seasonNum}`,
          status: manualSeason?.status || apiSeason?.status || 'Completed',
          isManual: Boolean(manualSeason || manualEpsForSeason.length > 0),
        };
      });

    return {
      total_seasons: seasons.length > 0 ? seasons.length : 0,
      seasons: seasons.length > 0 ? seasons : [],
    };
  } catch (e) {
    console.error('fetchMergedSeasons error:', e);
    return { total_seasons: 0, seasons: [] };
  }
}

/**
 * Combines API episodes and manually added episodes into one episode list:
 * - Priority 1: Permanent deletion blocks (completely dropped).
 * - Priority 2: Manual episode overrides.
 * - Priority 3: API episodes.
 * - Uses unique identity: `${animeId}_s${season}_e${episode_number}`
 * - Numerically sorted ascending.
 */
export async function fetchMergedEpisodes(
  animeId: string,
  season: number
): Promise<{ episodes: EpisodeItem[]; missingNumbers: number[] }> {
  try {
    const cleanId = String(animeId).trim();
    const [apiEpisodes, manualEpisodes, blocks] = await Promise.all([
      fetchAnimeEpisodes(cleanId, season, 1, 150),
      fetchManualEpisodes(cleanId, season),
      fetchBlockedRecords(cleanId),
    ]);

    // Check if entire anime or season is permanently blocked
    if (blocks.anime[cleanId] || blocks.seasons[`${cleanId}_s${season}`]) {
      return { episodes: [], missingNumbers: [] };
    }

    const episodeMap = new Map<number, EpisodeItem>();

    // 1. Populate API episodes, skipping blocked episodes
    apiEpisodes.forEach((apiEp) => {
      const epKey = `${cleanId}_s${season}_e${apiEp.episode_number}`;
      if (!blocks.episodes[epKey]) {
        episodeMap.set(apiEp.episode_number, {
          ...apiEp,
          source: 'api',
          isManual: false,
        });
      }
    });

    // 2. Overlay manual episodes (takes precedence over API, skipping blocked episodes)
    manualEpisodes.forEach((manualEp) => {
      const epKey = `${cleanId}_s${season}_e${manualEp.episode_number}`;
      if (!blocks.episodes[epKey]) {
        const existingApi = episodeMap.get(manualEp.episode_number);
        episodeMap.set(manualEp.episode_number, {
          episode_number: manualEp.episode_number,
          season: manualEp.season,
          title: manualEp.title?.trim() || existingApi?.title || `Episode ${manualEp.episode_number}`,
          episodeId: `manual_${manualEp.season}-${manualEp.episode_number}`,
          video_url: manualEp.video_url,
          qualities: manualEp.qualities,
          default_quality: manualEp.default_quality,
          thumbnail: manualEp.thumbnail || existingApi?.thumbnail,
          description: manualEp.description || existingApi?.description,
          source: 'manual',
          isManual: true,
          manualId: manualEp.id,
          updatedAt: manualEp.updatedAt,
        });
      }
    });

    // 3. Sort numerically
    const sortedEpisodes = Array.from(episodeMap.values()).sort(
      (a, b) => a.episode_number - b.episode_number
    );

    // 4. Calculate missing episode numbers (gaps), ignoring blocked numbers
    const missingNumbers: number[] = [];
    if (sortedEpisodes.length > 0) {
      const maxEp = sortedEpisodes[sortedEpisodes.length - 1].episode_number;
      for (let i = 1; i <= maxEp; i++) {
        const key = `${cleanId}_s${season}_e${i}`;
        if (!episodeMap.has(i) && !blocks.episodes[key]) {
          missingNumbers.push(i);
        }
      }
    }

    return {
      episodes: sortedEpisodes,
      missingNumbers,
    };
  } catch (err) {
    console.error('fetchMergedEpisodes error:', err);
    return { episodes: [], missingNumbers: [] };
  }
}

// ==========================================
// BACKUP & RESTORE APIS
// ==========================================
export async function importBackupData(data: any) {
  const token = getAdminToken();
  const res = await apiFetch('/api/admin/backup/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-admin-token': token } : {}),
    },
    body: JSON.stringify(data),
  });
  return await res.json();
}

