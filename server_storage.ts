import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ManualEpisode,
  ManualSeason,
  BlockedRecord,
  BlockedStore,
  BlockType,
  UpdateRecord,
  AnimeRankingItem,
  UpdateType,
  UpdateBadge,
} from './src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, 'data');

const EPISODES_FILE = path.join(DATA_DIR, 'manual_episodes.json');
const SEASONS_FILE = path.join(DATA_DIR, 'manual_seasons.json');
const BLOCKED_FILE = path.join(DATA_DIR, 'blocked_records.json');
const UPDATES_FILE = path.join(DATA_DIR, 'latest_updates.json');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'catalog_snapshot.json');
const RANKINGS_FILE = path.join(DATA_DIR, 'anime_rankings.json');

// Ensure backend data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}


function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

/**
 * Generate stable, collision-free unique key for an episode:
 * `${animeId}_s${season}_e${episode_number}`
 */
export function getEpisodeKey(animeId: string, season: number, episodeNumber: number): string {
  return `${String(animeId).trim()}_s${Number(season)}_e${Number(episodeNumber)}`;
}

// In-memory cache for fast lookups backed by persistent disk files
let episodesCache: Record<string, ManualEpisode> = readJsonFile(EPISODES_FILE, {});
let seasonsCache: Record<string, ManualSeason> = readJsonFile(SEASONS_FILE, {});
let blockedCache: BlockedStore = readJsonFile<BlockedStore>(BLOCKED_FILE, {
  episodes: {},
  seasons: {},
  anime: {},
});

/**
 * Reload from disk files to guarantee persistent data is never lost across server restarts or requests
 */
function reloadFromDisk() {
  try {
    const diskEpisodes = readJsonFile<Record<string, ManualEpisode>>(EPISODES_FILE, {});
    episodesCache = { ...diskEpisodes, ...episodesCache };
    const diskSeasons = readJsonFile<Record<string, ManualSeason>>(SEASONS_FILE, {});
    seasonsCache = { ...diskSeasons, ...seasonsCache };
    const diskBlocked = readJsonFile<BlockedStore>(BLOCKED_FILE, {
      episodes: {},
      seasons: {},
      anime: {},
    });
    blockedCache = {
      episodes: { ...(diskBlocked.episodes || {}), ...(blockedCache.episodes || {}) },
      seasons: { ...(diskBlocked.seasons || {}), ...(blockedCache.seasons || {}) },
      anime: { ...(diskBlocked.anime || {}), ...(blockedCache.anime || {}) },
    };
  } catch (err) {
    console.error('reloadFromDisk error:', err);
  }
}

/**
 * Check if anime is permanently blocked
 */
export function isAnimeBlocked(animeId: string): boolean {
  reloadFromDisk();
  const cleanId = String(animeId).trim();
  return Boolean(blockedCache.anime && blockedCache.anime[cleanId]);
}

/**
 * Check if season is permanently blocked (directly or via anime block)
 */
export function isSeasonBlocked(animeId: string, season: number): boolean {
  reloadFromDisk();
  const cleanId = String(animeId).trim();
  if (isAnimeBlocked(cleanId)) return true;
  const seasonKey = `${cleanId}_s${Number(season)}`;
  return Boolean(blockedCache.seasons && blockedCache.seasons[seasonKey]);
}

/**
 * Check if episode is permanently blocked (directly or via season/anime block)
 */
export function isEpisodeBlocked(animeId: string, season: number, episodeNumber: number): boolean {
  reloadFromDisk();
  const cleanId = String(animeId).trim();
  if (isSeasonBlocked(cleanId, season)) return true;
  const epKey = getEpisodeKey(cleanId, season, episodeNumber);
  return Boolean(blockedCache.episodes && blockedCache.episodes[epKey]);
}

/**
 * Get all blocked records
 */
export function getBlockedStore(): BlockedStore {
  reloadFromDisk();
  return {
    episodes: { ...(blockedCache.episodes || {}) },
    seasons: { ...(blockedCache.seasons || {}) },
    anime: { ...(blockedCache.anime || {}) },
  };
}

