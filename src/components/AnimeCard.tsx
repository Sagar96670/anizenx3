import React, { useState } from 'react';
import { Star, Play, Clapperboard } from 'lucide-react';
import { AnimeItem, MovieItem } from '../types';
import { getOptimizedImageUrl, getPosterSrcSet, CARD_IMAGE_SIZES } from '../utils/imageOptimizer';

interface AnimeCardProps {
  item: AnimeItem | MovieItem;
  type?: 'anime' | 'movie';
  onClick: (id: string, type: 'anime' | 'movie') => void;
  priority?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = React.memo(({
  item,
  type = 'anime',
  onClick,
  priority = false,
}) => {
  const isMovie = type === 'movie' || item.type === 'Movie';
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(String(item.id), isMovie ? 'movie' : 'anime');
  };

  const optimizedPoster = getOptimizedImageUrl(item.poster, 'medium');
  const srcSet = getPosterSrcSet(item.poster);

  return (
    <div
      onClick={handleClick}
      className="group relative bg-[#121222] rounded-2xl overflow-hidden border border-purple-900/30 hover:border-purple-500/60 shadow-lg hover:shadow-2xl hover:shadow-purple-600/30 transition-all duration-300 cursor-pointer flex flex-col h-full transform hover:-translate-y-1.5 select-none will-change-transform"
    >
      {/* Poster Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-purple-950/20">
        {/* Placeholder skeleton while image decodes */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-purple-950/30 animate-pulse pointer-events-none" />
        )}

        <img
          src={optimizedPoster}
          srcSet={srcSet}
          sizes={CARD_IMAGE_SIZES}
          alt={item.title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 pointer-events-none ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-transparent to-transparent opacity-80 pointer-events-none" />

        {/* Rating Badge */}
        {item.rating && (
          <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md border border-purple-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg pointer-events-none">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-[11px] font-bold text-white">{item.rating}</span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2.5 left-2.5 bg-purple-600/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider shadow-lg pointer-events-none">
          {isMovie ? 'Movie' : item.status || 'Series'}
        </div>

        {/* Play Overlay Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/50 transform scale-75 group-hover:scale-100 transition-transform">
            {isMovie ? <Clapperboard className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow justify-between bg-gradient-to-b from-[#121222] to-[#0f0f1a]">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base line-clamp-1 group-hover:text-purple-300 transition-colors">
            {item.title}
          </h3>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.genres?.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[9px] font-medium bg-purple-950/80 border border-purple-800/40 text-purple-300 px-1.5 py-0.5 rounded"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-purple-900/20 text-[11px] text-gray-400 font-medium">
          <span>{item.releaseDate ? item.releaseDate.split('-')[0] : '2026'}</span>
          <span className="text-purple-400 group-hover:underline">
            {isMovie ? 'Watch Movie →' : 'Episodes →'}
          </span>
        </div>
      </div>
    </div>
  );
});
