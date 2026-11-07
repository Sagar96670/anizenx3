import React, { useState, useEffect } from 'react';
import { Play, Info, Star, ChevronRight, TrendingUp, Sparkles, Clapperboard, RefreshCw } from 'lucide-react';
import { AnimeItem, MovieItem } from '../types';
import { AnimeCard } from './AnimeCard';
import { fetchAnimeList, fetchMoviesList } from '../services/api';

interface HomeViewProps {
  onSelectItem: (id: string, type: 'anime' | 'movie') => void;
  onViewAll: (category: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectItem, onViewAll }) => {
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [movieList, setMovieList] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(false);
      try {
        const [animeRes, movieRes] = await Promise.all([
          fetchAnimeList(1, 40),
          fetchMoviesList()
        ]);
        if (animeRes.status) {
          setAnimeList(animeRes.anime);
        }
        if (movieRes.status) {
          setMovieList(movieRes.movies);
        }
        if (!animeRes.status && !movieRes.status) {
          setError(true);
        }
      } catch (err) {
        console.error('Home load error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const featuredAnime = animeList.length > 0 ? animeList[0] : null;
  const trendingAnime = animeList.slice(1, 11);
  const latestAnime = animeList.slice(11, 21);
  const popularAnime = animeList.slice(21, 31);
  const latestMovies = movieList.slice(0, 10);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 animate-pulse">
        <div className="w-full h-[500px] bg-purple-950/20 rounded-3xl border border-purple-900/30" />
        <div className="space-y-4">
          <div className="h-8 w-48 bg-purple-950/30 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="aspect-[3/4] bg-purple-950/20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-[#121222] border border-red-500/30 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-xl font-bold text-white">Failed to Connect to ANIZENX</h3>
        <p className="text-gray-400 text-sm">
          Unable to fetch data from the live ANIZENX server. Please check your connection and retry.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-purple-600/30 hover:scale-105 transition-transform"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Banner Section */}
      {featuredAnime && (
        <section className="relative w-full h-[550px] sm:h-[650px] overflow-hidden bg-gray-950">
          <div className="absolute inset-0">
            <img
              src={featuredAnime.backdrop || featuredAnime.poster}
              alt={featuredAnime.title}
              className="w-full h-full object-cover filter brightness-75 scale-105 animate-pulse duration-[10000ms]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b14] via-[#0b0b14]/80 to-transparent" />
          </div>

          <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-600/40 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Featured Anime
                </span>
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/40">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-white">{featuredAnime.rating}</span>
                </div>
                <span className="text-sm text-purple-300 font-medium">
                  {featuredAnime.releaseDate ? featuredAnime.releaseDate.split('-')[0] : '2026'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                {featuredAnime.title}
              </h1>

              <p className="text-gray-300 text-sm sm:text-base line-clamp-3 leading-relaxed drop-shadow">
                {featuredAnime.synopsis}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {featuredAnime.genres?.map((g) => (
                  <span
                    key={g}
                    className="text-xs font-medium bg-purple-900/40 border border-purple-500/30 text-purple-200 px-3 py-1 rounded-lg backdrop-blur-sm"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={() => onSelectItem(featuredAnime.id, 'anime')}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-xl shadow-purple-600/40 transition-all transform hover:scale-105"
                >
                  <Play className="w-5 h-5 fill-white" /> Watch Now
                </button>
                <button
                  onClick={() => onSelectItem(featuredAnime.id, 'anime')}
                  className="flex items-center gap-2 bg-[#1a1a2e]/80 hover:bg-[#22223b] text-white font-semibold px-6 py-3.5 rounded-2xl border border-purple-500/40 backdrop-blur-md transition-all"
                >
                  <Info className="w-5 h-5" /> Details
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Trending Anime */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide">Trending Anime</h2>
                <p className="text-xs text-gray-400">Most popular series this week</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('trending')}
              className="flex items-center gap-1 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {trendingAnime.map((item) => (
              <AnimeCard key={item.id} item={item} type="anime" onClick={onSelectItem} />
            ))}
          </div>
        </section>

        {/* Latest Anime Series */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide">Latest Anime Series</h2>
                <p className="text-xs text-gray-400">Fresh episodes &amp; newly added series</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('latest-anime')}
              className="flex items-center gap-1 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {latestAnime.map((item) => (
              <AnimeCard key={item.id} item={item} type="anime" onClick={onSelectItem} />
            ))}
          </div>
        </section>

        {/* Latest Movies */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Clapperboard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide">Latest Anime Movies</h2>
                <p className="text-xs text-gray-400">Cinematic anime masterpieces in Hindi Dub</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('movies')}
              className="flex items-center gap-1 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {latestMovies.map((movie) => (
              <AnimeCard key={movie.id} item={movie} type="movie" onClick={onSelectItem} />
            ))}
          </div>
        </section>

        {/* Popular Anime */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide">Popular &amp; Masterpiece Anime</h2>
                <p className="text-xs text-gray-400">All-time fan favorites</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('popular')}
              className="flex items-center gap-1 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {popularAnime.map((item) => (
              <AnimeCard key={item.id} item={item} type="anime" onClick={onSelectItem} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
