import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Lock,
  LogOut,
  Search,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Film,
  Layers,
  Tv,
  ArrowLeft,
  ExternalLink,
  Download,
  Upload,
  Play,
  X,
  FileCode,
  Sparkles,
  Database,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Ban,
} from 'lucide-react';
import {
  AnimeItem,
  ManualEpisode,
  ManualSeason,
  SeasonInfo,
  EpisodeItem,
  BlockedRecord,
  BlockedStore,
  BlockType,
} from '../types';
import {
  adminLogin,
  verifyAdminSession,
  getAdminToken,
  setAdminToken,
  fetchAnimeList,
  fetchMergedSeasons,
  fetchMergedEpisodes,
  saveManualEpisode,
  deleteManualEpisode,
  saveManualSeason,
  deleteManualSeason,
  importBackupData,
  invalidateAnimeCache,
  deleteManualEpisodeQuality,
  blockEpisodeAPI,
  blockSeasonAPI,
  blockAnimeAPI,
  restoreBlockAPI,
  fetchAdminBlocks,
} from '../services/api';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { getPlayableStreamUrl } from '../utils/videoProxy';

interface AdminPanelProps {
  onBack: () => void;
  onOpenPlayer?: (animeId: string, episodeId: string, isManual?: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onOpenPlayer }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'episodes' | 'form' | 'storage' | 'audit' | 'blocks'>('episodes');

  // Anime Catalog & Selection
  const [animeCatalog, setAnimeCatalog] = useState<AnimeItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [animeSearchQuery, setAnimeSearchQuery] = useState<string>('');
  const [selectedAnime, setSelectedAnime] = useState<AnimeItem | null>(null);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [catalogPageSize, setCatalogPageSize] = useState<number>(18);
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'list'>('grid');
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState<boolean>(false);

