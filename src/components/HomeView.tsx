import React, { useState, useEffect } from 'react';
import { Play, Info, Star, ChevronRight, TrendingUp, Sparkles, Clapperboard, RefreshCw } from 'lucide-react';
import { AnimeItem, MovieItem } from '../types';
import { AnimeCard } from './AnimeCard';
import {
  fetchAnimeList,
  fetchMoviesList,
  getSynchronousCachedAnimeList,
  getSynchronousCachedMoviesList,
} from '../services/api';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface HomeViewProps {
  onSelectItem: (id: string, type: 'anime' | 'movie') => void;
  onViewAll: (category: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectItem, onViewAll }) => {
  // Synchronous cache hydration for instant 0ms first paint
  const initialCachedAnime = getSynchronousCachedAnimeList();
  const initialCachedMovies = getSynchronousCachedMoviesList();

  const [animeList, setAnimeList] = useState<AnimeItem[]>(initialCachedAnime || []);
  const [movieList, setMovieList] = useState<MovieItem[]>(initialCachedMovies || []);
  const [loadingAnime, setLoadingAnime] = useState(!initialCachedAnime);
  const [loadingMovies, setLoadingMovies] = useState(!initialCachedMovies);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Load anime catalog independently (does not wait for movies)
    async function loadAnime() {
      try {
        const animeRes = await fetchAnimeList(1, 40);
        if (isMounted) {
          if (animeRes.status && animeRes.anime.length > 0) {
            setAnimeList(animeRes.anime);
            setError(false);
          } else if (animeList.length === 0) {
            setError(true);
          }
        }
      } catch (err) {
        console.error('Home anime load error:', err);
        if (isMounted && animeList.length === 0) {
          setError(true);
        }
      } finally {
        if (isMounted) setLoadingAnime(false);
      }
    }

    // Load movies catalog independently (does not block anime)
    async function loadMovies() {
      try {
        const movieRes = await fetchMoviesList();
        if (isMounted && movieRes.status && movieRes.movies.length > 0) {
          setMovieList(movieRes.movies);
        }
      } catch (err) {
        console.error('Home movies load error:', err);
      } finally {
        if (isMounted) setLoadingMovies(false);
      }
    }

    loadAnime();
    loadMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredAnime = animeList.length > 0 ? animeList[0] : null;
  const trendingAnime = animeList.slice(1, 11);
  const latestAnime = animeList.slice(11, 21);
  const popularAnime = animeList.slice(21, 31);
  const latestMovies = movieList.slice(0, 10);

  // Full-screen loading skeleton ONLY if absolutely no cached anime exists yet
  if (loadingAnime && animeList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-pulse">
        <div className="w-full h-[450px] sm:h-[550px] bg-purple-950/20 rounded-3xl border border-purple-900/30" />
        <div className="space-y-4">
          <div className="h-7 w-44 bg-purple-950/30 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="aspect-[3/4] bg-purple-950/20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && animeList.length === 0) {
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
          onClick={() => {
            setError(false);
            setLoadingAnime(true);
            fetchAnimeList(1, 40).then((res) => {
              if (res.status) setAnimeList(res.anime);
              setLoadingAnime(false);
            });
            fetchMoviesList().then((res) => {
              if (res.status) setMovieList(res.movies);
              setLoadingMovies(false);
            });
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-purple-600/30 hover:scale-105 transition-transform cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      {/* Hero Banner Section */}
      {featuredAnime && (
        <section className="relative w-full h-[480px] sm:h-[620px] overflow-hidden bg-gray-950">
          <div className="absolute inset-0">
            <img
              src={getOptimizedImageUrl(featuredAnime.backdrop || featuredAnime.poster, 'backdrop')}
              alt={featuredAnime.title}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover filter brightness-75 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b14] via-[#0b0b14]/80 to-transparent" />
          </div>

          <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
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

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none drop-shadow-lg">
                {featuredAnime.title}
              </h1>

              <p className="text-gray-300 text-xs sm:text-sm md:text-base line-clamp-3 leading-relaxed drop-shadow">
                {featuredAnime.synopsis}
              </p>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                {featuredAnime.genres?.map((g) => (
                  <span
                    key={g}
                    className="text-[11px] sm:text-xs font-medium bg-purple-900/40 border border-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-lg backdrop-blur-sm"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 sm:gap-4 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => onSelectItem(featuredAnime.id, 'anime')}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl shadow-xl shadow-purple-600/40 transition-all transform hover:scale-105 cursor-pointer text-sm sm:text-base"
                >
                  <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-white" /> Watch Now
                </button>
                <button
                  type="button"
                  onClick={() => onSelectItem(featuredAnime.id, 'anime')}
                  className="flex items-center gap-2 bg-[#1a1a2e]/80 hover:bg-[#22223b] text-white font-semibold px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl border border-purple-500/40 backdrop-blur-md transition-all cursor-pointer text-sm sm:text-base"
                >
                  <Info className="w-4 sm:w-5 h-4 sm:h-5" /> Details
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Trending Anime (First visible cards with high priority) */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">Trending Anime</h2>
                <p className="text-[11px] sm:text-xs text-gray-400">Most popular series this week</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('trending')}
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group cursor-pointer"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-6">
            {trendingAnime.map((item, idx) => (
              <AnimeCard
                key={item.id}
                item={item}
                type="anime"
                onClick={onSelectItem}
                priority={idx < 4}
              />
            ))}
          </div>
        </section>

        {/* Latest Anime Series */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                <Sparkles className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">Latest Anime Series</h2>
                <p className="text-[11px] sm:text-xs text-gray-400">Fresh episodes &amp; newly added series</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('latest-anime')}
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group cursor-pointer"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-6">
            {latestAnime.map((item) => (
              <AnimeCard key={item.id} item={item} type="anime" onClick={onSelectItem} />
            ))}
          </div>
        </section>

        {/* Latest Movies (Progressive load, does not block anime) */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Clapperboard className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">Latest Anime Movies</h2>
                <p className="text-[11px] sm:text-xs text-gray-400">Cinematic anime masterpieces in Hindi Dub</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('movies')}
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group cursor-pointer"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {loadingMovies && latestMovies.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-6 animate-pulse">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="aspect-[3/4] bg-purple-950/20 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-6">
              {latestMovies.map((movie) => (
                <AnimeCard key={movie.id} item={movie} type="movie" onClick={onSelectItem} />
              ))}
            </div>
          )}
        </section>

        {/* Popular Anime */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Star className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">Popular &amp; Masterpiece Anime</h2>
                <p className="text-[11px] sm:text-xs text-gray-400">All-time fan favorites</p>
              </div>
            </div>
            <button
              onClick={() => onViewAll('popular')}
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors group cursor-pointer"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-6">
            {popularAnime.map((item) => (
              <AnimeCard key={item.id} item={item} type="anime" onClick={onSelectItem} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
