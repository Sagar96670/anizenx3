import React from 'react';

interface KuroiwaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const KuroiwaLogo: React.FC<KuroiwaLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  onClick,
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-[11px]',
    xl: 'text-xs',
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Premium Stylized 'K' Anime Icon */}
      <div
        className={`relative ${iconSizes[size]} rounded-xl bg-gradient-to-br from-purple-900/90 via-purple-700 to-pink-600 p-0.5 shadow-lg shadow-purple-600/40 ${
          onClick ? 'group-hover:scale-105 group-hover:shadow-pink-500/50' : ''
        } transition-all duration-300 flex items-center justify-center overflow-hidden flex-shrink-0`}
      >
        {/* Neon Glow Aura */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 opacity-80 blur-sm" />

        {/* Inner Dark Shield Matrix */}
        <div className="relative w-full h-full bg-[#0d091a] rounded-[10px] flex items-center justify-center overflow-hidden border border-purple-400/30">
          {/* Decorative background anime light streak */}
          <div className="absolute -top-6 -left-6 w-12 h-12 bg-pink-500/30 rounded-full blur-md" />
          <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-purple-600/30 rounded-full blur-md" />

          {/* Custom SVG 'K' Emblem */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/5 h-3/5 filter drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]"
          >
            <defs>
              <linearGradient id="kuroiwaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#e879f9" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="kuroiwaBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
            {/* Vertical Stem of K */}
            <path d="M 22 15 L 36 15 L 36 85 L 22 85 Z" fill="url(#kuroiwaGrad)" />
            {/* Upper Diagonal Blade */}
            <path d="M 36 50 L 72 15 L 86 15 L 48 50 Z" fill="url(#kuroiwaGrad)" />
            {/* Lower Diagonal Blade */}
            <path d="M 44 46 L 86 85 L 70 85 L 34 52 Z" fill="url(#kuroiwaBladeGrad)" />
            {/* Sharp Anime Slash Accent */}
            <circle cx="80" cy="20" r="4" fill="#ffffff" className="animate-pulse" />
          </svg>
        </div>
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center">
          <span
            className={`${titleSizes[size]} font-black tracking-wider bg-gradient-to-r from-white via-purple-100 to-pink-400 bg-clip-text text-transparent drop-shadow-sm`}
          >
            KUROIWA
          </span>
        </div>
        {showSubtitle && (
          <span className={`block ${subtitleSizes[size]} tracking-widest text-purple-400 font-bold uppercase`}>
            Anime Streaming
          </span>
        )}
      </div>
    </div>
  );
};
