import React, { useState, useEffect } from 'react';
import { Clapperboard, RefreshCw } from 'lucide-react';
import { MovieItem } from '../types';
import { AnimeCard } from './AnimeCard';
import { fetchMoviesList } from '../services/api';

interface MovieListViewProps {
  onSelectItem: (id: string, type: 'movie') => void;
}

export const MovieListView: React.FC<MovieListViewProps> = ({ onSelectItem }) => {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      try {
        const res = await fetchMoviesList();
        if (res.status) {
          setMovies(res.movies);
        }
      } catch (err) {
        console.error('Error loading movies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMovies();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#121222] p-6 rounded-3xl border border-purple-900/30">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
          <Clapperboard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Anime Movies Catalog</h1>
          <p className="text-xs text-gray-400">Explore {movies.length} cinematic anime films in Hindi Dub</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="aspect-[3/4] bg-purple-950/20 rounded-2xl border border-purple-900/30" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20 bg-[#121222] rounded-3xl border border-purple-900/30 space-y-4">
          <RefreshCw className="w-12 h-12 text-purple-400 mx-auto animate-spin" />
          <h3 className="text-xl font-bold text-white">No Movies Found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {movies.map((movie) => (
            <AnimeCard key={movie.id} item={movie} type="movie" onClick={(id) => onSelectItem(id, 'movie')} />
          ))}
        </div>
      )}
    </div>
  );
};
