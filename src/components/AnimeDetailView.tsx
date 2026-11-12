import React, { useState, useEffect } from 'react';
import { Play, Star, Calendar, Tv, ArrowLeft, Layers, Film, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { AnimeItem, SeasonInfo, EpisodeItem } from '../types';
import { fetchAnimeDetail, fetchMergedSeasons, fetchMergedEpisodes, fetchAnimeList } from '../services/api';
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
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      setLoading(true);
      try {
        // Parallel fetch for anime detail and merged seasons (API + Manual)
        const [detail, seasonsData] = await Promise.all([
          fetchAnimeDetail(animeId),
          fetchMergedSeasons(animeId),
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

  // Load merged episodes (API + Manual, deduplicated with manual priority)
  useEffect(() => {
    let isCurrent = true;
    setVisibleCount(INITIAL_EPISODES_DISPLAY);

    async function loadEpisodes() {
      setEpisodesLoading(true);
      try {
        const { episodes: eps } = await fetchMergedEpisodes(animeId, selectedSeason);
        if (isCurrent) {
          setEpisodes(eps);
          // Immediately synchronize active season badge count with actual merged episodes
          setSeasons((prevSeasons) =>
            prevSeasons.map((s) =>
              s.season === selectedSeason ? { ...s, episode_count: eps.length } : s
            )
          );
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
        <div className="w-full h-80 sm:h-96 bg-purple-950/20 rounded-3xl border border-purple-900/30" />
      </div>
    );
  }

  const displayedEpisodes = episodes.slice(0, visibleCount);

  return (
    <div className="space-y-8 sm:space-y-12 pb-20">
      {/* Cinematic Hero Details Section */}
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] overflow-hidden bg-[#0b0b14] border-b border-purple-900/30">
        {/* Background Backdrop Image */}
        <img
          src={getOptimizedImageUrl(anime.backdrop || anime.poster, 'backdrop')}
          alt={anime.title}
          loading="eager"
          decoding="async"
          className="w-full h-full absolute inset-0 object-cover filter brightness-100 contrast-105 scale-105"
        />
        {/* Balanced Dark Gradient Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b14] via-[#0b0b14]/60 to-transparent" />

        {/* Back Navigation Button */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-12 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-md hover:bg-purple-600/40 text-white px-3.5 py-2 rounded-xl border border-purple-500/40 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-lg active:scale-95 select-none"
          >
            <ArrowLeft className="w-4 h-4 text-purple-400" /> Back
          </button>
        </div>

        {/* Hero Content Grid: Small Poster + Details */}
        <div className="relative z-20 pt-16 sm:pt-20 pb-8 px-4 sm:px-12 max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-5 sm:gap-8">
          {/* Small Poster Card */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <img
              src={getOptimizedImageUrl(anime.poster, 'medium')}
              alt={anime.title}
              loading="eager"
              decoding="async"
              className="w-32 sm:w-48 aspect-[3/4] object-cover rounded-2xl shadow-2xl shadow-purple-950/80 border-2 border-purple-500/40 transform hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Details Column */}
          <div className="space-y-3 sm:space-y-4 max-w-3xl flex-1">
            {/* Aligned Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-600/30">
                {anime.type || 'Series'} • {anime.status || 'Completed'}
              </span>
              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-purple-500/40 text-xs font-bold text-white shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span>{anime.rating || '8.5'}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-200 text-xs font-semibold bg-purple-950/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-purple-500/30">
                <Calendar className="w-3.5 h-3.5 text-pink-400" />
                <span>{anime.releaseDate ? anime.releaseDate.split('-')[0] : '2026'}</span>
              </div>
              <span className="bg-pink-600/20 text-pink-300 border border-pink-500/40 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                Hindi Dub / Sub
              </span>
            </div>

            {/* Prominent Anime Title */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] leading-tight">
              {anime.title}
            </h1>

            {/* Synopsis with Expand/Collapse Toggle */}
            <div className="space-y-1">
              <p className={`text-gray-200 text-xs sm:text-sm leading-relaxed drop-shadow ${!isSynopsisExpanded ? 'line-clamp-3' : ''}`}>
                {anime.synopsis || 'Experience the ultimate anime streaming adventure with high-definition audio options in Hindi Dub and Sub on KUROIWA.'}
              </p>
              {anime.synopsis && anime.synopsis.length > 150 && (
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

            {/* Modern Genre Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {anime.genres?.map((g) => (
                <span
                  key={g}
                  className="text-[11px] sm:text-xs font-semibold bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/30 text-purple-200 px-3 py-1 rounded-xl transition-colors backdrop-blur-md"
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
        {/* Seasons Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Layers className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">Seasons</h2>
          </div>

          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {seasons.map((season) => {
              const count =
                season.season === selectedSeason && !episodesLoading
                  ? episodes.length
                  : (season.episode_count ?? 0);
              const isSelected = selectedSeason === season.season;
              return (
                <button
                  key={season.season}
                  onClick={() => setSelectedSeason(season.season)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 shadow-xl shadow-purple-600/40 scale-105 ring-2 ring-pink-500/30'
                      : 'bg-[#121222]/90 text-gray-300 border-purple-900/40 hover:border-purple-500/50 hover:text-white hover:bg-[#1a1a32]'
                  }`}
                >
                  <span>Season {season.season}</span>
                  <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-black/40 text-pink-200' : 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                  }`}>
                    {count} Eps
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Episodes Section */}
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
            <span className="text-[11px] sm:text-xs text-purple-300 font-bold bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/30">
              Hindi Dub / Sub
            </span>
          </div>

          {episodesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} className="aspect-[16/9] bg-purple-950/20 rounded-2xl border border-purple-900/30" />
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="p-10 text-center bg-[#121222] rounded-3xl border border-purple-900/30">
              <p className="text-gray-400 text-sm">No episodes found for Season {selectedSeason}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Episodes Grid: 2 columns on mobile */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
                    className="group relative bg-[#121222] hover:bg-[#1a1a32] border border-purple-900/40 hover:border-purple-500/70 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col shadow-lg hover:shadow-xl hover:shadow-purple-600/25 transform hover:-translate-y-1 active:scale-95"
                  >
                    {/* Thumbnail Frame */}
                    <div className="relative aspect-[16/9] w-full bg-black/60 overflow-hidden">
                      <img
                        src={getOptimizedImageUrl(anime.backdrop || anime.poster, 'medium')}
                        alt={ep.title || `Episode ${ep.episode_number}`}
                        loading="lazy"
                        className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121222] via-transparent to-black/30" />
                      
                      {/* Play Icon Overlay on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Episode Badge */}
                      <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md border border-purple-500/30">
                        EP {ep.episode_number}
                      </span>

                      {/* Source Tag (MANUAL / API) */}
                      {ep.isManual && (
                        <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm">
                          CUSTOM
                        </span>
                      )}
                    </div>

                    {/* Card Footer Info */}
                    <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 space-y-1">
                      <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-purple-300 transition-colors">
                        {ep.title || `Episode ${ep.episode_number}`}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="text-purple-400 font-semibold">Hindi Dub</span>
                        <span className="text-gray-500">HD</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {episodes.length > visibleCount && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    className="inline-flex items-center gap-1.5 bg-[#16162a] hover:bg-purple-600/30 text-purple-200 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-purple-500/40 transition-all cursor-pointer shadow-lg hover:border-purple-400"
                  >
                    <ChevronDown className="w-4 h-4 text-purple-400" /> Load More Episodes ({displayedEpisodes.length} / {episodes.length})
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
