import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimeItem } from '../types';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface FeaturedHeroSliderProps {
  items: AnimeItem[];
  onSelectItem: (id: string, type: 'anime' | 'movie') => void;
}

export const FeaturedHeroSlider: React.FC<FeaturedHeroSliderProps> = ({ items, onSelectItem }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Auto-slide every 6 seconds if not hovered
  useEffect(() => {
    if (items.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [items.length, isHovered]);

  if (!items || items.length === 0) return null;

  const currentAnime = items[currentIndex];

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:max-h-[380px] rounded-2xl border border-purple-500/30 overflow-hidden bg-[#0b0b14] shadow-2xl shadow-purple-950/60 group select-none transition-all duration-300"
    >
      {/* Background Anime Image - Brightened & Clearly Visible */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          key={`bg-${currentAnime.id}`}
          src={getOptimizedImageUrl(currentAnime.backdrop || currentAnime.poster, 'backdrop')}
          alt={currentAnime.title}
          className="w-full h-full object-cover filter brightness-100 contrast-105 transition-opacity transition-transform duration-700 ease-out transform scale-100 group-hover:scale-105"
          loading="eager"
        />
        {/* Balanced Dark Gradient Scrim - Keeps text readable while leaving background art vibrant */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b14]/85 via-[#0b0b14]/40 to-transparent" />
      </div>

      {/* Center Hover Play Button (YouTube Video Player Style) */}
      <div
        onClick={() => onSelectItem(currentAnime.id, 'anime')}
        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer pointer-events-auto"
      >
        <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-xl shadow-purple-600/50 transform scale-90 group-hover:scale-105 transition-all opacity-85 group-hover:opacity-100 ring-2 ring-white/20">
          <Play className="w-5 h-5 sm:w-8 sm:h-8 fill-white ml-0.5" />
        </div>
      </div>

      {/* Bottom Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-5 flex flex-col justify-end space-y-1.5 sm:space-y-2 pointer-events-none">
        {/* Spotlight Kicker & Quality Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            — #{currentIndex + 1} SPOTLIGHT
          </span>
          <span className="bg-amber-500/25 text-amber-300 border border-amber-500/50 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase shadow-sm">
            HD
          </span>
          <span className="bg-purple-900/70 text-purple-200 border border-purple-500/40 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold backdrop-blur-md shadow-sm">
            Hindi Dub
          </span>
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded border border-purple-500/40 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span>{currentAnime.rating || '8.5'}</span>
          </div>
        </div>

        {/* Prominent & Readable Anime Title */}
        <h1
          key={`title-${currentAnime.id}`}
          onClick={() => onSelectItem(currentAnime.id, 'anime')}
          className="text-sm sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] cursor-pointer pointer-events-auto hover:text-purple-300 transition-colors animate-fadeIn"
        >
          {currentAnime.title}
        </h1>

        {/* Short Synopsis (Max 1-2 lines on desktop/tablet) */}
        <p
          key={`synopsis-${currentAnime.id}`}
          className="text-gray-200 text-[11px] sm:text-xs leading-tight line-clamp-1 sm:line-clamp-2 max-w-xl drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] hidden sm:block font-medium"
        >
          {currentAnime.synopsis || 'Streaming in full High Definition with multi-audio options on KUROIWA.'}
        </p>

        {/* Action Buttons: Watch Now & Details - Single Row on Mobile */}
        <div className="flex flex-row items-center gap-2 pt-0.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => onSelectItem(currentAnime.id, 'anime')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-lg shadow-purple-600/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer text-[11px] sm:text-xs tracking-wide whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Watch Now
          </button>

          <button
            type="button"
            onClick={() => onSelectItem(currentAnime.id, 'anime')}
            className="flex items-center gap-1.5 bg-[#141428]/90 hover:bg-[#1f1f3a] text-purple-200 font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-purple-500/40 backdrop-blur-md transition-all active:scale-95 cursor-pointer text-[11px] sm:text-xs whitespace-nowrap shrink-0"
          >
            <Info className="w-3.5 h-3.5 text-purple-400" /> Details
          </button>
        </div>
      </div>

      {/* Neat Slider Manual Arrows & Dot Navigation */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-purple-600/90 border border-purple-500/40 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-70 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
            title="Previous Spotlight"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-purple-600/90 border border-purple-500/40 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-70 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
            title="Next Spotlight"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Clean Bottom Right Dot Indicators */}
          <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-4 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-purple-500/30 shadow-md">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-4 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