/**
 * Permanently block an episode (removes any manual episode and blocks API sync)
 */
export function blockEpisode(
  animeId: string,
  season: number,
  episodeNumber: number,
  animeTitle?: string,
  reason?: string
): { success: boolean; block: BlockedRecord; message: string } {
  reloadFromDisk();
  const cleanId = String(animeId).trim();
  const sNum = Number(season);
  const epNum = Number(episodeNumber);
  const key = getEpisodeKey(cleanId, sNum, epNum);

  const blockRecord: BlockedRecord = {
    id: key,
    type: 'episode',
    animeId: cleanId,
    animeTitle: animeTitle?.trim() || `Anime ${cleanId}`,
    season: sNum,
    episode_number: epNum,
    reason: reason?.trim() || 'Permanently deleted by admin',
    deletedAt: new Date().toISOString(),
  };

  blockedCache.episodes[key] = blockRecord;
  writeJsonFile(BLOCKED_FILE, blockedCache);

  // If a manual episode exists for this key, remove it as well
  if (episodesCache[key]) {
    delete episodesCache[key];
    writeJsonFile(EPISODES_FILE, episodesCache);
  }

  return {
    success: true,
    block: blockRecord,
    message: `Episode ${epNum} (Season ${sNum}) permanently deleted and blocked.`,
  };
}

/**
 * Permanently block a season (removes manual season & episodes and blocks API sync)
 */
export function blockSeason(
  animeId: string,
  season: number,
  animeTitle?: string,
  reason?: string
): { success: boolean; block: BlockedRecord; message: string } {
  reloadFromDisk();
  const cleanId = String(animeId).trim();
  const sNum = Number(season);
  const seasonKey = `${cleanId}_s${sNum}`;

  const blockRecord: BlockedRecord = {
    id: seasonKey,
    type: 'season',
    animeId: cleanId,
    animeTitle: animeTitle?.trim() || `Anime ${cleanId}`,
    season: sNum,
    reason: reason?.trim() || 'Permanently deleted by admin',
    deletedAt: new Date().toISOString(),
  };

  blockedCache.seasons[seasonKey] = blockRecord;
  writeJsonFile(BLOCKED_FILE, blockedCache);

  // Remove manual season if exists
  if (seasonsCache[seasonKey]) {
    delete seasonsCache[seasonKey];
    writeJsonFile(SEASONS_FILE, seasonsCache);
  }

  // Remove all manual episodes in this season
  let removedEps = 0;
  for (const [k, ep] of Object.entries(episodesCache)) {
    if (String(ep.animeId).trim() === cleanId && Number(ep.season) === sNum) {
      delete episodesCache[k];
      removedEps++;
    }
  }
  if (removedEps > 0) {
    writeJsonFile(EPISODES_FILE, episodesCache);
  }

  return {
    success: true,
    block: blockRecord,
    message: `Season ${sNum} permanently deleted and blocked.`,
  };
}

/**
 * Permanently block an anime (removes all manual data and blocks from catalog)
 */
export function blockAnime(
  animeId: string,
  animeTitle?: string,
  reason?: string
): { success: boolean; block: BlockedRecord; message: string } {
  reloadFromDisk();
  const cleanId = String(animeId).trim();

  const blockRecord: BlockedRecord = {
    id: cleanId,
    type: 'anime',
    animeId: cleanId,
    animeTitle: animeTitle?.trim() || `Anime ${cleanId}`,
    reason: reason?.trim() || 'Permanently deleted by admin',
    deletedAt: new Date().toISOString(),
  };

  blockedCache.anime[cleanId] = blockRecord;
  writeJsonFile(BLOCKED_FILE, blockedCache);

  // Remove all manual seasons for this anime
  for (const [k, s] of Object.entries(seasonsCache)) {
    if (String(s.animeId).trim() === cleanId) {
      delete seasonsCache[k];
    }
  }
  writeJsonFile(SEASONS_FILE, seasonsCache);

  // Remove all manual episodes for this anime
  for (const [k, ep] of Object.entries(episodesCache)) {
    if (String(ep.animeId).trim() === cleanId) {
      delete episodesCache[k];
    }
  }
  writeJsonFile(EPISODES_FILE, episodesCache);

  return {
    success: true,
    block: blockRecord,
    message: `Anime ${cleanId} permanently deleted and blocked.`,
  };
}

