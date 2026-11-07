import React from 'react';
import { Sparkles, Heart, Download } from 'lucide-react';

interface FooterProps {
  onOpenBloggerModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBloggerModal }) => {
  return (
    <footer className="bg-[#080810] border-t border-purple-900/30 text-gray-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-600/40">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-wider">ANIZENX</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            The ultimate anime streaming destination powered by ANIZENX and custom-designed with a premium dark purple neon UI for Google Blogger.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#home" className="hover:text-purple-400 transition-colors">Home Feed</a></li>
            <li><a href="#anime" className="hover:text-purple-400 transition-colors">All Anime Series</a></li>
            <li><a href="#movies" className="hover:text-purple-400 transition-colors">Anime Movies</a></li>
            <li><a href="#health" className="hover:text-purple-400 transition-colors">API Status</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Platform &amp; Integration</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-purple-400 font-medium">Live API:</span> anime-api-new.antideploy.app</li>
            <li><span className="text-purple-400 font-medium">Resolver:</span> Blakite Video Engine</li>
            <li><span className="text-purple-400 font-medium">Blogger:</span> XML Theme Compatible</li>
            <li><span className="text-purple-400 font-medium">Dub:</span> Hindi Dub / Sub Available</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Google Blogger Theme</h4>
          <p className="text-sm text-gray-400 mb-4">
            Download the complete production-ready Blogger XML theme to install on your Blogger blog.
          </p>
          <button
            onClick={onOpenBloggerModal}
            className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full justify-center"
          >
            <Download className="w-4 h-4" /> Get Blogger XML Theme
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-purple-900/20 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} ANIZENX. All rights reserved.</p>
        <p className="flex items-center gap-1 mt-2 sm:mt-0">
          Crafted with <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /> for Anime Fans &amp; Blogger Creators
        </p>
      </div>
    </footer>
  );
};
