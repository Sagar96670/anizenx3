import React, { useState, useEffect } from 'react';
import { Play, Info, Star, ChevronRight, TrendingUp, Sparkles, Clapperboard, RefreshCw } from 'lucide-react';
import { AnimeItem, MovieItem } from '../types';
import { AnimeCard } from './AnimeCard';
import { LatestUpdatesSection } from './LatestUpdatesSection';
import { TopRankingsSection } from './TopRankingsSection';
import { FeaturedHeroSlider } from './FeaturedHeroSlider';
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
  onSelectEpisode?: (animeId: string, episodeId: string, episodeNumber: number, seasonNumber: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectItem, onViewAll, onSelectEpisode }) => {
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

  const featuredAnimeList = animeList.slice(0, 6);
  const trendingAnime = animeList.slice(1, 11);
  const latestAnime = animeList.slice(11, 21);
  const popularAnime = animeList.slice(21, 31);
  const latestMovies = movieList.slice(0, 10);

  // Full-screen loading skeleton ONLY if absolutely no cached anime exists yet
  if (loadingAnime && animeList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-pulse">
        <div className="w-full h-[490px] sm:h-[440px] lg:h-[460px] bg-purple-950/20 rounded-3xl border border-purple-900/30" />
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
    <div className="space-y-8 sm:space-y-12 pb-20">
      {/* Featured Anime Multi-Slide Hero Banner Section (YouTube Player Style 16:9) */}
      {featuredAnimeList.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
          <FeaturedHeroSlider items={featuredAnimeList} onSelectItem={onSelectItem} />
        </div>
      )}

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
        {/* AUTOMATIC LATEST ANIME UPDATES FEED */}
        <LatestUpdatesSection
          onSelectItem={onSelectItem}
          onSelectEpisode={onSelectEpisode}
          onViewAll={() => onViewAll('anime')}
        />

        {/* AUTOMATIC TOP ANIME RANKINGS BOARD */}
        <TopRankingsSection
          onSelectItem={onSelectItem}
          onViewAll={() => onViewAll('anime')}
        />

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
