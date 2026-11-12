import React, { useState, useEffect } from 'react';
import { Play, Star, Calendar, Clapperboard, ArrowLeft, RefreshCw, AlertCircle, Film, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

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
    <div className="space-y-8 sm:space-y-12 pb-20">
      {/* Cinematic Hero Details Section */}
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] overflow-hidden bg-[#0b0b14] border-b border-purple-900/30">
        <img
          src={getOptimizedImageUrl(movie.backdrop || movie.poster, 'backdrop')}
          alt={movie.title}
          loading="eager"
          decoding="async"
          className="w-full h-full absolute inset-0 object-cover filter brightness-100 contrast-105 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b14] via-[#0b0b14]/60 to-transparent" />

        {/* Back Navigation Button */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-12 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-md hover:bg-purple-600/40 text-white px-3.5 py-2 rounded-xl border border-purple-500/40 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-purple-400" /> Back to Movies
          </button>
        </div>

        {/* Movie Hero Content Grid */}
        <div className="relative z-20 pt-16 sm:pt-20 pb-8 px-4 sm:px-12 max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-5 sm:gap-8">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <img
              src={getOptimizedImageUrl(movie.poster, 'medium')}
              alt={movie.title}
              loading="eager"
              decoding="async"
              className="w-32 sm:w-48 aspect-[3/4] object-cover rounded-2xl shadow-2xl shadow-purple-950/80 border-2 border-purple-500/40 transform hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="space-y-3 sm:space-y-4 max-w-3xl flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-600/30">
                Movie • {movie.status || 'Released'}
              </span>
              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-purple-500/40 text-xs font-bold text-white shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span>{movie.rating || '8.0'}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-200 text-xs font-semibold bg-purple-950/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-purple-500/30">
                <Calendar className="w-3.5 h-3.5 text-pink-400" />
                <span>{movie.releaseDate ? movie.releaseDate.split('-')[0] : 'Feature Film'}</span>
              </div>
              <span className="bg-pink-600/20 text-pink-300 border border-pink-500/40 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                Hindi Dubbed
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] leading-tight">
              {movie.title}
            </h1>

            <div className="space-y-1">
              <p className={`text-gray-200 text-xs sm:text-sm leading-relaxed drop-shadow ${!isSynopsisExpanded ? 'line-clamp-3' : ''}`}>
                {movie.synopsis || 'Stream this feature anime movie in full High Definition with official Hindi Dub audio on ANIZENX.'}
              </p>
              {movie.synopsis && movie.synopsis.length > 150 && (
                <button
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer pt-0.5"
                >
                  {isSynopsisExpanded ? (
                    <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Read More <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {movie.genres?.map((g) => (
                <span
                  key={g}
                  className="text-[11px] sm:text-xs font-semibold bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/30 text-purple-200 px-3 py-1 rounded-xl transition-colors backdrop-blur-md"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Watch Movie Now Button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onWatchMovie(movie.id);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold px-6 sm:px-8 py-3 rounded-2xl shadow-xl shadow-purple-600/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer text-xs sm:text-sm tracking-wide"
              >
                <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-white" /> Watch Movie Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details & Related Movies */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Full Synopsis Card */}
        <div className="bg-[#121222] border border-purple-900/40 p-5 sm:p-7 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Clapperboard className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Movie Storyline &amp; Overview</h2>
              <p className="text-[11px] sm:text-xs text-gray-400">Audio: Hindi Dubbed (ORG) • Resolution: Full HD (1080p, 720p, 480p, 360p, 240p)</p>
            </div>
          </div>
          <p className="text-gray-200 text-xs sm:text-sm leading-relaxed">
            {movie.synopsis}
          </p>
        </div>

        {/* More Anime Movies in Hindi Dub */}
        {relatedMovies.length > 0 && (
          <div className="space-y-5 pt-4 border-t border-purple-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Film className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">More Anime Movies in Hindi Dub</h2>
                  <p className="text-[11px] sm:text-xs text-gray-400">Click any movie below to view details and stream</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-6">
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
