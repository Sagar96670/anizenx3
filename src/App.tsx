import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { AnimeListView } from './components/AnimeListView';
import { MovieListView } from './components/MovieListView';
import { AnimeDetailView } from './components/AnimeDetailView';
import { MovieDetailView } from './components/MovieDetailView';
import { PlayerView } from './components/PlayerView';
import { BloggerThemeModal } from './components/BloggerThemeModal';
import { AdminPanel } from './components/AdminPanel';
import { TopRankingsSection } from './components/TopRankingsSection';

const GENRES = [
  'Animation',
  'Sci-Fi & Fantasy',
  'Action & Adventure',
  'Adventure',
  'Fantasy',
  'Drama',
  'Comedy',
  'Thriller',
  'Mystery',
  'Romance',
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [previousCatalogTab, setPreviousCatalogTab] = useState<string>('home');
  const [mediaType, setMediaType] = useState<'anime' | 'movie'>('anime');
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('1-1');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bloggerModalOpen, setBloggerModalOpen] = useState<boolean>(false);

  // Sync state with URL search parameters
  const updateUrl = (params: Record<string, string | null>, replace = false) => {
    try {
      const url = new URL(window.location.href);
      Object.entries(params).forEach(([key, val]) => {
        if (val === null) {
          url.searchParams.delete(key);
        } else {
          url.searchParams.set(key, val);
        }
      });
      if (replace) {
        window.history.replaceState({}, '', url.toString());
      } else {
        window.history.pushState({}, '', url.toString());
      }
    } catch {
      // Fallback if URL manipulation fails in sandbox
    }
  };

  // Parse URL on mount and popstate
  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const watchMovieParam = params.get('watch-movie') || params.get('play-movie');
        const watchAnimeParam = params.get('watch-anime') || params.get('play-anime');
        const movieParam = params.get('movie') || params.get('movieId');
        const animeParam = params.get('anime') || params.get('animeId');
        const tabParam = params.get('tab');

        if (watchMovieParam) {
          setSelectedMovieId(watchMovieParam);
          setMediaType('movie');
          setSelectedEpisodeId('0');
          setCurrentTab('player');
        } else if (watchAnimeParam) {
          setSelectedAnimeId(watchAnimeParam);
          setMediaType('anime');
          const ep = params.get('ep') || '1-1';
          setSelectedEpisodeId(ep);
          setCurrentTab('player');
        } else if (movieParam) {
          setSelectedMovieId(movieParam);
          setMediaType('movie');
          setCurrentTab('movie-detail');
        } else if (animeParam) {
          setSelectedAnimeId(animeParam);
          setMediaType('anime');
          setCurrentTab('anime-detail');
        } else if (tabParam) {
          setCurrentTab(tabParam);
        } else {
          setCurrentTab('home');
        }
      } catch {
        setCurrentTab('home');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleSelectItem = (id: string, type: 'anime' | 'movie') => {
    const cleanId = String(id);
    if (['home', 'anime-list', 'movie-list', 'rankings'].includes(currentTab)) {
      setPreviousCatalogTab(currentTab);
    }
    if (type === 'anime') {
      setSelectedAnimeId(cleanId);
      setMediaType('anime');
      setCurrentTab('anime-detail');
      updateUrl({
        anime: cleanId,
        movie: null,
        'watch-movie': null,
        'watch-anime': null,
        ep: null,
        tab: 'anime-detail',
      });
    } else {
      setSelectedMovieId(cleanId);
      setMediaType('movie');
      setCurrentTab('movie-detail');
      updateUrl({
        movie: cleanId,
        anime: null,
        'watch-movie': null,
        'watch-anime': null,
        ep: null,
        tab: 'movie-detail',
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectEpisode = (animeId: string, episodeId: string, episodeNumber: number, seasonNumber: number) => {
    const cleanAnimeId = String(animeId);
    setSelectedAnimeId(cleanAnimeId);
    setSelectedEpisodeId(episodeId);
    setMediaType('anime');
    setCurrentTab('player');
    updateUrl({
      'watch-anime': cleanAnimeId,
      ep: episodeId,
      'watch-movie': null,
      movie: null,
      anime: null,
      tab: 'player',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWatchMovie = (movieId: string) => {
    const cleanMovieId = String(movieId);
    setSelectedMovieId(cleanMovieId);
    setMediaType('movie');
    setSelectedEpisodeId('0');
    setCurrentTab('player');
    updateUrl({
      'watch-movie': cleanMovieId,
      'watch-anime': null,
      movie: null,
      anime: null,
      tab: 'player',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0b0b14] text-gray-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Sticky Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (['home', 'anime-list', 'movie-list', 'rankings'].includes(tab)) {
            setPreviousCatalogTab(tab);
          }
          setCurrentTab(tab);
          updateUrl({
            tab,
            movie: null,
            anime: null,
            'watch-movie': null,
            'watch-anime': null,
            ep: null,
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSearch={(query) => {
          setSearchQuery(query);
          setPreviousCatalogTab('anime-list');
          setCurrentTab('anime-list');
          updateUrl({
            tab: 'anime-list',
            movie: null,
            anime: null,
            'watch-movie': null,
            'watch-anime': null,
            ep: null,
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenBloggerModal={() => setBloggerModalOpen(true)}
        genres={GENRES}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
      />

      {/* Main View Router */}
      <main className="flex-grow">
        {currentTab === 'home' && (
          <HomeView
            onSelectItem={handleSelectItem}
            onSelectEpisode={handleSelectEpisode}
            onViewAll={(category) => {
              if (category === 'movies') {
                setPreviousCatalogTab('movie-list');
                setCurrentTab('movie-list');
                updateUrl({ tab: 'movie-list', movie: null, anime: null, 'watch-movie': null, 'watch-anime': null, ep: null });
              } else {
                setPreviousCatalogTab('anime-list');
                setCurrentTab('anime-list');
                updateUrl({ tab: 'anime-list', movie: null, anime: null, 'watch-movie': null, 'watch-anime': null, ep: null });
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'anime-list' && (
          <AnimeListView
            onSelectItem={handleSelectItem}
            genres={GENRES}
            initialGenre={selectedGenre}
            initialSearch={searchQuery}
          />
        )}

        {currentTab === 'movie-list' && (
          <MovieListView
            onSelectItem={handleSelectItem}
          />
        )}

        {currentTab === 'anime-detail' && (
          <AnimeDetailView
            animeId={selectedAnimeId}
            onBack={() => {
              const targetTab = ['home', 'anime-list', 'movie-list', 'rankings'].includes(previousCatalogTab)
                ? previousCatalogTab
                : 'home';
              setCurrentTab(targetTab);
              updateUrl({
                tab: targetTab,
                anime: null,
                movie: null,
                'watch-movie': null,
                'watch-anime': null,
                ep: null,
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectEpisode={handleSelectEpisode}
            onSelectItem={handleSelectItem}
          />
        )}

        {currentTab === 'movie-detail' && (
          <MovieDetailView
            movieId={selectedMovieId}
            onBack={() => {
              const targetTab = ['home', 'anime-list', 'movie-list', 'rankings'].includes(previousCatalogTab)
                ? previousCatalogTab
                : 'movie-list';
              setCurrentTab(targetTab);
              updateUrl({
                tab: targetTab,
                anime: null,
                movie: null,
                'watch-movie': null,
                'watch-anime': null,
                ep: null,
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onWatchMovie={handleWatchMovie}
            onSelectItem={handleSelectItem}
          />
        )}

        {currentTab === 'player' && (
          <PlayerView
            mediaType={mediaType}
            animeId={mediaType === 'movie' ? selectedMovieId : selectedAnimeId}
            episodeId={mediaType === 'movie' ? '0' : selectedEpisodeId}
            onBack={() => {
              if (mediaType === 'movie') {
                setCurrentTab('movie-detail');
                updateUrl({ movie: selectedMovieId, 'watch-movie': null, ep: null, tab: 'movie-detail' }, true);
              } else {
                setCurrentTab('anime-detail');
                updateUrl({ anime: selectedAnimeId, 'watch-anime': null, ep: null, tab: 'anime-detail' }, true);
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateEpisode={(newEpId) => {
              setSelectedEpisodeId(newEpId);
              updateUrl({
                'watch-anime': selectedAnimeId,
                ep: newEpId,
              });
            }}
          />
        )}

        {currentTab === 'rankings' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <TopRankingsSection onSelectItem={handleSelectItem} />
          </div>
        )}

        {currentTab === 'admin' && (
          <AdminPanel
            onBack={() => {
              setCurrentTab('home');
              updateUrl({ tab: 'home' });
            }}
            onOpenPlayer={(animeId, episodeId) => {
              setSelectedAnimeId(animeId);
              setSelectedEpisodeId(episodeId);
              setMediaType('anime');
              setCurrentTab('player');
              updateUrl({
                'watch-anime': animeId,
                ep: episodeId,
                tab: 'player',
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenBloggerModal={() => setBloggerModalOpen(true)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          updateUrl({ tab, anime: null, movie: null, 'watch-movie': null, 'watch-anime': null });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Blogger XML Theme Modal */}
      <BloggerThemeModal
        isOpen={bloggerModalOpen}
        onClose={() => setBloggerModalOpen(false)}
      />
    </div>
  );
}
