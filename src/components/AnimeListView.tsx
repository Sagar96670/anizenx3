import React, { useState, useEffect, useRef } from 'react';
import { Search, Tv, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { AnimeItem } from '../types';
import { AnimeCard } from './AnimeCard';
import { fetchAnimeList } from '../services/api';

interface AnimeListViewProps {
  onSelectItem: (id: string, type: 'anime') => void;
  genres: string[];
  initialGenre?: string;
  initialSearch?: string;
}

const ITEMS_PER_PAGE = 24; // Optimal for 2-col mobile and 6-col desktop

export const AnimeListView: React.FC<AnimeListViewProps> = ({
  onSelectItem,
  genres,
  initialGenre = '',
  initialSearch = '',
}) => {
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelectedGenre(initialGenre);
    setPage(1);
  }, [initialGenre]);

  useEffect(() => {
    setSearch(initialSearch);
    setDebouncedSearch(initialSearch);
    setPage(1);
  }, [initialSearch]);

  // 200ms debounce on search input to prevent wasteful operations
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 200);
  };

  useEffect(() => {
    let isCurrent = true;

    async function loadAnime() {
      setLoading(true);
      try {
        const res = await fetchAnimeList(page, ITEMS_PER_PAGE, debouncedSearch, selectedGenre);
        if (isCurrent && res.status) {
          setAnimeList(res.anime);
          setTotal(res.total);
        }
      } catch (err) {
        console.error('Error loading anime list:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    loadAnime();

    return () => {
      isCurrent = false;
    };
  }, [page, debouncedSearch, selectedGenre]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#121222] p-5 sm:p-6 rounded-3xl border border-purple-900/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Anime Series Catalog</h1>
            <p className="text-[11px] sm:text-xs text-gray-400">
              Showing {animeList.length} of {total} anime series (Hindi Dub &amp; Sub)
            </p>
          </div>
        </div>

        {/* Search & Filter inputs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-72">
            <input
              type="text"
              placeholder="Search anime..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-purple-500/30 rounded-xl py-2 sm:py-2.5 pl-9 sm:pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
            />
            <Search className="absolute left-3 top-2.5 sm:top-3 w-4 h-4 text-purple-400" />
          </div>

          <div className="relative">
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setPage(1);
              }}
              className="bg-[#1a1a2e] border border-purple-500/30 rounded-xl py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-400 cursor-pointer transition-colors"
            >
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid or Loading State */}
      {loading && animeList.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
            <div key={n} className="aspect-[3/4] bg-purple-950/20 rounded-2xl border border-purple-900/30" />
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="text-center py-16 sm:py-20 bg-[#121222] rounded-3xl border border-purple-900/30 space-y-4">
          <Search className="w-10 sm:w-12 h-10 sm:h-12 text-purple-400 mx-auto" />
          <h3 className="text-lg sm:text-xl font-bold text-white">No Anime Found</h3>
          <p className="text-gray-400 text-xs sm:text-sm">Try searching with a different keyword or genre.</p>
          <button
            onClick={() => {
              setSearch('');
              setDebouncedSearch('');
              setSelectedGenre('');
              setPage(1);
            }}
            className="bg-purple-600 text-white font-semibold px-5 py-2 rounded-xl text-xs sm:text-sm cursor-pointer hover:bg-purple-500 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-6">
            {animeList.map((anime, idx) => (
              <AnimeCard
                key={anime.id}
                item={anime}
                type="anime"
                onClick={(id) => onSelectItem(id, 'anime')}
                priority={idx < 6}
              />
            ))}
          </div>

          {/* Clean Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                  page <= 1
                    ? 'opacity-40 cursor-not-allowed bg-gray-900 text-gray-600 border-gray-800'
                    : 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border-purple-500/30 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <span className="text-xs sm:text-sm font-medium text-purple-300 px-3 py-1 bg-purple-950/40 rounded-lg border border-purple-900/40">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                  page >= totalPages
                    ? 'opacity-40 cursor-not-allowed bg-gray-900 text-gray-600 border-gray-800'
                    : 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border-purple-500/30 cursor-pointer'
                }`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
