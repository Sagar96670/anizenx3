import React, { useState } from 'react';
import { Film, Search, Menu, X, Sparkles, Download, Home, Tv, Clapperboard, Shield, Trophy } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string, id?: string) => void;
  onSearch: (query: string) => void;
  onOpenBloggerModal: () => void;
  genres: string[];
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onSearch,
  onOpenBloggerModal,
  genres,
  selectedGenre,
  setSelectedGenre,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setCurrentTab('anime-list');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0b0b14]/90 backdrop-blur-xl border-b border-purple-900/30 shadow-2xl shadow-purple-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => setCurrentTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-600/40 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-purple-200 to-pink-400 bg-clip-text text-transparent">
              ANIZENX
            </span>
            <span className="block text-[10px] tracking-widest text-purple-400 font-semibold uppercase">
              Streaming &amp; Blogger Theme
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          <button
            onClick={() => setCurrentTab('home')}
            className={`flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'home' ? 'text-purple-400 font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" /> Home
          </button>
          <button
            onClick={() => {
              setSelectedGenre('');
              setCurrentTab('anime-list');
            }}
            className={`flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'anime-list' ? 'text-purple-400 font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" /> Anime Series
          </button>
          <button
            onClick={() => setCurrentTab('movie-list')}
            className={`flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'movie-list' ? 'text-purple-400 font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Clapperboard className="w-4 h-4" /> Movies
          </button>
          <button
            onClick={() => setCurrentTab('rankings')}
            className={`flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'rankings' ? 'text-amber-400 font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" /> Rankings
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer px-2.5 py-1 rounded-lg border ${
              currentTab === 'admin'
                ? 'bg-purple-600/30 text-pink-300 border-pink-500/50 font-semibold shadow-md shadow-purple-900/40'
                : 'text-gray-300 border-purple-900/30 hover:border-purple-500/40 hover:text-pink-300 hover:bg-purple-950/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-pink-400" /> Admin
          </button>

          {/* Genres Dropdown */}
          <div className="relative">
            <button
              onClick={() => setGenresOpen(!genresOpen)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
            >
              Genres <span className="text-xs text-purple-400">▼</span>
            </button>
            {genresOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#121222] border border-purple-500/30 rounded-xl shadow-2xl shadow-purple-950/80 py-2 max-h-80 overflow-y-auto z-50">
                <button
                  onClick={() => {
                    setSelectedGenre('');
                    setCurrentTab('anime-list');
                    setGenresOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-purple-600/20 hover:text-purple-300 transition-colors"
                >
                  All Genres
                </button>
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGenre(g);
                      setCurrentTab('anime-list');
                      setGenresOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedGenre === g ? 'bg-purple-600/30 text-purple-300 font-semibold' : 'text-gray-300 hover:bg-purple-600/20 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right Actions: Search & Blogger Theme Exporter */}
        <div className="hidden lg:flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search anime, movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-60 bg-[#141428] border border-purple-500/30 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-purple-400" />
          </form>

          <button
            onClick={onOpenBloggerModal}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg shadow-purple-600/30 transition-all transform hover:scale-105"
          >
            <Download className="w-4 h-4" /> Blogger Theme XML
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={onOpenBloggerModal}
            className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300"
            title="Blogger XML Theme"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0e0e1a] border-b border-purple-900/40 px-4 pt-2 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <input
              type="text"
              placeholder="Search anime, movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141428] border border-purple-500/30 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-purple-400" />
          </form>

          <button
            onClick={() => {
              setCurrentTab('home');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-purple-600/20"
          >
            Home
          </button>
          <button
            onClick={() => {
              setSelectedGenre('');
              setCurrentTab('anime-list');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-purple-600/20"
          >
            Anime Series
          </button>
          <button
            onClick={() => {
              setCurrentTab('movie-list');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-200 hover:bg-purple-600/20"
          >
            Movies
          </button>
          <button
            onClick={() => {
              setCurrentTab('rankings');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-base font-medium text-amber-300 hover:bg-purple-600/20"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Top Rankings</span>
          </button>
          <button
            onClick={() => {
              setCurrentTab('admin');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-base font-medium text-pink-300 hover:bg-purple-600/20 bg-purple-950/40 border border-purple-500/30"
          >
            <Shield className="w-4 h-4 text-pink-400" />
            <span>Episode Admin</span>
          </button>
          <div className="pt-2 border-t border-purple-900/30">
            <p className="text-xs font-semibold text-purple-400 px-3 mb-2 uppercase tracking-wider">Genres</p>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto px-1">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setSelectedGenre(g);
                    setCurrentTab('anime-list');
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-1.5 rounded text-xs text-gray-300 hover:bg-purple-600/20 truncate"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
