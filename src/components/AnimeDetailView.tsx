import React, { useState, useEffect } from 'react';
import { Play, Star, Calendar, Tv, ArrowLeft, Layers, Film, ChevronDown } from 'lucide-react';
import { AnimeItem, SeasonInfo, EpisodeItem } from '../types';
import { fetchAnimeDetail, fetchAnimeSeasons, fetchAnimeEpisodes, fetchAnimeList } from '../services/api';
import { AnimeCard } from './AnimeCard';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface AnimeDetailViewProps {
  animeId: string;
  onBack: () => void;
  onSelectEpisode: (animeId: string, episodeId: string, episodeNumber: number, seasonNumber: number) => void;
  onSelectItem: (id: string, type: 'anime') => void;
}

const INITIAL_EPISODES_DISPLAY = 24;

export const AnimeDetailView: React.FC<AnimeDetailViewProps> = ({
  animeId,
  onBack,
  onSelectEpisode,
  onSelectItem,
}) => {
  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_EPISODES_DISPLAY);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [relatedAnime, setRelatedAnime] = useState<AnimeItem[]>([]);

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      setLoading(true);
      try {
        // Parallel fetch for anime detail and seasons info
        const [detail, seasonsData] = await Promise.all([
          fetchAnimeDetail(animeId),
          fetchAnimeSeasons(animeId),
        ]);

        if (!isCurrent) return;

        setAnime(detail);

        if (seasonsData.seasons.length > 0) {
          setSeasons(seasonsData.seasons);
          setSelectedSeason(seasonsData.seasons[0].season);
        } else {
          setSeasons([{ season: 1, episode_count: 25, status: 'Completed' }]);
          setSelectedSeason(1);
        }

        // Fetch related anime directly from fast cached catalog
        if (detail && detail.genres && detail.genres.length > 0) {
          fetchAnimeList(1, 7, '', detail.genres[0]).then((relatedRes) => {
            if (isCurrent && relatedRes.status) {
              setRelatedAnime(
                relatedRes.anime
                  .filter((a) => String(a.id) !== String(animeId))
                  .slice(0, 6)
              );
            }
          });
        }
      } catch (e) {
        console.error('Error loading anime detail:', e);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCurrent = false;
    };
  }, [animeId]);

  // Load episodes when animeId or selectedSeason changes
  useEffect(() => {
    let isCurrent = true;
    setVisibleCount(INITIAL_EPISODES_DISPLAY);

    async function loadEpisodes() {
      setEpisodesLoading(true);
      try {
        const eps = await fetchAnimeEpisodes(animeId, selectedSeason, 1, 100);
        if (isCurrent) {
          setEpisodes(eps);
        }
      } catch (e) {
        console.error('Error loading episodes:', e);
      } finally {
        if (isCurrent) setEpisodesLoading(false);
      }
    }

    if (animeId) {
      loadEpisodes();
    }

    return () => {
      isCurrent = false;
    };
  }, [animeId, selectedSeason]);

  if (loading || !anime) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-8 animate-pulse">
        <div className="w-full h-80 sm:h-96 bg-purple-950/20 rounded-3xl" />
      </div>
    );
  }

  const displayedEpisodes = episodes.slice(0, visibleCount);

  return (
    <div className="space-y-10 sm:space-y-12 pb-20">
      {/* Backdrop Header */}
      <div className="relative w-full h-[420px] sm:h-[550px] overflow-hidden bg-gray-950">
        <img
          src={getOptimizedImageUrl(anime.backdrop || anime.poster, 'backdrop')}
          alt={anime.title}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover filter brightness-50 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/60 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-12 z-20">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-black/60 backdrop-blur-md hover:bg-purple-600/30 text-white px-4 py-2 rounded-xl border border-purple-500/40 text-sm font-semibold transition-all cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="absolute bottom-8 sm:bottom-10 left-4 sm:left-12 right-4 sm:right-12 flex flex-col md:flex-row items-start md:items-end gap-6 sm:gap-8 z-20">
          <img
            src={getOptimizedImageUrl(anime.poster, 'large')}
            alt={anime.title}
            loading="eager"
            decoding="async"
            className="w-40 sm:w-56 aspect-[3/4] object-cover rounded-2xl shadow-2xl border-2 border-purple-500/40 hidden sm:block flex-shrink-0"
          />

          <div className="space-y-3 sm:space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                {anime.type || 'Series'} • {anime.status || 'Completed'}
              </span>
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-purple-500/40">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-xs sm:text-sm font-bold text-white">{anime.rating}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-300 text-xs sm:text-sm font-medium bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-900/40">
                <Calendar className="w-3.5 h-3.5" />
                <span>{anime.releaseDate ? anime.releaseDate.split('-')[0] : '2026'}</span>
              </div>
              <span className="bg-pink-600/20 text-pink-300 border border-pink-500/40 text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full">
                Hindi Dub / Sub
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
              {anime.title}
            </h1>

            <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3">
              {anime.synopsis}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {anime.genres?.map((g) => (
                <span
                  key={g}
                  className="text-[11px] sm:text-xs font-medium bg-purple-950/80 border border-purple-800/40 text-purple-300 px-2.5 py-0.5 rounded-lg"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Seasons & Episodes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Seasons Selector */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Layers className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">Seasons</h2>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {seasons.map((season) => (
              <button
                key={season.season}
                onClick={() => setSelectedSeason(season.season)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 border cursor-pointer ${
                  selectedSeason === season.season
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 shadow-xl shadow-purple-600/40 scale-105'
                    : 'bg-[#121222] text-gray-300 border-purple-900/30 hover:border-purple-500/40 hover:text-white'
                }`}
              >
                <span>Season {season.season}</span>
                <span className="text-[10px] sm:text-xs bg-black/40 px-2 py-0.5 rounded-full text-purple-200">
                  {season.episode_count || 25} Eps
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Episodes List */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Tv className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Season {selectedSeason} Episodes
              </h2>
            </div>
            <span className="text-[11px] sm:text-xs text-purple-400 font-semibold bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-900/40">
              Hindi Dub / Sub
            </span>
          </div>

          {episodesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="h-20 bg-purple-950/20 rounded-2xl border border-purple-900/30" />
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="p-10 text-center bg-[#121222] rounded-3xl border border-purple-900/30">
              <p className="text-gray-400 text-sm">No episodes found for Season {selectedSeason}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {displayedEpisodes.map((ep) => (
                  <div
                    key={ep.episodeId || ep.episode_number}
                    onClick={() =>
                      onSelectEpisode(
                        animeId,
                        ep.episodeId || `${selectedSeason}-${ep.episode_number}`,
                        ep.episode_number,
                        selectedSeason
                      )
                    }
                    className="group bg-[#121222] hover:bg-[#1a1a2e] border border-purple-900/30 hover:border-purple-500/60 p-3.5 sm:p-4 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between shadow-lg hover:shadow-xl hover:shadow-purple-600/20"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                        Episode {ep.episode_number}
                      </span>
                      <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-purple-300">
                        {ep.title || `Episode ${ep.episode_number}`}
                      </h3>
                      <span className="text-[10px] text-gray-400">Hindi Dub / Sub</span>
                    </div>

                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 group-hover:bg-gradient-to-tr group-hover:from-purple-600 group-hover:to-pink-600 flex items-center justify-center text-purple-300 group-hover:text-white transition-all shadow-md flex-shrink-0">
                      <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Incremental loading for large seasons to keep mobile DOM light */}
              {episodes.length > visibleCount && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    className="inline-flex items-center gap-1.5 bg-[#16162a] hover:bg-purple-600/30 text-purple-200 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-purple-500/30 transition-all cursor-pointer shadow-lg"
                  >
                    <ChevronDown className="w-4 h-4" /> Load More Episodes ({displayedEpisodes.length} / {episodes.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Anime Section */}
        {relatedAnime.length > 0 && (
          <div className="space-y-5 pt-8 border-t border-purple-900/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Film className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">You Might Also Like</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-6">
              {relatedAnime.map((item) => (
                <AnimeCard key={item.id} item={item} type="anime" onClick={(id) => onSelectItem(id, 'anime')} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
