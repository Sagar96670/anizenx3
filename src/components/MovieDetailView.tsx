import React, { useState, useEffect } from 'react';
import { Play, Star, Calendar, Clapperboard, ArrowLeft, RefreshCw, AlertCircle, Film } from 'lucide-react';
import { MovieItem } from '../types';
import { fetchMovieDetail, fetchMoviesList } from '../services/api';
import { AnimeCard } from './AnimeCard';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface MovieDetailViewProps {
  movieId: string;
  onBack: () => void;
  onWatchMovie: (movieId: string) => void;
  onSelectItem?: (id: string, type: 'anime' | 'movie') => void;
}

export const MovieDetailView: React.FC<MovieDetailViewProps> = ({
  movieId,
  onBack,
  onWatchMovie,
  onSelectItem,
}) => {
  const [movie, setMovie] = useState<MovieItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [relatedMovies, setRelatedMovies] = useState<MovieItem[]>([]);

  const loadMovie = async () => {
    setLoading(true);
    setError(false);
    try {
      const [movieData, allMoviesRes] = await Promise.all([
        fetchMovieDetail(movieId),
        fetchMoviesList(),
      ]);

      if (movieData) {
        setMovie(movieData);
      } else {
        setError(true);
      }

      if (allMoviesRes && allMoviesRes.status && allMoviesRes.movies) {
        setRelatedMovies(
          allMoviesRes.movies
            .filter((m) => String(m.id) !== String(movieId))
            .slice(0, 6)
        );
      }
    } catch (e) {
      console.error('Error loading movie detail:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movieId) {
      loadMovie();
    }
  }, [movieId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-8 animate-pulse">
        <div className="w-full h-[450px] bg-purple-950/20 rounded-3xl border border-purple-900/30" />
        <div className="space-y-4 max-w-2xl">
          <div className="h-10 bg-purple-950/30 rounded-xl w-3/4" />
          <div className="h-6 bg-purple-950/20 rounded-lg w-1/2" />
          <div className="h-20 bg-purple-950/20 rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#121222] border border-red-500/30 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Movie Not Found</h3>
        <p className="text-gray-400 text-sm">
          Unable to load movie details from the ANIZENX server.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={loadMovie}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 hover:scale-105 transition-transform text-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button
            onClick={onBack}
            className="bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border border-purple-500/30 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
          >
            Back to Movies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Backdrop Header */}
      <div className="relative w-full h-[450px] sm:h-[550px] overflow-hidden bg-gray-950">
        <img
          src={getOptimizedImageUrl(movie.backdrop || movie.poster, 'backdrop')}
          alt={movie.title}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover filter brightness-50 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b14] via-[#0b0b14]/70 to-transparent" />

        {/* Back Navigation Button */}
        <div className="absolute top-6 left-4 sm:left-12 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="flex items-center gap-2 bg-black/60 backdrop-blur-md hover:bg-purple-600/30 text-white px-4 py-2 rounded-xl border border-purple-500/40 text-sm font-semibold transition-all cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Movies
          </button>
        </div>

        {/* Movie Hero Meta */}
        <div className="absolute bottom-10 left-4 sm:left-12 right-4 sm:right-12 flex flex-col md:flex-row items-start md:items-end gap-8 z-20">
          <img
            src={getOptimizedImageUrl(movie.poster, 'large')}
            alt={movie.title}
            loading="eager"
            decoding="async"
            className="w-44 sm:w-56 aspect-[3/4] object-cover rounded-2xl shadow-2xl border-2 border-purple-500/40 hidden sm:block flex-shrink-0"
          />

          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Movie • {movie.status || 'Released'}
              </span>
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/40">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold text-white">{movie.rating || '8.0'}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-300 text-sm font-medium bg-purple-950/40 px-3 py-1 rounded-full border border-purple-900/40">
                <Calendar className="w-4 h-4" />
                <span>{movie.releaseDate ? movie.releaseDate.split('-')[0] : 'Feature Film'}</span>
              </div>
              <span className="bg-pink-600/20 text-pink-300 border border-pink-500/40 text-xs font-bold px-3 py-1 rounded-full">
                Hindi Dubbed
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

            {/* Watch Movie Now Action Button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onWatchMovie(movie.id);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-xl shadow-purple-600/40 transition-all transform hover:scale-105 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" /> Watch Movie Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details & Related Movies */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Full Synopsis Card */}
        <div className="bg-[#121222] border border-purple-900/30 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Movie Storyline &amp; Overview</h2>
              <p className="text-xs text-gray-400">Audio: Hindi Dubbed (ORG) • Resolution: Full HD (1080p, 720p, 480p, 360p, 240p)</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            {movie.synopsis}
          </p>
        </div>

        {/* More Anime Movies in Hindi Dub */}
        {relatedMovies.length > 0 && (
          <div className="space-y-6 pt-4 border-t border-purple-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-wide">More Anime Movies in Hindi Dub</h2>
                  <p className="text-xs text-gray-400">Click any movie below to view details and stream</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
              {relatedMovies.map((item) => (
                <AnimeCard
                  key={item.id}
                  item={item}
                  type="movie"
                  onClick={(id) => {
                    if (onSelectItem) {
                      onSelectItem(id, 'movie');
                    } else {
                      onWatchMovie(id);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
