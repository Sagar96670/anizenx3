import React, { useState, useEffect } from 'react';
import { Search, Filter, Tv, RefreshCw } from 'lucide-react';
import { AnimeItem } from '../types';
import { AnimeCard } from './AnimeCard';
import { fetchAnimeList } from '../services/api';

interface AnimeListViewProps {
  onSelectItem: (id: string, type: 'anime') => void;
  genres: string[];
  initialGenre?: string;
  initialSearch?: string;
}

export const AnimeListView: React.FC<AnimeListViewProps> = ({
  onSelectItem,
  genres,
  initialGenre = '',
  initialSearch = '',
}) => {
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setSelectedGenre(initialGenre);
  }, [initialGenre]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    async function loadAnime() {
      setLoading(true);
      try {
        const res = await fetchAnimeList(page, 36, search, selectedGenre);
        if (res.status) {
          setAnimeList(res.anime);
          setTotal(res.total);
        }
      } catch (err) {
        console.error('Error loading anime list:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnime();
  }, [page, search, selectedGenre]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#121222] p-6 rounded-3xl border border-purple-900/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Anime Series Catalog</h1>
            <p className="text-xs text-gray-400">Explore {total} available anime series in Hindi Dub &amp; Sub</p>
          </div>
        </div>

        {/* Search & Filter inputs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-72">
            <input
              type="text"
              placeholder="Search anime..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-purple-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-purple-400" />
          </div>

          <div className="relative">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-[#1a1a2e] border border-purple-500/30 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-purple-400 cursor-pointer"
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

      {/* Grid or Loading */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
            <div key={n} className="aspect-[3/4] bg-purple-950/20 rounded-2xl border border-purple-900/30" />
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="text-center py-20 bg-[#121222] rounded-3xl border border-purple-900/30 space-y-4">
          <RefreshCw className="w-12 h-12 text-purple-400 mx-auto animate-spin" />
          <h3 className="text-xl font-bold text-white">No Anime Found</h3>
          <p className="text-gray-400 text-sm">Try searching with a different keyword or genre.</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedGenre('');
            }}
            className="bg-purple-600 text-white font-semibold px-6 py-2 rounded-xl text-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {animeList.map((anime) => (
            <AnimeCard key={anime.id} item={anime} type="anime" onClick={(id) => onSelectItem(id, 'anime')} />
          ))}
        </div>
      )}
    </div>
  );
};
