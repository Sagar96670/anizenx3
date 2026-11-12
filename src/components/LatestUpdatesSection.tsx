import React, { useEffect, useState } from 'react';
import { Sparkles, Clock, Play, Tv, ChevronRight } from 'lucide-react';
import { UpdateRecord } from '../types';
import { fetchLatestUpdates, syncCatalogUpdatesAPI } from '../services/api';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface LatestUpdatesSectionProps {
  onSelectItem: (id: string, type: 'anime' | 'movie') => void;
  onSelectEpisode?: (animeId: string, episodeId: string, episodeNumber: number, seasonNumber: number) => void;
  onViewAll?: () => void;
}

export const LatestUpdatesSection: React.FC<LatestUpdatesSectionProps> = ({
  onSelectItem,
  onSelectEpisode,
  onViewAll,
}) => {
  const [updates, setUpdates] = useState<UpdateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadUpdates() {
      try {
        let list = await fetchLatestUpdates(20);
        if (list.length === 0) {
          list = await syncCatalogUpdatesAPI();
        }
        if (isMounted) {
          setUpdates(list);
        }
      } catch (err) {
        console.error('Latest updates load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadUpdates();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatTimeAgo = (isoString: string) => {
    if (!isoString) return 'Recently';
    const date = new Date(isoString);
    const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'NEW':
        return 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-950/50';
      case 'NEW EPISODE':
        return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-950/50';
      case 'NEW SEASON':
        return 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-950/50';
      default:
        return 'bg-purple-900/80 text-purple-200 border border-purple-500/30';
    }
  };

  const handleCardClick = (upd: UpdateRecord) => {
    if (upd.updateType === 'NEW_EPISODE' && onSelectEpisode) {
      const epId = `${upd.season || 1}-${upd.episode || 1}`;
      onSelectEpisode(upd.animeId, epId, upd.episode || 1, upd.season || 1);
    } else {
      onSelectItem(upd.animeId, 'anime');
    }
  };

  if (loading && updates.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-56 bg-purple-950/30 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-purple-950/20 rounded-2xl border border-purple-900/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/30">
            <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              Latest Anime Updates
              <span className="text-[10px] uppercase font-bold bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/30">
                Auto Detect
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-400">Freshly added series, seasons &amp; new episodes</p>
          </div>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group cursor-pointer"
          >
            View Catalog <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Updates Content or Empty State */}
      {updates.length === 0 ? (
        <div className="bg-[#121222]/60 border border-purple-900/40 rounded-2xl p-6 text-center text-gray-400 text-xs">
          No recent anime updates recorded yet. Newly added series, seasons, and episodes will appear here automatically.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {updates.slice(0, 8).map((upd) => (
          <div
            key={upd.id}
            onClick={() => handleCardClick(upd)}
            className="group relative bg-[#121222]/90 hover:bg-[#181830] border border-purple-900/40 hover:border-purple-500/50 rounded-2xl p-3 flex gap-3 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-purple-950/60 hover:-translate-y-1 overflow-hidden"
          >
            {/* Poster Thumbnail */}
            <div className="relative w-16 h-22 sm:w-20 sm:h-26 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-purple-900/30">
              <img
                src={getOptimizedImageUrl(upd.poster, 'medium')}
                alt={upd.animeTitle}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Info Content */}
            <div className="flex flex-col justify-between flex-grow min-w-0 py-0.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${getBadgeStyle(
                      upd.badge
                    )}`}
                  >
                    {upd.badge}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-purple-400" />
                    {formatTimeAgo(upd.timestamp)}
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                  {upd.animeTitle}
                </h3>

                <p className="text-[11px] text-purple-300 font-semibold line-clamp-1">
                  {upd.updateType === 'NEW_EPISODE' ? (
                    `Season ${upd.season} • Episode ${upd.episode}`
                  ) : upd.updateType === 'NEW_SEASON' ? (
                    `Season ${upd.season} Available`
                  ) : (
                    `Full Series Available`
                  )}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-purple-900/30 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Tv className="w-3 h-3 text-pink-400" />
                  Hindi Dub
                </span>
                <span className="text-purple-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                  Watch <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </section>
  );
};
