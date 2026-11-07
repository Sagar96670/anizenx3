import React from 'react';
import { Star, Play, Clapperboard } from 'lucide-react';
import { AnimeItem, MovieItem } from '../types';

interface AnimeCardProps {
  item: AnimeItem | MovieItem;
  type?: 'anime' | 'movie';
  onClick: (id: string, type: 'anime' | 'movie') => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ item, type = 'anime', onClick }) => {
  const isMovie = type === 'movie' || item.type === 'Movie';

  return (
    <div
      onClick={() => onClick(item.id, isMovie ? 'movie' : 'anime')}
      className="group relative bg-[#121222] rounded-2xl overflow-hidden border border-purple-900/30 hover:border-purple-500/60 shadow-lg hover:shadow-2xl hover:shadow-purple-600/30 transition-all duration-300 cursor-pointer flex flex-col h-full transform hover:-translate-y-1.5"
    >
      {/* Poster Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-900">
        <img
          src={item.poster || 'https://image.tmdb.org/t/p/w500/hqRb1wyIVsaMukZElPBUXoJPqrR.jpg'}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-transparent to-transparent opacity-80" />

        {/* Rating Badge */}
        {item.rating && (
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md border border-purple-500/40 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-white">{item.rating}</span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-3 left-3 bg-purple-600/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
          {isMovie ? 'Movie' : item.status || 'Series'}
        </div>

        {/* Play Overlay Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-600/50 transform scale-75 group-hover:scale-100 transition-transform">
            {isMovie ? <Clapperboard className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 flex flex-col flex-grow justify-between bg-gradient-to-b from-[#121222] to-[#0f0f1a]">
        <div>
          <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-purple-300 transition-colors">
            {item.title}
          </h3>
          <div className="flex flex-wrap gap-1 mt-2">
            {item.genres?.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[10px] font-medium bg-purple-950/80 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded-md"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs text-gray-400 font-medium">
          <span>{item.releaseDate ? item.releaseDate.split('-')[0] : '2026'}</span>
          <span className="text-purple-400 group-hover:underline">
            {isMovie ? 'Watch Movie →' : 'View Episodes →'}
          </span>
        </div>
      </div>
    </div>
  );
};
