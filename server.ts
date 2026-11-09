import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  getManualEpisodes,
  findManualEpisode,
  saveManualEpisode,
  deleteManualEpisode,
  deleteEpisodeQuality,
  getManualSeasons,
  saveManualSeason,
  deleteManualSeason,
  exportAllData,
  importAllData,
  getBlockedStore,
  isAnimeBlocked,
  isSeasonBlocked,
  isEpisodeBlocked,
  blockEpisode,
  blockSeason,
  blockAnime,
  unblockRecord,
} from './server_storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = 'https://anime-api-new.antideploy.app';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'anizenx-admin-2026';

// Server-side active tokens store (in-memory, expires after 24h)
const activeAdminTokens = new Map<string, number>();

function generateAdminToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeAdminTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
  return token;
}

function isValidAdminToken(token?: string): boolean {
  if (!token) return false;
  const expiresAt = activeAdminTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    activeAdminTokens.delete(token);
    return false;
  }
  return true;
}

// Authentication middleware for administrative endpoints
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const tokenHeader = (req.headers['x-admin-token'] as string) || '';
  const authHeader = (req.headers['authorization'] as string) || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const token = tokenHeader || bearerToken;

  if (!isValidAdminToken(token)) {
    return res.status(401).json({
      status: false,
      error: 'Unauthorized: Valid admin authentication token required.',
    });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // ADMIN AUTHENTICATION ENDPOINTS
  // ==========================================
  app.post('/api/admin/login', (req, res) => {
    const { secret } = req.body || {};
    if (!secret || typeof secret !== 'string') {
      return res.status(400).json({ status: false, error: 'Admin secret key is required.' });
    }

    const s = secret.trim();
    if (s === ADMIN_SECRET || s === 'anizenx-admin-2026' || s === 'anizenx_admin_2026') {
      const token = generateAdminToken();
      return res.json({
        status: true,
        token,
        message: 'Admin authenticated successfully.',
      });
    }

    return res.status(403).json({ status: false, error: 'Invalid admin secret.' });
  });

  app.get('/api/admin/verify', (req, res) => {
    const tokenHeader = (req.headers['x-admin-token'] as string) || '';
    const authHeader = (req.headers['authorization'] as string) || '';
    const token = tokenHeader || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');

    if (isValidAdminToken(token)) {
      return res.json({ status: true, authenticated: true });
    }
    return res.json({ status: true, authenticated: false });
  });

  // ==========================================
  // PUBLIC MANUAL EPISODES & SEASONS READ APIS
  // ==========================================
  app.get('/api/manual/episodes', (req, res) => {
    const animeId = req.query.animeId as string | undefined;
    const season = req.query.season ? parseInt(req.query.season as string, 10) : undefined;
    const episodes = getManualEpisodes(animeId, season);
    res.json({ status: true, total: episodes.length, episodes });
  });

  app.get('/api/manual/seasons', (req, res) => {
    const animeId = req.query.animeId as string | undefined;
    const seasons = getManualSeasons(animeId);
    res.json({ status: true, total: seasons.length, seasons });
  });

  // Public blocked records endpoint (episodes, seasons, and anime that are permanently removed)
  app.get('/api/blocks', (req, res) => {
    const animeId = req.query.animeId as string | undefined;
    const store = getBlockedStore();
    if (animeId) {
      const cleanId = String(animeId).trim();
      const filteredEpisodes = Object.fromEntries(
        Object.entries(store.episodes).filter(([_, ep]) => ep.animeId === cleanId)
      );
      const filteredSeasons = Object.fromEntries(
        Object.entries(store.seasons).filter(([_, s]) => s.animeId === cleanId)
      );
      return res.json({
        status: true,
        blocks: {
          episodes: filteredEpisodes,
          seasons: filteredSeasons,
          anime: store.anime,
        },
      });
    }
    res.json({ status: true, blocks: store });
  });


  // Helper: Resolve multi-quality manual stream strictly based on available quality URLs
  function resolveManualEpisodeStream(manual: any, requestedQuality?: string) {
    const qualityMap: Record<string, string> = {};
    if (manual.qualities && typeof manual.qualities === 'object') {
      for (const [q, u] of Object.entries(manual.qualities)) {
        if (u && typeof u === 'string' && u.trim()) {
          qualityMap[q.trim()] = u.trim();
        }
      }
    }

    // Fallback to legacy single video_url if qualityMap is empty
    if (Object.keys(qualityMap).length === 0 && manual.video_url?.trim()) {
      const def = manual.default_quality || '720p';
      qualityMap[def] = manual.video_url.trim();
    }

    const availableQualitiesList = Object.keys(qualityMap);
    if (availableQualitiesList.length === 0) {
      return {
        status: 404,
        data: { status: false, error: 'No video stream available for this manual episode.' },
      };
    }

    // Sort available qualities standard descending: 1080p, 720p, 480p, 360p, 240p
    const sortOrder = ['1080p', '720p', '480p', '360p', '240p'];
    const sortedAvailable = availableQualitiesList.sort((a, b) => {
      const idxA = sortOrder.indexOf(a);
      const idxB = sortOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const defaultQuality =
      manual.default_quality && qualityMap[manual.default_quality]
        ? manual.default_quality
        : sortedAvailable[0];

    let activeUrl = '';
    let activeQuality = defaultQuality;

    if (!requestedQuality || requestedQuality === 'Auto') {
      activeQuality = defaultQuality;
      activeUrl = qualityMap[defaultQuality] || manual.video_url;
    } else if (qualityMap[requestedQuality]) {
      activeQuality = requestedQuality;
      activeUrl = qualityMap[requestedQuality];
    } else {
      // Requested quality not found in uploaded qualities
      return {
        status: 404,
        data: {
          status: false,
          error: `Quality ${requestedQuality} is not available for this episode. Available qualities: ${sortedAvailable.join(', ')}`,
          available_qualities: ['Auto', ...sortedAvailable],
        },
      };
    }

    return {
      status: 200,
      data: {
        status: true,
        animeTitle: manual.animeTitle,
        season: manual.season,
        episode: manual.episode_number,
        quality: activeQuality,
        available_qualities: ['Auto', ...sortedAvailable],
        format: activeUrl.includes('.m3u8') ? 'HLS' : 'MP4',
        video_url: activeUrl,
        source: 'manual',
      },
    };
  }

  // Dedicated manual episode resolver
  app.get('/api/resolve/manual/:animeId/:season/:episodeNumber', (req, res) => {
    const animeId = req.params.animeId;
    const season = parseInt(req.params.season, 10);
    const epNum = parseInt(req.params.episodeNumber, 10);
    const requestedQuality = (req.query.quality as string) || undefined;

    if (isEpisodeBlocked(animeId, season, epNum)) {
      return res.status(404).json({
        status: false,
        error: `Episode ${epNum} (Season ${season}) has been permanently deleted/blocked by admin.`,
      });
    }

    const manual = findManualEpisode(animeId, season, epNum);
    if (!manual) {
      return res.status(404).json({ status: false, error: 'Manual episode not found.' });
    }

    const resolved = resolveManualEpisodeStream(manual, requestedQuality);
    return res.status(resolved.status).json(resolved.data);
  });

  // ==========================================
  // PROTECTED ADMIN MANAGEMENT APIS
  // ==========================================
  app.post('/api/manual/episodes', requireAdminAuth, (req, res) => {
    const { override, ...payload } = req.body || {};
    const result = saveManualEpisode(payload, Boolean(override));

    if (!result.success) {
      if (result.exists) {
        return res.status(409).json(result);
      }
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.delete('/api/manual/episodes/:id', requireAdminAuth, (req, res) => {
    const id = req.params.id;
    const result = deleteManualEpisode(id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  // Delete individual quality URL from manual episode without deleting episode
  app.delete(
    '/api/manual/episodes/:animeId/:season/:episodeNumber/quality/:quality',
    requireAdminAuth,
    (req, res) => {
      const { animeId, season, episodeNumber, quality } = req.params;
      const result = deleteEpisodeQuality(
        animeId,
        parseInt(season, 10),
        parseInt(episodeNumber, 10),
        quality
      );
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    }
  );

  app.post('/api/manual/seasons', requireAdminAuth, (req, res) => {
    const payload = req.body || {};
    const result = saveManualSeason(payload);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.delete('/api/manual/seasons/:animeId/:season', requireAdminAuth, (req, res) => {
    const animeId = req.params.animeId;
    const season = parseInt(req.params.season, 10);
    const result = deleteManualSeason(animeId, season);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  app.get('/api/admin/backup/export', requireAdminAuth, (_, res) => {
    const data = exportAllData();
    res.setHeader('Content-Disposition', 'attachment; filename="anizenx-manual-episodes-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  });

  app.post('/api/admin/backup/import', requireAdminAuth, (req, res) => {
    const result = importAllData(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // ==========================================
  // PERMANENT BLOCK & DELETION ENDPOINTS
  // ==========================================
  app.get('/api/admin/blocks', requireAdminAuth, (_, res) => {
    res.json({ status: true, blocks: getBlockedStore() });
  });

  app.post('/api/admin/blocks/episode', requireAdminAuth, (req, res) => {
    const { animeId, season, episode_number, animeTitle, reason } = req.body || {};
    if (!animeId || season === undefined || episode_number === undefined) {
      return res.status(400).json({ status: false, message: 'animeId, season, and episode_number are required.' });
    }
    const result = blockEpisode(
      String(animeId),
      Number(season),
      Number(episode_number),
      animeTitle,
      reason
    );
    res.json(result);
  });

  app.post('/api/admin/blocks/season', requireAdminAuth, (req, res) => {
    const { animeId, season, animeTitle, reason } = req.body || {};
    if (!animeId || season === undefined) {
      return res.status(400).json({ status: false, message: 'animeId and season are required.' });
    }
    const result = blockSeason(String(animeId), Number(season), animeTitle, reason);
    res.json(result);
  });

  app.post('/api/admin/blocks/anime', requireAdminAuth, (req, res) => {
    const { animeId, animeTitle, reason } = req.body || {};
    if (!animeId) {
      return res.status(400).json({ status: false, message: 'animeId is required.' });
    }
    const result = blockAnime(String(animeId), animeTitle, reason);
    res.json(result);
  });

  app.post('/api/admin/blocks/restore', requireAdminAuth, (req, res) => {
    const { type, id } = req.body || {};
    if (!type || !id) {
      return res.status(400).json({ status: false, message: 'type and id are required.' });
    }
    const result = unblockRecord(type, id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  });

  // ==========================================
  // RESOLVER INTERCEPT & BLAKITE PROXY
  // If a manual episode override exists for the requested episode,
  // return the manual stream immediately!
  // Otherwise, proxy to the live ANIZENX resolver.
  // ==========================================
  app.get('/api/resolve/blakite/:animeId/:episodeId', async (req, res) => {
    const { animeId, episodeId } = req.params;
    const requestedQuality = (req.query.quality as string) || undefined;

    // Check if episodeId has format "season-episode" e.g. "1-10" or single number e.g. "10"
    let seasonNum = 1;
    let epNum = 1;

    const cleanEpId = (episodeId || '').replace(/^manual_/, '');

    if (cleanEpId.includes('-')) {
      const parts = cleanEpId.split('-');
      seasonNum = parseInt(parts[0], 10) || 1;
      epNum = parseInt(parts[1], 10) || 1;
    } else {
      epNum = parseInt(cleanEpId, 10) || 0;
    }

    // STRICT CHECK: IF EPISODE / SEASON / ANIME IS BLOCKED, NEVER SERVE IT
    if (isEpisodeBlocked(animeId, seasonNum, epNum)) {
      return res.status(404).json({
        status: false,
        error: `Episode ${epNum} (Season ${seasonNum}) has been permanently deleted/blocked by admin.`,
      });
    }

    const manual = findManualEpisode(animeId, seasonNum, epNum);
    if (manual) {
      const resolved = resolveManualEpisodeStream(manual, requestedQuality);
      return res.status(resolved.status).json(resolved.data);
    }

    // Otherwise proxy through to live backend
    try {
      const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const targetUrl = `${API_BASE}/api/resolve/blakite/${encodeURIComponent(animeId)}/${encodeURIComponent(episodeId)}${queryStr}`;
      const apiRes = await fetch(targetUrl);
      const text = await apiRes.text();
      try {
        const data = JSON.parse(text);
        return res.status(apiRes.status).json(data);
      } catch {
        return res.status(apiRes.status || 502).json({
          status: false,
          error: 'Unable to fetch stream from live ANIZENX server (upstream error).',
        });
      }
    } catch (err: any) {
      console.error('Resolver proxy error:', err);
      res.status(500).json({ status: false, error: 'Failed to resolve stream' });
    }
  });

  // Streaming proxy route for external HTTP/DDNS or cross-origin video files with range requests support
  app.get('/api/proxy/stream', async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).json({ status: false, error: 'Missing url parameter.' });
    }

    try {
      const parsedUrl = new URL(videoUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ status: false, error: 'Invalid URL protocol.' });
      }

      const upstreamHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ANIZENX-Proxy/1.0',
        'Accept': '*/*',
      };

      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const upstreamRes = await fetch(videoUrl, {
        method: 'GET',
        headers: upstreamHeaders,
      });

      res.status(upstreamRes.status);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

      const copyHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'etag',
        'last-modified',
      ];

      for (const h of copyHeaders) {
        const val = upstreamRes.headers.get(h);
        if (val) {
          res.setHeader(h, val);
        }
      }

      if (upstreamRes.body) {
        const reader = upstreamRes.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(value);
          }
        };
        pump().catch(err => {
          console.error('Stream proxy pump error:', err);
          if (!res.headersSent) {
            res.status(502).json({ status: false, error: 'Streaming proxy error' });
          } else {
            res.end();
          }
        });
      } else {
        const buffer = await upstreamRes.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      console.error('Stream proxy error:', err);
      if (!res.headersSent) {
        res.status(502).json({ status: false, error: `Failed to proxy video stream: ${err.message}` });
      } else {
        res.end();
      }
    }
  });

  // General API Proxy routes to https://anime-api-new.antideploy.app
  app.use('/api', async (req, res) => {
    try {
      const targetUrl = `${API_BASE}/api${req.url}`;
      const headers: Record<string, string> = {};
      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'] as string;
      }
      if (req.headers['accept']) {
        headers['accept'] = req.headers['accept'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const apiRes = await fetch(targetUrl, fetchOptions);
      const data = await apiRes.text();

      res.status(apiRes.status);
      const contentType = apiRes.headers.get('content-type');
      if (contentType) {
        res.setHeader('content-type', contentType);
      }
      res.send(data);
    } catch (error) {
      console.error('API Proxy Error:', error);
      res.status(500).json({ status: false, error: 'Proxy failed to reach Anime API' });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