  // Season & Episode State for Selected Anime
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);
  const [mergedEpisodes, setMergedEpisodes] = useState<EpisodeItem[]>([]);
  const [missingNumbers, setMissingNumbers] = useState<number[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState<boolean>(false);

  // Episode Form State with Multi-Quality system
  const [formData, setFormData] = useState<{
    animeId: string;
    animeTitle: string;
    season: number;
    episode_number: number;
    title: string;
    video_url: string;
    qualities: Record<string, string>;
    default_quality: string;
    thumbnail: string;
    description: string;
  }>({
    animeId: '',
    animeTitle: '',
    season: 1,
    episode_number: 1,
    title: '',
    video_url: '',
    qualities: {},
    default_quality: '720p',
    thumbnail: '',
    description: '',
  });

  const [formSaving, setFormSaving] = useState<boolean>(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string>('');
  const [formErrorMessage, setFormErrorMessage] = useState<string>('');

  // Duplicate Override Confirmation Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);
  const [pendingEpisodeData, setPendingEpisodeData] = useState<any>(null);

  // New Season Form Modal
  const [newSeasonModalOpen, setNewSeasonModalOpen] = useState<boolean>(false);
  const [newSeasonNum, setNewSeasonNum] = useState<number>(2);
  const [newSeasonTitle, setNewSeasonTitle] = useState<string>('');

  // Storage & Backup Status State
  const [storageStatusMessage, setStorageStatusMessage] = useState<string>('');

  // Video URL Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Blocked Records State
  const [adminBlocks, setAdminBlocks] = useState<BlockedStore>({ episodes: {}, seasons: {}, anime: {} });

  // Verify active session on mount & load blocks
  useEffect(() => {
    async function checkAuth() {
      setAuthChecking(true);
      const isAuthed = await verifyAdminSession();
      setIsAuthenticated(isAuthed);
      setAuthChecking(false);
      if (isAuthed) {
        const blocks = await fetchAdminBlocks();
        setAdminBlocks(blocks);
      }
    }
    checkAuth();
  }, []);

  // Select Anime handler
  const handleSelectAnime = async (anime: AnimeItem) => {
    setSelectedAnime(anime);
    setEpisodesLoading(true);
    try {
      const seasonsData = await fetchMergedSeasons(anime.id);
      const availableSeasons = seasonsData.seasons || [];

      const targetSeason = availableSeasons.length > 0 ? availableSeasons[0].season : 1;
      setSelectedSeasonNum(targetSeason);

      setFormData((prev) => ({
        ...prev,
        animeId: anime.id,
        animeTitle: anime.title,
        season: targetSeason,
      }));

      const epData = await fetchMergedEpisodes(anime.id, targetSeason);
      const updatedSeasons = availableSeasons.map((s) =>
        s.season === targetSeason ? { ...s, episode_count: epData.episodes.length } : s
      );
      setSeasons(updatedSeasons);
      setMergedEpisodes(epData.episodes);
      setMissingNumbers(epData.missingNumbers);
    } catch (err) {
      console.error('Error selecting anime:', err);
    } finally {
      setEpisodesLoading(false);
    }
  };

  // Switch Season handler
  const handleSwitchSeason = async (seasonNum: number) => {
    setSelectedSeasonNum(seasonNum);
    setFormData((prev) => ({
      ...prev,
      season: seasonNum,
    }));
    if (!selectedAnime) return;
    setEpisodesLoading(true);
    try {
      const epData = await fetchMergedEpisodes(selectedAnime.id, seasonNum);
      setMergedEpisodes(epData.episodes);
      setMissingNumbers(epData.missingNumbers);
      setSeasons((prev) =>
        prev.map((s) =>
          s.season === seasonNum ? { ...s, episode_count: epData.episodes.length } : s
        )
      );
    } catch (err) {
      console.error('Error switching season:', err);
    } finally {
      setEpisodesLoading(false);
    }
  };

  // Load Seasons and Episodes for current anime & season
  const loadAnimeData = async (animeId: string, seasonNum: number) => {
    setEpisodesLoading(true);
    try {
      const [seasonsData, epData] = await Promise.all([
        fetchMergedSeasons(animeId),
        fetchMergedEpisodes(animeId, seasonNum),
      ]);
      const updatedSeasons = (seasonsData.seasons || []).map((s) =>
        s.season === seasonNum ? { ...s, episode_count: epData.episodes.length } : s
      );
      setSeasons(updatedSeasons);
      setMergedEpisodes(epData.episodes);
      setMissingNumbers(epData.missingNumbers);
    } catch (err) {
      console.error('Error loading merged anime episodes:', err);
    } finally {
      setEpisodesLoading(false);
    }
  };

  // Load Anime Catalog once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadCatalog() {
      setCatalogLoading(true);
      try {
        // Fetch full catalog (limit=0 returns all 403 anime from the API)
        const res = await fetchAnimeList(1, 0);
        let allAnime = (res.status && Array.isArray(res.anime)) ? res.anime : [];

        // If for any reason only a paginated chunk was returned, load all pages
        if (res.total && allAnime.length < res.total) {
          let page = 2;
          const limit = allAnime.length || 50;
          while (allAnime.length < res.total && page <= 25) {
            const nextRes = await fetchAnimeList(page, limit);
            if (nextRes.status && Array.isArray(nextRes.anime) && nextRes.anime.length > 0) {
              allAnime = [...allAnime, ...nextRes.anime];
              page++;
            } else {
              break;
            }
          }
        }

        // Deduplicate unique anime by ID
        const seenIds = new Set<string>();
        const uniqueAnime = allAnime.filter((a) => {
          const strId = String(a.id);
          if (seenIds.has(strId)) return false;
          seenIds.add(strId);
          return true;
        });

        setAnimeCatalog(uniqueAnime);
        if (uniqueAnime.length > 0 && !selectedAnime) {
          handleSelectAnime(uniqueAnime[0]);
        }
      } catch (err) {
        console.error('Admin catalog error:', err);
      } finally {
        setCatalogLoading(false);
      }
    }
    loadCatalog();
  }, [isAuthenticated]);

  // Filtered Anime Catalog for Search by Title and ID
  const filteredCatalog = useMemo(() => {
    if (!animeSearchQuery.trim()) return animeCatalog;
    const q = animeSearchQuery.toLowerCase().trim();
    return animeCatalog.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        String(a.id).toLowerCase().includes(q) ||
        (a.tmdbId && String(a.tmdbId).toLowerCase().includes(q)) ||
        (a.originalTmdbId && String(a.originalTmdbId).toLowerCase().includes(q)) ||
        a.genres?.some((g) => g.toLowerCase().includes(q)) ||
        a.synopsis?.toLowerCase().includes(q)
    );
  }, [animeCatalog, animeSearchQuery]);

  const totalCatalogPages = Math.ceil(filteredCatalog.length / catalogPageSize) || 1;

  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filteredCatalog.slice(start, start + catalogPageSize);
  }, [filteredCatalog, catalogPage, catalogPageSize]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoginLoading(true);
    try {
      const res = await adminLogin(adminSecretInput);
      if (res.success) {
        setIsAuthenticated(true);
        setAdminSecretInput('');
      } else {
        setAuthError(res.error || 'Invalid admin secret password.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Login request error.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    setIsAuthenticated(false);
  };

  // Pre-fill Form for New Episode or Gap Episode
  const handleAddNewEpisode = (targetEpNum?: number) => {
    if (!selectedAnime) return;
    const nextEp = targetEpNum !== undefined ? targetEpNum : (mergedEpisodes.length > 0 ? mergedEpisodes[mergedEpisodes.length - 1].episode_number + 1 : 1);
    setFormData({
      animeId: selectedAnime.id,
      animeTitle: selectedAnime.title,
      season: selectedSeasonNum,
      episode_number: nextEp,
      title: `Episode ${nextEp}`,
      video_url: '',
      qualities: {},
      default_quality: '720p',
      thumbnail: selectedAnime.poster || '',
      description: '',
    });
    setFormSuccessMessage('');
    setFormErrorMessage('');
    setActiveTab('form');
  };

  // Pre-fill Form to Edit Manual Episode
  const handleEditEpisode = (ep: EpisodeItem) => {
    if (!selectedAnime) return;
    const initialQualities: Record<string, string> = ep.qualities ? { ...ep.qualities } : {};
    if (ep.video_url && Object.keys(initialQualities).length === 0) {
      initialQualities[ep.default_quality || '720p'] = ep.video_url;
    }
    const defQ = ep.default_quality && initialQualities[ep.default_quality]
      ? ep.default_quality
      : Object.keys(initialQualities)[0] || '720p';
    setFormData({
      animeId: selectedAnime.id,
      animeTitle: selectedAnime.title,
      season: ep.season,
      episode_number: ep.episode_number,
      title: ep.title,
      video_url: ep.video_url || '',
      qualities: initialQualities,
      default_quality: defQ,
      thumbnail: ep.thumbnail || '',
      description: ep.description || '',
    });
    setFormSuccessMessage('');
    setFormErrorMessage('');
    setActiveTab('form');
  };

  // Delete Individual Quality URL without deleting the episode
  const handleDeleteQuality = async (qualityKey: string, ep?: EpisodeItem) => {
    const targetAnimeId = ep?.isManual ? selectedAnime?.id : formData.animeId;
    const targetSeason = ep ? ep.season : formData.season;
    const targetEpNum = ep ? ep.episode_number : formData.episode_number;

    if (!targetAnimeId) return;
    if (!window.confirm(`Delete ${qualityKey} URL for Episode ${targetEpNum}?`)) return;

    try {
      const res = await deleteManualEpisodeQuality(targetAnimeId, targetSeason, targetEpNum, qualityKey);
      if (res.success) {
        setFormData((prev) => {
          const updatedQuals = { ...prev.qualities };
          delete updatedQuals[qualityKey];
          const remaining = Object.keys(updatedQuals);
          return {
            ...prev,
            qualities: updatedQuals,
            default_quality: prev.default_quality === qualityKey ? (remaining[0] || '720p') : prev.default_quality,
            video_url: updatedQuals[prev.default_quality] || updatedQuals[remaining[0]] || '',
          };
        });
        if (selectedAnime) {
          loadAnimeData(selectedAnime.id, selectedSeasonNum);
        }
      } else {
        alert(res.message || 'Failed to delete quality');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting quality');
    }
  };

  // Save Episode (Checks for duplicates with confirmation modal)
  const handleFormSubmit = async (e: React.FormEvent, forceOverride = false) => {
    e.preventDefault();
    setFormSuccessMessage('');
    setFormErrorMessage('');

    const hasQualities = Object.values(formData.qualities || {}).some((u) => u && u.trim().length > 0);
    const hasMainUrl = Boolean(formData.video_url && formData.video_url.trim());

    if (!formData.animeId || (!hasQualities && !hasMainUrl)) {
      setFormErrorMessage('Please provide Anime ID and at least one video quality URL (e.g. 720p or 480p).');
      return;
    }

    let primaryUrl = formData.video_url.trim();
    if (hasQualities) {
      primaryUrl = formData.qualities[formData.default_quality] || Object.values(formData.qualities)[0] || primaryUrl;
    }

    const payloadToSave = {
      ...formData,
      video_url: primaryUrl,
    };

    // Check if duplicate exists locally before sending
    const alreadyExists = mergedEpisodes.some(
      (ep) => ep.episode_number === Number(formData.episode_number)
    );

    if (alreadyExists && !forceOverride) {
      setPendingEpisodeData(payloadToSave);
      setOverrideModalOpen(true);
      return;
    }

    setFormSaving(true);
    try {
      const res = await saveManualEpisode(payloadToSave, forceOverride);
      if (res.success) {
        setFormSuccessMessage(res.message || 'Episode saved successfully!');
        setOverrideModalOpen(false);
        setPendingEpisodeData(null);
        // Refresh episode list
        if (selectedAnime) {
          loadAnimeData(selectedAnime.id, selectedSeasonNum);
        }
      } else if (res.exists) {
        setPendingEpisodeData(payloadToSave);
        setOverrideModalOpen(true);
      } else {
        setFormErrorMessage(res.message || 'Failed to save episode.');
      }
    } catch (err: any) {
      setFormErrorMessage(err?.message || 'Error occurred while saving episode.');
    } finally {
      setFormSaving(false);
    }
  };

  // Confirm Override
  const confirmOverride = () => {
    if (!pendingEpisodeData) return;
    handleFormSubmit({ preventDefault: () => {} } as any, true);
  };

  // Delete Manual Episode
  const handleDeleteEpisode = async (manualIdOrComposite: string, epNum: number) => {
    if (!window.confirm(`Are you sure you want to delete Manual Episode ${epNum}?`)) return;
    try {
      const res = await deleteManualEpisode(manualIdOrComposite);
      if (res.success) {
        if (selectedAnime) {
          loadAnimeData(selectedAnime.id, selectedSeasonNum);
        }
      } else {
        alert(res.message || 'Failed to delete episode');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting episode');
    }
  };

  // Permanent Delete & Block Episode (API or Manual)
  const handlePermanentDeleteEpisode = async (ep: EpisodeItem) => {
    if (!selectedAnime) return;
    if (!window.confirm(`Permanently delete and block Episode ${ep.episode_number} (Season ${selectedSeasonNum})? It will not return during API synchronization.`)) return;
    try {
      const res = await blockEpisodeAPI(selectedAnime.id, selectedSeasonNum, ep.episode_number, selectedAnime.title, 'Deleted by admin');
      if (res.success) {
        if (ep.manualId || ep.isManual) {
          await deleteManualEpisode(ep.manualId || `${selectedAnime.id}_s${selectedSeasonNum}_e${ep.episode_number}`);
        }
        const blocksData = await fetchAdminBlocks();
        setAdminBlocks(blocksData);
        loadAnimeData(selectedAnime.id, selectedSeasonNum);
      } else {
        alert(res.message || 'Failed to delete episode');
      }
    } catch (err: any) {
      alert(err?.message || 'Error blocking episode');
    }
  };

  // Permanent Delete & Block Season
  const handlePermanentDeleteSeason = async (seasonNum: number) => {
    if (!selectedAnime) return;
    if (!window.confirm(`Permanently delete and block Season ${seasonNum} for ${selectedAnime.title}? All episodes in this season will be removed and blocked from API synchronization.`)) return;
    try {
      const res = await blockSeasonAPI(selectedAnime.id, seasonNum, selectedAnime.title, 'Season deleted by admin');
      if (res.success) {
        const blocksData = await fetchAdminBlocks();
        setAdminBlocks(blocksData);
        const seasonsData = await fetchMergedSeasons(selectedAnime.id);
        const newSeasons = seasonsData.seasons || [];
        setSeasons(newSeasons);
        if (newSeasons.length > 0) {
          handleSwitchSeason(newSeasons[0].season);
        } else {
          setMergedEpisodes([]);
        }
      } else {
        alert(res.message || 'Failed to delete season');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting season');
    }
  };

  // Permanent Delete & Block Anime
  const handlePermanentDeleteAnime = async () => {
    if (!selectedAnime) return;
    if (!window.confirm(`WARNING: Permanently delete and block anime "${selectedAnime.title}" (ID: ${selectedAnime.id})? This will block the anime and all its seasons and episodes from the website permanently.`)) return;
    try {
      const res = await blockAnimeAPI(selectedAnime.id, selectedAnime.title, 'Anime deleted by admin');
      if (res.success) {
        alert(`Anime "${selectedAnime.title}" permanently deleted and blocked.`);
        setSelectedAnime(null);
        setAnimeCatalog((prev) => prev.filter((a) => String(a.id) !== String(selectedAnime.id)));
        const blocksData = await fetchAdminBlocks();
        setAdminBlocks(blocksData);
      } else {
        alert(res.message || 'Failed to delete anime');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting anime');
    }
  };

  // Restore Blocked Record
  const handleRestoreRecord = async (type: BlockType, id: string, name: string) => {
    if (!window.confirm(`Restore ${type} "${name}"? It will be allowed to appear again on the website.`)) return;
    try {
      const res = await restoreBlockAPI(type, id);
      if (res.success) {
        const blocksData = await fetchAdminBlocks();
        setAdminBlocks(blocksData);
        if (selectedAnime) {
          loadAnimeData(selectedAnime.id, selectedSeasonNum);
        }
        const catRes = await fetchAnimeList(1, 0);
        if (catRes.status && Array.isArray(catRes.anime)) {
          setAnimeCatalog(catRes.anime);
        }
        alert('Restored successfully!');
      } else {
        alert(res.message || 'Failed to restore item');
      }
    } catch (err: any) {
      alert(err?.message || 'Error restoring item');
    }
  };

  // Create Manual Season
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnime) return;
    try {
      const res = await saveManualSeason({
        animeId: selectedAnime.id,
        season: Number(newSeasonNum),
        title: newSeasonTitle || `Season ${newSeasonNum}`,
        status: 'Ongoing',
      });
      if (res.success) {
        setNewSeasonModalOpen(false);
        setNewSeasonTitle('');
        const seasonsData = await fetchMergedSeasons(selectedAnime.id);
        setSeasons(seasonsData.seasons);
        handleSwitchSeason(Number(newSeasonNum));
      } else {
        alert(res.message || 'Failed to create season');
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating season');
    }
  };

  // Import Backup JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await importBackupData(json);
        if (res.success) {
          alert(`Backup imported successfully! ${res.importedEpisodes} episodes and ${res.importedSeasons} seasons restored.`);
          if (selectedAnime) {
            loadAnimeData(selectedAnime.id, selectedSeasonNum);
          }
        } else {
          alert(res.message || 'Failed to import backup.');
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // RENDER: Auth Checking State
  if (authChecking) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 bg-[#121222] border border-purple-900/40 rounded-3xl text-center space-y-4 shadow-2xl animate-pulse">
        <Shield className="w-12 h-12 text-purple-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Verifying Admin Access...</h3>
      </div>
    );
  }

  // RENDER: Login Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 sm:p-8 bg-[#121222] border border-purple-500/40 rounded-3xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center mx-auto shadow-xl shadow-purple-600/40">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">ANIZENX Admin</h2>
          <p className="text-xs text-purple-300">
            Anime Episode &amp; Season Management Console
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
              Admin Secret Key
            </label>
            <input
              type="password"
              placeholder="Enter server ADMIN_SECRET..."
              value={adminSecretInput}
              onChange={(e) => setAdminSecretInput(e.target.value)}
              required
              className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Default development key: <code className="text-pink-400">anizenx-admin-2026</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Authenticate Admin
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors cursor-pointer pt-2"
          >
            ← Return to Website
          </button>
        </form>
      </div>
    );
  }

  // RENDER: Authenticated Admin Panel
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#121222] p-6 rounded-3xl border border-purple-900/40 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/40 flex-shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-wide">ANIZENX Episode Manager</h1>
              <span className="bg-pink-600/30 text-pink-300 border border-pink-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin Secure
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Manage anime seasons, add custom video streams, and merge API &amp; manual episodes seamlessly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <button
            onClick={onBack}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-200 border border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-purple-900/30 pb-3">
        <button
          onClick={() => setActiveTab('episodes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'episodes'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-[#121222] text-gray-300 hover:text-white border border-purple-900/40'
          }`}
        >
          <Tv className="w-4 h-4" /> Episode Management
        </button>
        <button
          onClick={() => {
            handleAddNewEpisode();
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'form'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-[#121222] text-gray-300 hover:text-white border border-purple-900/40'
          }`}
        >
          <Plus className="w-4 h-4" /> Add Manual Episode
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-[#121222] text-gray-300 hover:text-white border border-purple-900/40'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Missing Episodes Audit ({missingNumbers.length})
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'storage'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-[#121222] text-gray-300 hover:text-white border border-purple-900/40'
          }`}
        >
          <Download className="w-4 h-4" /> Backend Storage &amp; Backup
        </button>
        <button
          onClick={async () => {
            setActiveTab('blocks');
            const blocks = await fetchAdminBlocks();
            setAdminBlocks(blocks);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'blocks'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-[#121222] text-gray-300 hover:text-white border border-purple-900/40'
          }`}
        >
          <Ban className="w-4 h-4" /> Deleted &amp; Blocked ({Object.keys(adminBlocks.episodes || {}).length + Object.keys(adminBlocks.seasons || {}).length + Object.keys(adminBlocks.anime || {}).length})
        </button>
      </div>

      {/* TARGET ANIME CATALOG & SELECTION COMPONENT */}
      <div className="bg-[#121222] p-5 sm:p-6 rounded-3xl border border-purple-900/30 space-y-5 shadow-2xl">
        {/* Header with Title, Count, Search & View Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" /> Target Anime Catalog
              </h2>
              <span className="bg-purple-950 text-purple-300 border border-purple-800/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {filteredCatalog.length} {filteredCatalog.length === 1 ? 'Anime' : 'Anime Available'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Browse or search the full anime catalog. Click any anime card to manage its seasons and episodes.
            </p>
          </div>

          {/* Search Input & View Controls */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-grow lg:w-80">
              <input
                type="text"
                placeholder="Search by title or ID (e.g. 1429, Naruto)..."
                value={animeSearchQuery}
                onChange={(e) => {
                  setAnimeSearchQuery(e.target.value);
                  setCatalogPage(1);
                }}
                className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
              {animeSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setAnimeSearchQuery('');
                    setCatalogPage(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grid / List view toggle */}
            <div className="flex items-center bg-[#18182e] p-1 rounded-xl border border-purple-900/40 flex-shrink-0">
              <button
                type="button"
                onClick={() => setCatalogViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  catalogViewMode === 'grid' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCatalogViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  catalogViewMode === 'list' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Toggle Collapse/Expand */}
            <button
              type="button"
              onClick={() => setIsCatalogCollapsed(!isCatalogCollapsed)}
              className="px-3 py-2 bg-[#18182e] hover:bg-purple-900/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer flex-shrink-0 transition-colors"
            >
              {isCatalogCollapsed ? (
                <>
                  <span className="hidden sm:inline">Show Catalog</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Hide Catalog</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Anime Card Banner */}
        {selectedAnime && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#181830] to-pink-950/20 border-2 border-pink-500/50 shadow-xl shadow-purple-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="relative flex-shrink-0">
                <img
                  src={getOptimizedImageUrl(selectedAnime.poster, 'small')}
                  alt={selectedAnime.title}
                  className="w-16 h-22 object-cover rounded-xl border border-pink-500/40 shadow-lg"
                />
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow">
                  ACTIVE
                </span>
              </div>
              <div className="space-y-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold text-pink-400 tracking-wider font-mono bg-pink-950/80 px-2 py-0.5 rounded-md border border-pink-500/30">
                    ANIME ID: {selectedAnime.id}
                  </span>
                  {selectedAnime.tmdbId && (
                    <span className="text-[10px] font-mono text-gray-400">
                      TMDB: {selectedAnime.tmdbId}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {selectedAnime.type || 'Series'} • {selectedAnime.status || 'Ongoing'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white line-clamp-1">{selectedAnime.title}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-purple-300">
                  <span>{seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'} Recorded</span>
                  <span>•</span>
                  <span>{mergedEpisodes.length} Episodes in Season {selectedSeasonNum}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-shrink-0">
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Currently Selected
              </span>
              <button
                type="button"
                onClick={handlePermanentDeleteAnime}
                className="text-xs text-red-300 hover:text-white bg-red-950/80 hover:bg-red-900 border border-red-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold transition-all cursor-pointer"
                title="Permanently delete and block this anime"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Anime
              </button>
            </div>
          </div>
        )}

        {/* CATALOG BODY: GRID OR LIST VIEW */}
        {!isCatalogCollapsed && (
          <div className="space-y-4 pt-1">
            {catalogLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 py-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <div key={n} className="h-48 bg-purple-950/20 rounded-2xl animate-pulse border border-purple-900/30" />
                ))}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="p-10 text-center bg-[#18182e] rounded-2xl border border-purple-900/30 space-y-2">
                <Film className="w-8 h-8 text-purple-400 mx-auto" />
                <p className="text-sm font-semibold text-white">No anime matched &quot;{animeSearchQuery}&quot;</p>
                <p className="text-xs text-gray-400">Try searching by title keywords or exact numeric ID (e.g. 1429).</p>
                <button
                  type="button"
                  onClick={() => {
                    setAnimeSearchQuery('');
                    setCatalogPage(1);
                  }}
                  className="text-xs text-pink-400 hover:underline font-bold mt-2 inline-block cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : catalogViewMode === 'grid' ? (
              /* RESPONSIVE GRID VIEW */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 max-h-[520px] overflow-y-auto pr-1">
                {paginatedCatalog.map((anime) => {
                  const isSelected = selectedAnime?.id === anime.id;
                  return (
                    <div
                      key={anime.id}
                      onClick={() => handleSelectAnime(anime)}
                      className={`group relative rounded-2xl p-2.5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                        isSelected
                          ? 'bg-purple-950/80 border-pink-500 ring-2 ring-pink-500/60 shadow-xl shadow-purple-600/30'
                          : 'bg-[#18182e] hover:bg-[#20203a] border-purple-900/40 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black">
                          <img
                            src={getOptimizedImageUrl(anime.poster, 'small')}
                            alt={anime.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-pink-400 border border-purple-500/30">
                            ID: {anime.id}
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 bg-pink-600/25 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-pink-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Selected
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-pink-300 transition-colors">
                            {anime.title}
                          </h4>
                          <span className="text-[10px] text-gray-400">
                            {anime.genres?.[0] || anime.type || 'Series'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAnime(anime);
                          }}
                          className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-pink-600 text-white shadow'
                              : 'bg-purple-950/60 group-hover:bg-purple-600/40 text-purple-200 border border-purple-500/30'
                          }`}
                        >
                          {isSelected ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT LIST VIEW */
              <div className="bg-[#18182e] rounded-2xl border border-purple-900/40 overflow-hidden max-h-[480px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-950/60 border-b border-purple-900/30 text-[10px] uppercase font-bold text-gray-400">
                    <tr>
                      <th className="py-2.5 px-3">Poster</th>
                      <th className="py-2.5 px-3">Anime Title</th>
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Type / Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/20">
                    {paginatedCatalog.map((anime) => {
                      const isSelected = selectedAnime?.id === anime.id;
                      return (
                        <tr
                          key={anime.id}
                          onClick={() => handleSelectAnime(anime)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-purple-950/60 font-semibold' : 'hover:bg-purple-950/30'
                          }`}
                        >
                          <td className="py-2 px-3 w-12">
                            <img
                              src={getOptimizedImageUrl(anime.poster, 'small')}
                              alt=""
                              className="w-8 h-11 object-cover rounded-lg border border-purple-500/30"
                            />
                          </td>
                          <td className="py-2 px-3 text-white font-medium line-clamp-1">
                            {anime.title}
                          </td>
                          <td className="py-2 px-3 font-mono text-pink-400 font-bold">
                            {anime.id}
                          </td>
                          <td className="py-2 px-3 text-gray-400">
                            {anime.type || 'Series'} • {anime.status || 'Completed'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAnime(anime);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-pink-600 text-white'
                                  : 'bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40'
                              }`}
                            >
                              {isSelected ? 'Selected ✓' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION CONTROLS */}
            {filteredCatalog.length > catalogPageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-gray-400 border-t border-purple-900/30">
                <div>
                  Showing {(catalogPage - 1) * catalogPageSize + 1}–
                  {Math.min(catalogPage * catalogPageSize, filteredCatalog.length)} of {filteredCatalog.length} anime
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                    disabled={catalogPage <= 1}
                    className="px-3 py-1.5 rounded-lg bg-[#18182e] border border-purple-900/40 hover:bg-purple-900/40 text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 bg-purple-950/60 rounded-lg text-white font-bold font-mono">
                    Page {catalogPage} of {totalCatalogPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                    disabled={catalogPage >= totalCatalogPages}
                    className="px-3 py-1.5 rounded-lg bg-[#18182e] border border-purple-900/40 hover:bg-purple-900/40 text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: EPISODE MANAGEMENT & LIST */}
      {activeTab === 'episodes' && selectedAnime && (
        <div className="space-y-6">
          {/* Season Selector with New Season Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121222] p-4 rounded-2xl border border-purple-900/30">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Seasons:</span>
              <div className="flex flex-wrap gap-2">
                {seasons.map((s) => {
                  const count =
                    selectedSeasonNum === s.season && !episodesLoading
                      ? mergedEpisodes.length
                      : (s.episode_count ?? 0);
                  return (
                    <button
                      key={s.season}
                      onClick={() => handleSwitchSeason(s.season)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        selectedSeasonNum === s.season
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 shadow-md'
                          : 'bg-[#1a1a2e] text-gray-300 border-purple-900/40 hover:text-white'
                      }`}
                    >
                      <span>Season {s.season}</span>
                      <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-purple-200">
                        {count} Eps
                      </span>
                      {s.isManual && (
                        <span className="text-[9px] bg-pink-500/30 text-pink-300 px-1.5 py-0.2 rounded">
                          Manual
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePermanentDeleteSeason(selectedSeasonNum)}
                className="flex items-center gap-1 bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-500/40 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
                title={`Permanently delete Season ${selectedSeasonNum} and block all its episodes`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Season {selectedSeasonNum}
              </button>

              <button
                onClick={() => {
                  setNewSeasonNum(seasons.length > 0 ? seasons[seasons.length - 1].season + 1 : 1);
                  setNewSeasonModalOpen(true);
                }}
                className="flex items-center gap-1 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> New Season
              </button>

              <button
                onClick={() => handleAddNewEpisode()}
                className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5" /> Add Episode
              </button>
            </div>
          </div>

          {/* Missing Episode Gap Notification Banner */}
          {missingNumbers.length > 0 && (
            <div className="p-4 bg-yellow-950/30 border border-yellow-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-yellow-300 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-yellow-400" />
                <span>
                  Detected {missingNumbers.length} missing episode(s) in Season {selectedSeasonNum}:{' '}
                  <strong className="text-white">{missingNumbers.join(', ')}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missingNumbers.slice(0, 4).map((missingNum) => (
                  <button
                    key={missingNum}
                    onClick={() => handleAddNewEpisode(missingNum)}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/40 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                  >
                    + Fill Ep {missingNum}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Episode List Table */}
          <div className="bg-[#121222] rounded-3xl border border-purple-900/30 overflow-hidden shadow-xl">
            <div className="p-4 bg-purple-950/40 border-b border-purple-900/30 flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider">
              <span>
                Season {selectedSeasonNum} Episodes ({mergedEpisodes.length} Total)
              </span>
              <span className="text-[11px] text-purple-300 font-normal">
                Merged automatically: Manual episodes override API episodes by episode number
              </span>
            </div>

            {episodesLoading ? (
              <div className="p-12 text-center text-purple-300 text-xs animate-pulse">
                Loading Season {selectedSeasonNum} episodes...
              </div>
            ) : mergedEpisodes.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Tv className="w-10 h-10 text-purple-400 mx-auto" />
                <p className="text-gray-400 text-sm">No episodes found for Season {selectedSeasonNum}.</p>
                <button
                  onClick={() => handleAddNewEpisode(1)}
                  className="bg-purple-600 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  + Add Episode 1
                </button>
              </div>
            ) : (
              <div className="divide-y divide-purple-900/20">
                {mergedEpisodes.map((ep) => (
                  <div
                    key={`${ep.season}-${ep.episode_number}`}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-purple-950/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {ep.episode_number}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white text-sm font-bold line-clamp-1">{ep.title}</h4>
                          {ep.isManual ? (
                            <span className="bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                              MANUAL
                            </span>
                          ) : (
                            <span className="bg-purple-950 text-purple-300 border border-purple-800/40 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              API
                            </span>
                          )}
                        </div>
                        {ep.qualities && Object.keys(ep.qualities).length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-gray-400 font-semibold">Qualities:</span>
                            {Object.entries(ep.qualities).map(([qKey, qUrl]) => (
                              <div
                                key={qKey}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                                  (ep.default_quality || '720p') === qKey
                                    ? 'bg-purple-600/40 text-purple-200 border-purple-400'
                                    : 'bg-black/50 text-gray-300 border-purple-900/40'
                                }`}
                              >
                                <span>{qKey}</span>
                                {(ep.default_quality || '720p') === qKey && (
                                  <span className="text-[8px] bg-pink-500/40 text-pink-200 px-1 rounded">Default</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewUrl(qUrl);
                                  }}
                                  className="text-purple-300 hover:text-white cursor-pointer ml-0.5"
                                  title={`Preview ${qKey} Stream`}
                                >
                                  <Play className="w-2.5 h-2.5" />
                                </button>
                                {ep.isManual && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteQuality(qKey, ep);
                                    }}
                                    className="text-gray-400 hover:text-red-400 cursor-pointer ml-0.5"
                                    title={`Delete ${qKey} URL`}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : ep.video_url ? (
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono line-clamp-1">
                            <span className="text-purple-400">Stream:</span>
                            <span className="truncate max-w-xs sm:max-w-md">{ep.video_url}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      {ep.video_url && (
                        <button
                          onClick={() => setPreviewUrl(ep.video_url || null)}
                          className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                          title="Preview Video Stream"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {ep.isManual ? (
                        <>
                          <button
                            onClick={() => handleEditEpisode(ep)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-white text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteEpisode(ep)}
                            className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 transition-all cursor-pointer"
                            title="Permanently Delete Episode &amp; Block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditEpisode(ep)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                            title="Replace API episode with your own video URL"
                          >
                            <Edit className="w-3 h-3" /> Override
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteEpisode(ep)}
                            className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 transition-all cursor-pointer"
                            title="Permanently Delete &amp; Block API Episode"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL EPISODE FORM */}
      {activeTab === 'form' && (
        <div className="max-w-2xl mx-auto bg-[#121222] p-6 sm:p-8 rounded-3xl border border-purple-500/40 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-pink-400" /> Add / Override Manual Episode
              </h2>
              <p className="text-xs text-gray-400">
                Supply your own video URL (MP4, HLS m3u8) for any anime episode.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('episodes')}
              className="p-2 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formSuccessMessage && (
            <div className="p-3 bg-green-950/60 border border-green-500/40 rounded-xl text-green-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          {formErrorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formErrorMessage}</span>
            </div>
          )}

          <form onSubmit={(e) => handleFormSubmit(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Anime ID *
                </label>
                <input
                  type="text"
                  value={formData.animeId}
                  onChange={(e) => setFormData({ ...formData, animeId: e.target.value })}
                  required
                  placeholder="e.g. 1429"
                  className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Anime Title
                </label>
                <input
                  type="text"
                  value={formData.animeTitle}
                  onChange={(e) => setFormData({ ...formData, animeTitle: e.target.value })}
                  placeholder="e.g. Attack on Titan"
                  className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Season Number *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: parseInt(e.target.value, 10) || 1 })}
                  required
                  className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Episode Number *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.episode_number}
                  onChange={(e) =>
                    setFormData({ ...formData, episode_number: parseInt(e.target.value, 10) || 1 })
                  }
                  required
                  className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Episode Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. To You, in 2000 Years"
                className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* MULTI-QUALITY VIDEO STREAM SYSTEM */}
            <div className="space-y-3.5 p-4 bg-[#18182e]/80 rounded-2xl border border-purple-500/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 border-b border-purple-900/40 pb-2.5">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Video Stream Qualities *
                  </label>
                  <p className="text-[11px] text-gray-400">
                    Upload separate video URLs for each quality. Add only the qualities you actually have.
                  </p>
                </div>
                {Object.keys(formData.qualities).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-400 text-[11px]">Default:</span>
                    <select
                      value={formData.default_quality}
                      onChange={(e) => setFormData({ ...formData, default_quality: e.target.value })}
                      className="bg-[#121222] border border-purple-500/40 text-purple-200 text-xs rounded-lg px-2 py-0.5 font-bold focus:outline-none"
                    >
                      {Object.keys(formData.qualities).map((q) => (
                        <option key={q} value={q}>
                          {q} (Default)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {(['1080p', '720p', '480p', '360p', '240p'] as const).map((q) => {
                  const urlValue = formData.qualities[q] || '';
                  const isDefault = formData.default_quality === q;
                  return (
                    <div
                      key={q}
                      className={`p-2.5 rounded-xl border transition-all ${
                        urlValue
                          ? 'bg-purple-950/40 border-purple-500/50 shadow-sm'
                          : 'bg-[#121222] border-purple-900/30 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                              q === '1080p'
                                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40'
                                : q === '720p'
                                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                                : 'bg-gray-800 text-gray-300 border border-gray-700'
                            }`}
                          >
                            {q}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {q === '1080p'
                              ? '1080p Full HD'
                              : q === '720p'
                              ? '720p HD (Recommended Default)'
                              : q === '480p'
                              ? '480p Standard Quality'
                              : q === '360p'
                              ? '360p Mobile'
                              : '240p Data Saver'}
                          </span>
                        </div>

                        {urlValue && (
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[11px] text-purple-200 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="defaultQualityRadio"
                                checked={isDefault}
                                onChange={() => setFormData({ ...formData, default_quality: q })}
                                className="accent-pink-500"
                              />
                              <span className={isDefault ? 'font-bold text-pink-300' : 'text-gray-400'}>
                                {isDefault ? 'Default Quality' : 'Set as Default'}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...formData.qualities };
                                delete updated[q];
                                const remaining = Object.keys(updated);
                                setFormData({
                                  ...formData,
                                  qualities: updated,
                                  default_quality:
                                    formData.default_quality === q
                                      ? remaining[0] || '720p'
                                      : formData.default_quality,
                                  video_url: updated[formData.default_quality] || updated[remaining[0]] || '',
                                });
                              }}
                              className="text-gray-400 hover:text-red-400 text-xs p-1 cursor-pointer"
                              title={`Clear ${q} URL`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={urlValue}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            const updated = { ...formData.qualities };
                            if (val) {
                              updated[q] = val;
                            } else {
                              delete updated[q];
                            }
                            const remaining = Object.keys(updated);
                            const nextDefault =
                              formData.default_quality === q || !updated[formData.default_quality]
                                ? (val ? q : (remaining[0] || '720p'))
                                : formData.default_quality;
                            setFormData({
                              ...formData,
                              qualities: updated,
                              default_quality: nextDefault,
                              video_url: updated[nextDefault] || val || '',
                            });
                          }}
                          placeholder={`Paste ${q} video stream URL (.m3u8, .mp4, CDN)...`}
                          className="w-full bg-[#10101e] border border-purple-500/20 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-purple-400"
                        />
                        {urlValue && (
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(urlValue)}
                            className="p-1.5 bg-purple-900/50 hover:bg-purple-900 text-purple-300 rounded-lg border border-purple-500/30 flex-shrink-0 cursor-pointer"
                            title={`Preview ${q} Stream`}
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Single / Primary Fallback Video URL input */}
              <div className="pt-2 border-t border-purple-900/30">
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Primary Stream URL (Auto-mapped to default quality)
                </label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => {
                    const val = e.target.value;
                    const def = formData.default_quality || '720p';
                    const updatedQualities = { ...formData.qualities };
                    if (val.trim()) {
                      updatedQualities[def] = val.trim();
                    }
                    setFormData({
                      ...formData,
                      video_url: val,
                      qualities: updatedQualities,
                    });
                  }}
                  placeholder="https://example.com/video.mp4 or https://.../master.m3u8"
                  className="w-full bg-[#10101e] border border-purple-500/20 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Thumbnail Image URL (Optional)
              </label>
              <input
                type="url"
                value={formData.thumbnail}
                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Description / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional synopsis or stream notes..."
                className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('episodes')}
                className="px-5 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-600/40 cursor-pointer disabled:opacity-50"
              >
                {formSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Episode
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MISSING EPISODES AUDIT */}
      {activeTab === 'audit' && selectedAnime && (
        <div className="bg-[#121222] p-6 sm:p-8 rounded-3xl border border-purple-900/30 space-y-6 shadow-xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" /> Missing Episodes Audit Tool
            </h2>
            <p className="text-xs text-gray-400">
              Scans Season {selectedSeasonNum} of {selectedAnime.title} to detect missing numbers in the sequence.
            </p>
          </div>

          {missingNumbers.length === 0 ? (
            <div className="p-8 text-center bg-green-950/20 border border-green-500/30 rounded-2xl space-y-2">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Missing Episodes Detected</h3>
              <p className="text-xs text-gray-400">
                Season {selectedSeasonNum} has a complete consecutive sequence up to Episode{' '}
                {mergedEpisodes.length > 0 ? mergedEpisodes[mergedEpisodes.length - 1].episode_number : 0}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {missingNumbers.map((num) => (
                  <div
                    key={num}
                    className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
                        Missing Gap
                      </span>
                      <h4 className="text-sm font-bold text-white">Episode {num}</h4>
                    </div>
                    <button
                      onClick={() => handleAddNewEpisode(num)}
                      className="flex items-center gap-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BACKEND STORAGE & BACKUP */}
      {activeTab === 'storage' && (
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Backend Storage Engine Overview */}
          <div className="bg-[#121222] p-6 sm:p-8 rounded-3xl border border-purple-500/40 shadow-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" /> ANIZENX Backend Storage Engine
                </h2>
                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active &amp; Operational
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Manual episodes and seasons are stored natively in the ANIZENX backend storage system. No third-party API keys or external services required.
              </p>
            </div>

            {storageStatusMessage && (
              <div className="p-3 bg-purple-950/60 border border-purple-500/40 rounded-xl text-purple-200 text-xs">
                {storageStatusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#18182e] p-4 rounded-2xl border border-purple-900/40 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Database Engine</div>
                <div className="text-sm font-bold text-white">File-Backed JSON Database</div>
                <div className="text-xs text-gray-400">
                  Atomic read/write operations with in-memory caching and persistent storage.
                </div>
              </div>

              <div className="bg-[#18182e] p-4 rounded-2xl border border-purple-900/40 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Collision Protection</div>
                <div className="text-sm font-bold text-white">Composite Key Uniqueness</div>
                <div className="text-xs text-gray-400 font-mono">
                  anime_id + season + episode_number
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-950/30 rounded-2xl border border-purple-900/30 text-xs text-purple-200 space-y-1.5">
              <div className="font-semibold text-white">How Storage &amp; Sync Works:</div>
              <ul className="list-disc list-inside space-y-1 text-gray-300 text-[11px]">
                <li>Manual episodes survive future API syncs and catalog reloads.</li>
                <li>When an episode exists both in the API and manual storage, your custom stream URL always takes priority.</li>
                <li>All episodes can be exported or imported below as JSON at any time.</li>
              </ul>
            </div>
          </div>

          {/* Backup Export / Import */}
          <div className="bg-[#121222] p-6 sm:p-8 rounded-3xl border border-purple-900/30 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-pink-400" /> JSON Backup &amp; Migration
            </h3>
            <p className="text-xs text-gray-400">
              Download your manual episodes as JSON to migrate between environments or backup your custom streams.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="/api/admin/backup/export"
                download="anizenx-manual-episodes-backup.json"
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export All Data (.json)
              </a>

              <label className="flex items-center gap-2 bg-[#18182e] hover:bg-purple-900/40 text-purple-200 border border-purple-500/40 text-xs font-semibold px-5 py-2.5 rounded-xl shadow cursor-pointer">
                <Upload className="w-4 h-4" /> Import Backup (.json)
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DELETED & BLOCKED ITEMS (RESTORE) */}
      {activeTab === 'blocks' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-[#121222] p-6 sm:p-8 rounded-3xl border border-purple-500/40 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-400" /> Deleted &amp; Blocked Items (Tombstones)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Permanently deleted anime, seasons, and API/manual episodes are listed here. Click Restore to allow them to reappear on the website.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const blocks = await fetchAdminBlocks();
                  setAdminBlocks(blocks);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Blocked Anime Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider">
                Blocked Anime ({Object.keys(adminBlocks.anime || {}).length})
              </h3>
              {Object.keys(adminBlocks.anime || {}).length === 0 ? (
                <p className="text-xs text-gray-400 bg-[#18182e] p-4 rounded-xl border border-purple-900/30">
                  No blocked anime.
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.values(adminBlocks.anime || {}).map((rec: BlockedRecord) => (
                    <div key={rec.id} className="flex items-center justify-between bg-[#18182e] p-3.5 rounded-xl border border-purple-900/40">
                      <div>
                        <div className="text-sm font-bold text-white">{rec.animeTitle || `Anime ID: ${rec.animeId}`}</div>
                        <div className="text-[10px] text-gray-400 font-mono">Anime ID: {rec.animeId} • Deleted: {new Date(rec.deletedAt).toLocaleString()}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreRecord('anime', rec.id, rec.animeTitle || rec.animeId)}
                        className="flex items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Anime
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Seasons Section */}
            <div className="space-y-3 pt-4 border-t border-purple-900/30">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">
                Blocked Seasons ({Object.keys(adminBlocks.seasons || {}).length})
              </h3>
              {Object.keys(adminBlocks.seasons || {}).length === 0 ? (
                <p className="text-xs text-gray-400 bg-[#18182e] p-4 rounded-xl border border-purple-900/30">
                  No blocked seasons.
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.values(adminBlocks.seasons || {}).map((rec: BlockedRecord) => (
                    <div key={rec.id} className="flex items-center justify-between bg-[#18182e] p-3.5 rounded-xl border border-purple-900/40">
                      <div>
                        <div className="text-sm font-bold text-white">{rec.animeTitle} — Season {rec.season}</div>
                        <div className="text-[10px] text-gray-400 font-mono">Anime ID: {rec.animeId} • Season {rec.season} • Deleted: {new Date(rec.deletedAt).toLocaleString()}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreRecord('season', rec.id, `${rec.animeTitle} Season ${rec.season}`)}
                        className="flex items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Season
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Episodes Section */}
            <div className="space-y-3 pt-4 border-t border-purple-900/30">
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                Blocked Episodes ({Object.keys(adminBlocks.episodes || {}).length})
              </h3>
              {Object.keys(adminBlocks.episodes || {}).length === 0 ? (
                <p className="text-xs text-gray-400 bg-[#18182e] p-4 rounded-xl border border-purple-900/30">
                  No blocked episodes.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {Object.values(adminBlocks.episodes || {}).map((rec: BlockedRecord) => (
                    <div key={rec.id} className="flex items-center justify-between bg-[#18182e] p-3.5 rounded-xl border border-purple-900/40">
                      <div>
                        <div className="text-sm font-bold text-white">{rec.animeTitle} — Season {rec.season} Episode {rec.episode_number}</div>
                        <div className="text-[10px] text-gray-400 font-mono">Anime ID: {rec.animeId} • S{rec.season}E{rec.episode_number} • Deleted: {new Date(rec.deletedAt).toLocaleString()}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreRecord('episode', rec.id, `${rec.animeTitle} S${rec.season}E${rec.episode_number}`)}
                        className="flex items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Episode
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OVERRIDE CONFIRMATION MODAL */}
      {overrideModalOpen && pendingEpisodeData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121222] border border-yellow-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-yellow-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">Episode Already Exists</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Episode <strong>{pendingEpisodeData.episode_number}</strong> of Season{' '}
              <strong>{pendingEpisodeData.season}</strong> already exists for{' '}
              <strong>{pendingEpisodeData.animeTitle}</strong>.
            </p>

            <div className="p-3 bg-purple-950/40 border border-purple-900/40 rounded-xl text-[11px] text-purple-300 space-y-1">
              <div>
                <strong>Action:</strong> Replacing with manual stream URL
              </div>
              <div className="truncate font-mono">{pendingEpisodeData.video_url}</div>
            </div>

            <p className="text-xs text-gray-400">
              Confirming will override the existing episode. The website will display only this single episode entry using your manual video URL.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOverrideModalOpen(false);
                  setPendingEpisodeData(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmOverride}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-pink-600 hover:from-yellow-400 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                Yes, Replace &amp; Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SEASON MODAL */}
      {newSeasonModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121222] border border-purple-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" /> Create New Season
              </h3>
              <button
                onClick={() => setNewSeasonModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Season Number *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newSeasonNum}
                  onChange={(e) => setNewSeasonNum(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Season Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`Season ${newSeasonNum}`}
                  value={newSeasonTitle}
                  onChange={(e) => setNewSeasonTitle(e.target.value)}
                  className="w-full bg-[#18182e] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewSeasonModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg cursor-pointer"
                >
                  Create Season
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STREAM PREVIEW MODAL */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#121222] border border-purple-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-pink-400" /> Video URL Stream Preview
              </h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-purple-500/30 flex items-center justify-center">
              <video
                src={getPlayableStreamUrl(previewUrl)}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 font-mono truncate">
              <span className="truncate">{previewUrl}</span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-3 py-1 bg-purple-950 text-purple-300 rounded-lg font-sans font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