/**
 * Restore/unblock an episode, season, or anime
 */
export function unblockRecord(
  type: BlockType,
  id: string
): { success: boolean; message: string } {
  reloadFromDisk();
  const cleanId = String(id).trim();

  if (type === 'episode') {
    if (blockedCache.episodes && blockedCache.episodes[cleanId]) {
      delete blockedCache.episodes[cleanId];
      writeJsonFile(BLOCKED_FILE, blockedCache);
      return { success: true, message: 'Episode block removed. Episode restored to sync.' };
    }
  } else if (type === 'season') {
    if (blockedCache.seasons && blockedCache.seasons[cleanId]) {
      delete blockedCache.seasons[cleanId];
      writeJsonFile(BLOCKED_FILE, blockedCache);
      return { success: true, message: 'Season block removed. Season restored to sync.' };
    }
  } else if (type === 'anime') {
    if (blockedCache.anime && blockedCache.anime[cleanId]) {
      delete blockedCache.anime[cleanId];
      writeJsonFile(BLOCKED_FILE, blockedCache);
      return { success: true, message: 'Anime block removed. Anime restored to catalog.' };
    }
  }

  return { success: false, message: 'Block record not found.' };
}

/**
 * Get all manual episodes, optionally filtered by animeId and season (excluding blocked ones)
 */
export function getManualEpisodes(animeId?: string, season?: number): ManualEpisode[] {
  reloadFromDisk();
  let list = Object.values(episodesCache);
  if (animeId) {
    const cleanId = String(animeId).trim();
    list = list.filter((ep) => String(ep.animeId).trim() === cleanId);
  }
  if (season !== undefined && !isNaN(season)) {
    const sNum = Number(season);
    list = list.filter((ep) => Number(ep.season) === sNum);
  }
  // Filter out any episodes that have been permanently blocked
  list = list.filter((ep) => !isEpisodeBlocked(ep.animeId, ep.season, ep.episode_number));
  return list.sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    return a.episode_number - b.episode_number;
  });
}

/**
 * Find single manual episode by key (returns null if blocked)
 */
export function findManualEpisode(animeId: string, season: number, episodeNumber: number): ManualEpisode | null {
  reloadFromDisk();
  if (isEpisodeBlocked(animeId, season, episodeNumber)) return null;
  const key = getEpisodeKey(animeId, season, episodeNumber);
  return episodesCache[key] || null;
}

/**
 * Save manual episode with strict duplicate prevention and override confirmation.
 * Fully supports multiple quality URLs (240p, 360p, 480p, 720p, 1080p).
 */
