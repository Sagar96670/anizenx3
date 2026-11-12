import React, { useEffect, useState } from 'react';
import { Trophy, Eye, Star, Play, ChevronRight } from 'lucide-react';
import { AnimeRankingItem } from '../types';
import { fetchAnimeRankingsAPI } from '../services/api';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface TopRankingsSectionProps {
  onSelectItem: (id: string, type: 'anime' | 'movie') => void;
  onViewAll?: () => void;
}

export const TopRankingsSection: React.FC<TopRankingsSectionProps> = ({
  onSelectItem,
  onViewAll,
}) => {
  const [rankings, setRankings] = useState<AnimeRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRankings() {
      setLoading(true);
      try {
        const list = await fetchAnimeRankingsAPI('all', 'total');
        if (isMounted) {
          setRankings(list);
        }
      } catch (err) {
        console.error('Rankings load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRankings();
    return () => {
      isMounted = false;
    };
  }, []);

  // STRICT REQUIREMENT: Limit array to EXACTLY the Top 4 anime (Rank #1, #2, #3, #4)
  const top4Rankings = rankings.slice(0, 4);

  const formatViews = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M views';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K views';
    }
    return `${num} ${num === 1 ? 'view' : 'views'}`;
  };

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) {
      return 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black shadow-lg shadow-amber-500/40 ring-2 ring-yellow-300';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-slate-300 via-gray-200 to-slate-400 text-black shadow-lg shadow-gray-400/40 ring-1 ring-white/60';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 text-white shadow-lg shadow-amber-900/40 ring-1 ring-amber-500/50';
    }
    return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/40 ring-1 ring-purple-400/60 font-bold';
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
            <Trophy className="w-4 sm:w-5 h-4 sm:h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              Top Anime Rankings
              <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Top 4
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-400">Calculated automatically from actual episode views</p>
          </div>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group cursor-pointer"
          >
            View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Rankings Grid (EXACTLY 4 anime cards rendered) */}
      {loading && rankings.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-purple-950/20 rounded-2xl border border-purple-900/30" />
          ))}
        </div>
      ) : top4Rankings.length === 0 ? (
        <div className="bg-[#121222]/60 border border-purple-900/40 rounded-2xl p-6 text-center text-gray-400 text-xs">
          No view stats recorded yet. Start watching episodes to generate live rankings!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {top4Rankings.map((item) => (
            <div
              key={item.animeId}
              onClick={() => onSelectItem(item.animeId, 'anime')}
              className="group relative bg-[#121222]/90 hover:bg-[#181830] border border-purple-900/40 hover:border-purple-500/50 rounded-2xl p-3 flex items-center gap-3.5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-purple-950/60 hover:-translate-y-0.5"
            >
              {/* Rank Number Badge (#1, #2, #3, #4) */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-sm sm:text-base font-black flex-shrink-0 shadow-md ${getRankBadgeStyle(
                  item.rank
                )}`}
              >
                #{item.rank}
              </div>

              {/* Poster Thumbnail */}
              <div className="relative w-12 h-16 sm:w-14 sm:h-18 rounded-xl overflow-hidden bg-gray-900 flex-shrink-0 border border-purple-900/40">
                <img
                  src={getOptimizedImageUrl(item.poster, 'medium')}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-4 h-4 fill-white text-white" />
                </div>
              </div>

              {/* Title, Info & View Stats */}
              <div className="flex-grow min-w-0 space-y-1">
                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                  {item.title}
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30 text-[11px]">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{formatViews(item.totalViews)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-yellow-400 text-[11px] font-semibold">
                    <Star className="w-3 h-3 fill-yellow-400" />
                    {item.rating || '8.5'}
                  </div>
                </div>

                {item.genres && item.genres.length > 0 && (
                  <div className="flex gap-1 overflow-hidden pt-0.5">
                    {item.genres.slice(0, 2).map((g) => (
                      <span
                        key={g}
                        className="text-[9px] font-medium bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-900/40 truncate"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center justify-center p-2 text-purple-400 group-hover:text-white group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
