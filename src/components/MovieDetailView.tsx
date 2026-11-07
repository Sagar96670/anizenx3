import React, { useState, useEffect } from 'react';
import { Play, Star, Calendar, Clapperboard, ArrowLeft } from 'lucide-react';
import { MovieItem } from '../types';
import { fetchMovieDetail } from '../services/api';

interface MovieDetailViewProps {
  movieId: string;
  onBack: () => void;
  onWatchMovie: (movieId: string) => void;
}

export const MovieDetailView: React.FC<MovieDetailViewProps> = ({ movieId, onBack, onWatchMovie }) => {
  const [movie, setMovie] = useState<MovieItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovie() {
      setLoading(true);
      try {
        const data = await fetchMovieDetail(movieId);
        setMovie(data);
      } catch (e) {
        console.error('Error loading movie detail:', e);
      } finally {
        setLoading(false);
      }
    }
    loadMovie();
  }, [movieId]);

  if (loading || !movie) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 space-y-8 animate-pulse">
        <div className="w-full h-96 bg-purple-950/20 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Backdrop Header */}
      <div className="relative w-full h-[450px] sm:h-[550px] overflow-hidden">
        <img
          src={movie.backdrop || movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover filter brightness-50 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/60 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-12">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-black/60 backdrop-blur-md hover:bg-purple-600/30 text-white px-4 py-2 rounded-xl border border-purple-500/40 text-sm font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="absolute bottom-10 left-4 sm:left-12 right-4 sm:right-12 flex flex-col md:flex-row items-start md:items-end gap-8">
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-44 sm:w-56 aspect-[3/4] object-cover rounded-2xl shadow-2xl border-2 border-purple-500/40 hidden sm:block"
          />

          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Movie • {movie.status || 'Released'}
              </span>
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/40">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold text-white">{movie.rating}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-300 text-sm font-medium bg-purple-950/40 px-3 py-1 rounded-full border border-purple-900/40">
                <Calendar className="w-4 h-4" />
                <span>{movie.releaseDate || '1997'}</span>
              </div>
              <span className="bg-pink-600/20 text-pink-300 border border-pink-500/40 text-xs font-bold px-3 py-1 rounded-full">
                Hindi Dub
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">
              {movie.title}
            </h1>

            <p className="text-gray-300 text-sm sm:text-base leading-relaxed line-clamp-3">
              {movie.synopsis}
            </p>

            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((g) => (
                <span
                  key={g}
                  className="text-xs font-medium bg-purple-950/80 border border-purple-800/40 text-purple-300 px-3 py-1 rounded-lg"
                >
                  {g}
                </span>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => onWatchMovie(movie.id)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-xl shadow-purple-600/40 transition-all transform hover:scale-105"
              >
                <Play className="w-5 h-5 fill-white" /> Watch Movie Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