export function saveManualEpisode(
  payload: Omit<ManualEpisode, 'id' | 'createdAt' | 'updatedAt'>,
  override = false
): { success: boolean; episode?: ManualEpisode; exists?: boolean; message?: string } {
  reloadFromDisk();
  const animeId = String(payload.animeId).trim();
  const season = Number(payload.season);
  const episodeNumber = Number(payload.episode_number);

  // Parse and sanitize multiple qualities
  const qualities: Record<string, string> = {};
  if (payload.qualities && typeof payload.qualities === 'object') {
    for (const [q, u] of Object.entries(payload.qualities)) {
      if (typeof u === 'string' && u.trim()) {
        qualities[q.trim()] = u.trim();
      }
    }
  }

  // Determine default quality and primary video URL
  let defaultQuality = payload.default_quality?.trim() || '';
  let primaryVideoUrl = payload.video_url?.trim() || '';

  const qualityKeys = Object.keys(qualities);
  if (qualityKeys.length > 0) {
    const order = ['1080p', '720p', '480p', '360p', '240p'];
    if (!defaultQuality || !qualities[defaultQuality]) {
      defaultQuality = order.find((k) => qualities[k]) || qualityKeys[0];
    }
    if (!primaryVideoUrl) {
      primaryVideoUrl = qualities[defaultQuality] || Object.values(qualities)[0];
    }
    if (defaultQuality && primaryVideoUrl && !qualities[defaultQuality]) {
      qualities[defaultQuality] = primaryVideoUrl;
    }
  } else if (primaryVideoUrl) {
    defaultQuality = defaultQuality || '720p';
    qualities[defaultQuality] = primaryVideoUrl;
  }

  if (!animeId || isNaN(season) || isNaN(episodeNumber) || !primaryVideoUrl) {
    return {
      success: false,
      message: 'Missing required fields: animeId, season, episode_number, and at least one video URL are mandatory.',
    };
  }

  const key = getEpisodeKey(animeId, season, episodeNumber);
  const existing = episodesCache[key];

  if (existing && !override) {
    return {
      success: false,
      exists: true,
      episode: existing,
      message: `Episode ${episodeNumber} for Season ${season} already exists. Please confirm override to update it.`,
    };
  }

  const now = new Date().toISOString();
  // If editing an existing episode and new qualities provided, merge gracefully
  const mergedQualities = existing?.qualities
    ? { ...existing.qualities, ...qualities }
    : qualities;

  const episodeRecord: ManualEpisode = {
    id: key,
    animeId,
    animeTitle: payload.animeTitle?.trim() || existing?.animeTitle || `Anime ${animeId}`,
    season,
    episode_number: episodeNumber,
    title: payload.title?.trim() || existing?.title || `Episode ${episodeNumber}`,
    video_url: primaryVideoUrl,
    qualities: mergedQualities,
    default_quality: defaultQuality || existing?.default_quality || Object.keys(mergedQualities)[0],
    thumbnail: payload.thumbnail?.trim() || existing?.thumbnail || '',
    description: payload.description?.trim() || existing?.description || '',
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  episodesCache[key] = episodeRecord;
  writeJsonFile(EPISODES_FILE, episodesCache);

  // Trigger automatic update notification ONLY for genuinely new episode additions (not edits)
  if (!existing) {
    addUpdateRecord({
      animeId,
      animeTitle: episodeRecord.animeTitle,
      season,
      episode: episodeNumber,
      updateType: 'NEW_EPISODE',
      badge: 'NEW EPISODE',
      poster: episodeRecord.thumbnail || '',
      description: `Episode ${episodeNumber} (${episodeRecord.title}) released for Season ${season}.`,
    });
  }

  // Automatically ensure season exists in manual seasons and update count
  const manualEpsInSeason = Object.values(episodesCache).filter(
    (ep) => String(ep.animeId).trim() === animeId && Number(ep.season) === season
  );
  ensureSeasonExists(animeId, season, manualEpsInSeason.length);

  return {
    success: true,
    episode: episodeRecord,
    message: existing ? 'Episode updated successfully.' : 'Episode created successfully.',
  };
}

/**
 * Delete an individual quality URL from a manual episode without deleting the entire episode
 */
export function deleteEpisodeQuality(
  animeId: string,
  season: number,
  episodeNumber: number,
  quality: string
): { success: boolean; episode?: ManualEpisode; message?: string } {
  reloadFromDisk();
  const key = getEpisodeKey(animeId, season, episodeNumber);
  const ep = episodesCache[key];
  if (!ep) {
    return { success: false, message: 'Episode not found.' };
  }

  if (ep.qualities && ep.qualities[quality]) {
    delete ep.qualities[quality];
  }

  const remainingQualities = Object.keys(ep.qualities || {});
  if (remainingQualities.length > 0) {
    const order = ['1080p', '720p', '480p', '360p', '240p'];
    if (ep.default_quality === quality || !ep.qualities![ep.default_quality!]) {
      ep.default_quality = order.find((k) => ep.qualities![k]) || remainingQualities[0];
    }
    ep.video_url = ep.qualities![ep.default_quality!] || Object.values(ep.qualities!)[0];
  } else {
    if (ep.default_quality === quality) {
      ep.default_quality = undefined;
    }
  }

  ep.updatedAt = new Date().toISOString();
  episodesCache[key] = ep;
  writeJsonFile(EPISODES_FILE, episodesCache);

  return {
    success: true,
    episode: ep,
    message: `Quality ${quality} deleted successfully.`,
  };
}

/**
 * Delete manual episode by ID or composite key
 */
export function deleteManualEpisode(idOrKey: string): { success: boolean; message: string } {
  let key = idOrKey;
  if (!episodesCache[key]) {
    // Check if ID matches an episode
    const found = Object.values(episodesCache).find((e) => e.id === idOrKey);
    if (found) {
      key = found.id;
    }
  }

  if (!episodesCache[key]) {
    return { success: false, message: 'Episode not found.' };
  }

  const deletedEp = episodesCache[key];
  delete episodesCache[key];
  writeJsonFile(EPISODES_FILE, episodesCache);

  // Recalculate season episode count if manual season exists
  if (deletedEp) {
    const seasonKey = `${deletedEp.animeId}_s${deletedEp.season}`;
    if (seasonsCache[seasonKey]) {
      const remainingCount = Object.values(episodesCache).filter(
        (ep) => String(ep.animeId).trim() === String(deletedEp.animeId).trim() && Number(ep.season) === Number(deletedEp.season)
      ).length;
      seasonsCache[seasonKey].episode_count = remainingCount;
      writeJsonFile(SEASONS_FILE, seasonsCache);
    }
  }

  return { success: true, message: 'Manual episode deleted successfully.' };
}

/**
 * Get all manual seasons, optionally filtered by animeId (excluding blocked ones)
 */
export function getManualSeasons(animeId?: string): ManualSeason[] {
  reloadFromDisk();
  let list = Object.values(seasonsCache);
  if (animeId) {
    const cleanId = String(animeId).trim();
    list = list.filter((s) => String(s.animeId).trim() === cleanId);
  }
  list = list.filter((s) => !isSeasonBlocked(s.animeId, s.season));
  return list.sort((a, b) => a.season - b.season);
}

/**
 * Save manual season
 */
export function saveManualSeason(payload: ManualSeason): { success: boolean; season?: ManualSeason; message?: string } {
  const animeId = String(payload.animeId).trim();
  const season = Number(payload.season);

  if (!animeId || isNaN(season)) {
    return { success: false, message: 'Invalid animeId or season number.' };
  }

  const key = `${animeId}_s${season}`;
  const isNewSeason = !seasonsCache[key];
  const seasonRecord: ManualSeason = {
    animeId,
    season,
    episode_count: payload.episode_count || 12,
    title: payload.title || `Season ${season}`,
    status: payload.status || 'Ongoing',
  };

  seasonsCache[key] = seasonRecord;
  writeJsonFile(SEASONS_FILE, seasonsCache);

  if (isNewSeason) {
    addUpdateRecord({
      animeId,
      animeTitle: payload.title || `Anime ${animeId}`,
      season,
      episode: 1,
      updateType: 'NEW_SEASON',
      badge: 'NEW SEASON',
      poster: '',
      description: `Season ${season} added to catalog.`,
    });
  }

  return { success: true, season: seasonRecord, message: 'Season saved successfully.' };
}

export function deleteManualSeason(animeId: string, season: number): { success: boolean; message: string } {
  const key = `${String(animeId).trim()}_s${Number(season)}`;
  if (!seasonsCache[key]) {
    return { success: false, message: 'Season not found.' };
  }
  delete seasonsCache[key];
  writeJsonFile(SEASONS_FILE, seasonsCache);
  return { success: true, message: 'Season deleted successfully.' };
}

function ensureSeasonExists(animeId: string, season: number, epCount = 1) {
  const key = `${animeId}_s${season}`;
  if (!seasonsCache[key]) {
    seasonsCache[key] = {
      animeId,
      season,
      episode_count: Math.max(1, epCount),
      title: `Season ${season}`,
      status: 'Ongoing',
    };
    writeJsonFile(SEASONS_FILE, seasonsCache);
  } else if (epCount > (seasonsCache[key].episode_count || 0)) {
    seasonsCache[key].episode_count = epCount;
    writeJsonFile(SEASONS_FILE, seasonsCache);
  }
}

/**
 * Import & Export for Backup and Migration
 */
export function exportAllData() {
  reloadFromDisk();
  return {
    version: '1.1.0',
    exportedAt: new Date().toISOString(),
    totalEpisodes: Object.keys(episodesCache).length,
    totalSeasons: Object.keys(seasonsCache).length,
    episodes: Object.values(episodesCache),
    seasons: Object.values(seasonsCache),
    blocks: getBlockedStore(),
  };
}

export function importAllData(data: any): { success: boolean; importedEpisodes: number; importedSeasons: number; message: string } {
  if (!data || typeof data !== 'object') {
    return { success: false, importedEpisodes: 0, importedSeasons: 0, message: 'Invalid data format.' };
  }

  let importedEpisodes = 0;
  let importedSeasons = 0;

  if (Array.isArray(data.episodes)) {
    data.episodes.forEach((ep: any) => {
      if (ep.animeId && ep.season && ep.episode_number && ep.video_url) {
        const key = getEpisodeKey(ep.animeId, ep.season, ep.episode_number);
        episodesCache[key] = {
          id: key,
          animeId: String(ep.animeId),
          animeTitle: ep.animeTitle || `Anime ${ep.animeId}`,
          season: Number(ep.season),
          episode_number: Number(ep.episode_number),
          title: ep.title || `Episode ${ep.episode_number}`,
          video_url: String(ep.video_url).trim(),
          thumbnail: ep.thumbnail || '',
          description: ep.description || '',
          createdAt: ep.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        importedEpisodes++;
      }
    });
    writeJsonFile(EPISODES_FILE, episodesCache);
  }

  if (Array.isArray(data.seasons)) {
    data.seasons.forEach((s: any) => {
      if (s.animeId && s.season) {
        const key = `${s.animeId}_s${s.season}`;
        seasonsCache[key] = {
          animeId: String(s.animeId),
          season: Number(s.season),
          episode_count: Number(s.episode_count) || 12,
          title: s.title || `Season ${s.season}`,
          status: s.status || 'Ongoing',
        };
        importedSeasons++;
      }
    });
    writeJsonFile(SEASONS_FILE, seasonsCache);
  }

  if (data.blocks && typeof data.blocks === 'object') {
    if (data.blocks.episodes && typeof data.blocks.episodes === 'object') {
      blockedCache.episodes = { ...blockedCache.episodes, ...data.blocks.episodes };
    }
    if (data.blocks.seasons && typeof data.blocks.seasons === 'object') {
      blockedCache.seasons = { ...blockedCache.seasons, ...data.blocks.seasons };
    }
    if (data.blocks.anime && typeof data.blocks.anime === 'object') {
      blockedCache.anime = { ...blockedCache.anime, ...data.blocks.anime };
    }
    writeJsonFile(BLOCKED_FILE, blockedCache);
  }

  return {
    success: true,
    importedEpisodes,
    importedSeasons,
    message: `Imported ${importedEpisodes} episodes and ${importedSeasons} seasons successfully.`,
  };
}

// ==========================================
// FEATURE 1: LATEST ANIME UPDATES ENGINE
// ==========================================
interface CatalogSnapshotItem {
  animeId: string;
  title: string;
  poster: string;
  lastSeen: string;
}

let updatesCache: UpdateRecord[] = readJsonFile<UpdateRecord[]>(UPDATES_FILE, []);
let snapshotCache: Record<string, CatalogSnapshotItem> = readJsonFile<Record<string, CatalogSnapshotItem>>(SNAPSHOT_FILE, {});

/**
 * Get all latest update records, deduplicated per anime and sorted newest first.
 * Each anime appears AT MOST ONCE (at its most recent update position).
 */
export function getLatestUpdates(limit = 40): UpdateRecord[] {
  reloadFromDisk();

  // Reload updates file from disk to ensure sync
  const diskUpdates = readJsonFile<UpdateRecord[]>(UPDATES_FILE, []);
  updatesCache = diskUpdates;

  // Sort all records descending by timestamp
  const sorted = [...updatesCache].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Per-anime deduplication: keep only the latest update entry per animeId
  const seenAnime = new Set<string>();
  const deduplicated: UpdateRecord[] = [];

  for (const record of sorted) {
    const cleanId = String(record.animeId).trim();
    if (!seenAnime.has(cleanId)) {
      seenAnime.add(cleanId);
      deduplicated.push(record);
    }
  }

  return limit > 0 ? deduplicated.slice(0, limit) : deduplicated;
}

/**
 * Record a new update event:
 * Replaces any previous update entry for the same animeId and moves it to position #1!
 */
export function addUpdateRecord(update: Omit<UpdateRecord, 'id' | 'timestamp'>): UpdateRecord {
  reloadFromDisk();
  const cleanId = String(update.animeId).trim();
  const now = new Date().toISOString();

  // Remove any previous update entry for the same anime so position is replaced cleanly
  updatesCache = updatesCache.filter((u) => String(u.animeId).trim() !== cleanId);

  const record: UpdateRecord = {
    id: `upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    animeId: cleanId,
    animeTitle: update.animeTitle,
    season: update.season || 1,
    episode: update.episode || 1,
    updateType: update.updateType,
    badge: update.badge,
    poster: update.poster || '',
    description: update.description || '',
    timestamp: now,
  };

  updatesCache.unshift(record);
  if (updatesCache.length > 150) {
    updatesCache = updatesCache.slice(0, 150);
  }
  writeJsonFile(UPDATES_FILE, updatesCache);
  return record;
}

/**
 * Automatically compare live catalog items with stored snapshot
 * to detect newly added anime series without generating fake updates.
 */
export function syncCatalogUpdates(liveCatalog: any[]): UpdateRecord[] {
  reloadFromDisk();

  if (!Array.isArray(liveCatalog) || liveCatalog.length === 0) {
    return getLatestUpdates();
  }

  const isInitialRun = Object.keys(snapshotCache).length === 0;
  const now = new Date().toISOString();

  liveCatalog.forEach((item) => {
    const cleanId = String(item.id || item.tmdbId).trim();
    if (!cleanId) return;

    if (!snapshotCache[cleanId]) {
      snapshotCache[cleanId] = {
        animeId: cleanId,
        title: item.title || `Anime ${cleanId}`,
        poster: item.poster || '',
        lastSeen: now,
      };

      // Generate update record ONLY if this anime is added AFTER initial baseline setup!
      if (!isInitialRun) {
        addUpdateRecord({
          animeId: cleanId,
          animeTitle: item.title || `Anime ${cleanId}`,
          season: 1,
          episode: 1,
          updateType: 'NEW_ANIME',
          badge: 'NEW',
          poster: item.poster || '',
          description: item.synopsis || `New anime series added to catalog: ${item.title}`,
        });
      }
    } else {
      snapshotCache[cleanId].lastSeen = now;
      if (item.title) snapshotCache[cleanId].title = item.title;
      if (item.poster) snapshotCache[cleanId].poster = item.poster;
    }
  });

  writeJsonFile(SNAPSHOT_FILE, snapshotCache);
  return getLatestUpdates();
}

// ==========================================
// FEATURE 2: AUTOMATIC ANIME RANKING SYSTEM & TRENDING
// ==========================================
interface StoredAnimeRanking {
  animeId: string;
  title: string;
  poster: string;
  backdrop?: string;
  genres: string[];
  rating?: string;
  releaseDate?: string;
  totalViews: number;
  viewLogs: number[];
  lastViewedAt: string;
}

let rankingsCache: Record<string, StoredAnimeRanking> = readJsonFile<Record<string, StoredAnimeRanking>>(RANKINGS_FILE, {});

// In-memory anti-spam debounce cache: "client_anime_ep" => timestamp
const viewCooldownMap = new Map<string, number>();
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes debounce per client per episode

/**
 * Record actual episode view with anti-fraud debounce protection
 */
export function recordEpisodeView(payload: {
  animeId: string;
  season?: number;
  episode?: number;
  animeTitle?: string;
  poster?: string;
  backdrop?: string;
  genres?: string[];
  clientIp?: string;
}): { success: boolean; counted: boolean; totalViews: number; rank: number; message: string } {
  reloadFromDisk();

  const cleanId = String(payload.animeId).trim();
  const seasonNum = payload.season || 1;
  const epNum = payload.episode || 1;
  const clientKey = `${payload.clientIp || 'client'}_${cleanId}_s${seasonNum}_e${epNum}`;
  const nowMs = Date.now();
  const lastViewTime = viewCooldownMap.get(clientKey) || 0;

  let existing = rankingsCache[cleanId];
  if (!existing) {
    existing = {
      animeId: cleanId,
      title: payload.animeTitle || `Anime ${cleanId}`,
      poster: payload.poster || '',
      backdrop: payload.backdrop || '',
      genres: payload.genres || ['Anime'],
      rating: '8.5',
      releaseDate: '2026',
      totalViews: 0,
      viewLogs: [],
      lastViewedAt: new Date().toISOString(),
    };
    rankingsCache[cleanId] = existing;
  }

  // Anti-Spam Check: Ignore refreshes or rapid repeated clicks within 3 minutes
  if (nowMs - lastViewTime < COOLDOWN_MS) {
    const currentRank = getAnimeRank(cleanId);
    return {
      success: true,
      counted: false,
      totalViews: existing.totalViews,
      rank: currentRank,
      message: 'View cooldown active. Prevented duplicate view count inflation.',
    };
  }

  // Record valid view
  viewCooldownMap.set(clientKey, nowMs);
  existing.totalViews += 1;
  existing.viewLogs.push(nowMs);

  // Clean view logs older than 7 days
  const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
  existing.viewLogs = existing.viewLogs.filter((t) => t > sevenDaysAgo);
  existing.lastViewedAt = new Date().toISOString();

  if (payload.animeTitle && payload.animeTitle !== `Anime ${cleanId}`) existing.title = payload.animeTitle;
  if (payload.poster) existing.poster = payload.poster;
  if (payload.genres && payload.genres.length > 0) existing.genres = payload.genres;

  writeJsonFile(RANKINGS_FILE, rankingsCache);

  const rank = getAnimeRank(cleanId);
  return {
    success: true,
    counted: true,
    totalViews: existing.totalViews,
    rank,
    message: 'Episode view recorded successfully.',
  };
}

/**
 * Calculate rank position of a specific anime based on total views
 */
function getAnimeRank(animeId: string): number {
  const cleanId = String(animeId).trim();
  const sorted = Object.values(rankingsCache).sort((a, b) => b.totalViews - a.totalViews);
  const idx = sorted.findIndex((a) => String(a.animeId).trim() === cleanId);
  return idx !== -1 ? idx + 1 : sorted.length + 1;
}

/**
 * Get formatted anime rankings sorted by total views or recent trending activity
 */
export function getAnimeRankings(limit?: number | string, type: 'total' | 'trending' = 'total'): AnimeRankingItem[] {
  reloadFromDisk();

  const nowMs = Date.now();
  const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;

  const items = Object.values(rankingsCache).map((item) => {
    const recentViews = (item.viewLogs || []).filter((t) => t > sevenDaysAgo).length;
    return {
      animeId: item.animeId,
      title: item.title,
      poster: item.poster,
      backdrop: item.backdrop,
      genres: item.genres || ['Anime'],
      rating: item.rating || '8.5',
      releaseDate: item.releaseDate || '2026',
      totalViews: item.totalViews || 0,
      recentViews,
      lastViewedAt: item.lastViewedAt,
    };
  });

  // Sort based on requested type
  if (type === 'trending') {
    items.sort((a, b) => {
      if (b.recentViews !== a.recentViews) return b.recentViews - a.recentViews;
      return b.totalViews - a.totalViews;
    });
  } else {
    items.sort((a, b) => b.totalViews - a.totalViews);
  }

  // Attach dynamic 1-indexed rank number
  const rankedList: AnimeRankingItem[] = items.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));

  if (limit === 'all' || !limit) {
    return rankedList;
  }
  const parsedLimit = parseInt(String(limit), 10);
  return isNaN(parsedLimit) || parsedLimit <= 0 ? rankedList : rankedList.slice(0, parsedLimit);
}

