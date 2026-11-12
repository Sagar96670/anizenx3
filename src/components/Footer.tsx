import React, { useState } from 'react';
import { ShieldAlert, Heart } from 'lucide-react';
import { KuroiwaLogo } from './KuroiwaLogo';

interface FooterProps {
  onOpenBloggerModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateTab }) => {
  const [modalType, setModalType] = useState<'contact' | 'report' | 'privacy' | null>(null);

  const handleNavClick = (tab: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#070712] border-t border-purple-900/40 text-gray-400 py-10 sm:py-12 px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24 select-none">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10">
          
          {/* Column 1: KUROIWA Branding & Short Description */}
          <div className="md:col-span-5 space-y-3.5">
            <KuroiwaLogo size="md" />
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm">
              Your ultimate destination for anime streaming and discovering your favorite anime series.
            </p>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider text-purple-300">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <a
                  href="#home"
                  onClick={(e) => handleNavClick('home', e)}
                  className="hover:text-pink-400 transition-colors cursor-pointer"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#anime-series"
                  onClick={(e) => handleNavClick('anime-list', e)}
                  className="hover:text-pink-400 transition-colors cursor-pointer"
                >
                  Anime Series
                </a>
              </li>
              <li>
                <a
                  href="#anime-movies"
                  onClick={(e) => handleNavClick('movie-list', e)}
                  className="hover:text-pink-400 transition-colors cursor-pointer"
                >
                  Anime Movies
                </a>
              </li>
              <li>
                <a
                  href="#latest-updates"
                  onClick={(e) => handleNavClick('home', e)}
                  className="hover:text-pink-400 transition-colors cursor-pointer"
                >
                  Latest Updates
                </a>
              </li>
              <li>
                <a
                  href="#trending-anime"
                  onClick={(e) => handleNavClick('rankings', e)}
                  className="hover:text-pink-400 transition-colors cursor-pointer"
                >
                  Trending Anime
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Support & Legal Links */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider text-purple-300">
              Support &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => setModalType('contact')}
                  className="hover:text-purple-300 transition-colors cursor-pointer text-left"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setModalType('report')}
                  className="hover:text-purple-300 transition-colors cursor-pointer text-left"
                >
                  Report a Problem
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setModalType('privacy')}
                  className="hover:text-purple-300 transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer / Content Source Notice */}
        <div className="bg-[#0d0d1a] border border-purple-900/30 rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-pink-500 flex-shrink-0" />
            <span>Content Disclaimer &amp; Notice</span>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
            KUROIWA is an anime discovery and streaming interface that uses third-party sources and services to provide anime information and streaming links. Anime titles, posters, metadata and streaming availability may be provided by external platforms. KUROIWA does not claim ownership of third-party content. All trademarks and copyrights belong to their respective owners.
          </p>
        </div>

        {/* Copyright */}
        <div className="pt-4 border-t border-purple-900/20 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <p>&copy; 2026 KUROIWA. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /> for Anime Fans
          </p>
        </div>
      </div>

      {/* Support Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121222] border border-purple-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {modalType === 'contact' && 'Contact Us'}
              {modalType === 'report' && 'Report a Problem'}
              {modalType === 'privacy' && 'Privacy Policy'}
            </h3>

            {modalType === 'contact' && (
              <p className="text-xs text-gray-300 leading-relaxed">
                Have questions or feedback? You can reach out to the KUROIWA team for support or community suggestions.
              </p>
            )}

            {modalType === 'report' && (
              <p className="text-xs text-gray-300 leading-relaxed">
                Found a broken stream, incorrect episode, or missing title? Report it and our team will update the catalog.
              </p>
            )}

            {modalType === 'privacy' && (
              <p className="text-xs text-gray-300 leading-relaxed">
                KUROIWA respects your privacy. Session data and local storage are used exclusively to remember watch preferences. We do not store personal tracking data.
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
