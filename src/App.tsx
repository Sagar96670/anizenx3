import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { AnimeListView } from './components/AnimeListView';
import { MovieListView } from './components/MovieListView';
import { AnimeDetailView } from './components/AnimeDetailView';
import { MovieDetailView } from './components/MovieDetailView';
import { PlayerView } from './components/PlayerView';
import { BloggerThemeModal } from './components/BloggerThemeModal';

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
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('1-1');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bloggerModalOpen, setBloggerModalOpen] = useState<boolean>(false);

  const handleSelectItem = (id: string, type: 'anime' | 'movie') => {
    if (type === 'anime') {
      setSelectedAnimeId(id);
      setCurrentTab('anime-detail');
    } else {
      setSelectedMovieId(id);
      setCurrentTab('movie-detail');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectEpisode = (animeId: string, episodeId: string, episodeNumber: number, seasonNumber: number) => {
    setSelectedAnimeId(animeId);
    setSelectedEpisodeId(episodeId);
    setCurrentTab('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWatchMovie = (movieId: string) => {
    setSelectedMovieId(movieId);
    // For movies, we can also use player or movie detail view. Let's route to player or movie watch.
    // The prompt specifies movie detail and watch movie button.
    setCurrentTab('movie-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0b0b14] text-gray-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Sticky Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSearch={(query) => {
          setSearchQuery(query);
          setCurrentTab('anime-list');
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
            onViewAll={(category) => {
              if (category === 'movies') {
                setCurrentTab('movie-list');
              } else {
                setCurrentTab('anime-list');
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
            onBack={() => setCurrentTab('home')}
            onSelectEpisode={handleSelectEpisode}
            onSelectItem={handleSelectItem}
          />
        )}

        {currentTab === 'movie-detail' && (
          <MovieDetailView
            movieId={selectedMovieId}
            onBack={() => setCurrentTab('home')}
            onWatchMovie={handleWatchMovie}
          />
        )}

        {currentTab === 'player' && (
          <PlayerView
            animeId={selectedAnimeId}
            episodeId={selectedEpisodeId}
            onBack={() => setCurrentTab('anime-detail')}
            onNavigateEpisode={(newEpId) => setSelectedEpisodeId(newEpId)}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onOpenBloggerModal={() => setBloggerModalOpen(true)} />

      {/* Blogger XML Theme Modal */}
      <BloggerThemeModal
        isOpen={bloggerModalOpen}
        onClose={() => setBloggerModalOpen(false)}
      />
    </div>
  );
}
