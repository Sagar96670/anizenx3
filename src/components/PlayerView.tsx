import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Download,
  SkipBack,
  SkipForward,
  Loader2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import Hls from 'hls.js';
import { ResolverResponse } from '../types';
import { resolveBlakiteVideo } from '../services/api';
import { getPlayableStreamUrl } from '../utils/videoProxy';

interface PlayerViewProps {
  animeId: string;
  episodeId: string;
  mediaType?: 'anime' | 'movie';
  onBack: () => void;
  onNavigateEpisode?: (newEpisodeId: string, newEpisodeNumber: number) => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  animeId,
  episodeId,
  mediaType = 'anime',
  onBack,
  onNavigateEpisode,
}) => {
  const isMovie = mediaType === 'movie';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [resolverData, setResolverData] = useState<ResolverResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Custom Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['Auto', '240p', '360p', '480p', '720p', '1080p']);

  // Menu toggles & auto-hide
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse episode number
  const currentEpNum = episodeId.includes('-') ? parseInt(episodeId.split('-')[1], 10) : 1;

  // Fetch initial or quality-switched video stream
  const targetEpisodeId = isMovie ? (episodeId || '0') : episodeId;

  const loadStream = async (qualityToLoad?: string) => {
    setLoading(true);
    setError(false);
    try {
      const q = qualityToLoad || selectedQuality;
      const data = await resolveBlakiteVideo(animeId, targetEpisodeId, q === 'Auto' ? undefined : q);
      if (data && data.status && data.video_url) {
        setResolverData(data);
        if (data.available_qualities && data.available_qualities.length > 0) {
          const apiQuals = data.available_qualities;
          setAvailableQualities(apiQuals.includes('Auto') ? apiQuals : ['Auto', ...apiQuals]);
        }
      } else {
        setError(true);
        setErrorMessage(data?.error || 'Failed to resolve video stream');
      }
    } catch (e) {
      console.error('Resolver error:', e);
      setError(true);
      setErrorMessage('Network or server error while resolving video stream.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStream();
  }, [animeId, episodeId]);

  // Handle HLS or standard video source loading with mobile streaming optimizations
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolverData?.video_url) return;

    const rawUrl = resolverData.video_url;
    const url = getPlayableStreamUrl(rawUrl);
    const savedTime = video.currentTime || 0;

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = url.includes('.m3u8') || url.toLowerCase().includes('m3u8') || resolverData.format === 'HLS';

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          startFragPrefetch: true,
          capLevelToPlayerSize: true,
          // Robust buffer bounds for smooth VOD anime streaming (30s buffer ahead)
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1024 * 1024,
          backBufferLength: 30,
          lowLatencyMode: false, // Disabled for VOD anime episodes to avoid stall glitches
          enableWorker: true,
          progressive: true,
          // Robust network recovery for mobile radio latency/reconnects
          fragLoadingTimeOut: 25000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 5,
          levelLoadingTimeOut: 20000,
          levelLoadingMaxRetry: 5,
        });

        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          setLoading(false);
          if (savedTime > 0.5) {
            try { video.currentTime = savedTime; } catch {}
          }
          video.play().then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }).catch(() => {
            // Autoplay restricted by mobile browser policy - ready to play on user tap
            setIsPlaying(false);
            setIsBuffering(false);
          });
        });

        // Auto-recovery from temporary mobile network drops
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('HLS network glitch, recovering stream...', data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('HLS media decode error, recovering...', data);
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal unrecoverable HLS error:', data);
                setIsBuffering(false);
                setError(true);
                setErrorMessage('Stream playback error. Tap retry to reload.');
                hls.destroy();
                break;
            }
          }
        });

        return () => {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        const onMetadata = () => {
          setIsBuffering(false);
          setLoading(false);
          if (savedTime > 0.5) {
            try { video.currentTime = savedTime; } catch {}
          }
          video.removeEventListener('loadedmetadata', onMetadata);
        };
        video.addEventListener('loadedmetadata', onMetadata);
        video.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
        });
      }
    } else {
      // Standard progressive MP4 stream (Rumble / CDN)
      video.src = url;
      const onMetadata = () => {
        setIsBuffering(false);
        setLoading(false);
        if (savedTime > 0.5) {
          try { video.currentTime = savedTime; } catch {}
        }
        video.removeEventListener('loadedmetadata', onMetadata);
      };
      video.addEventListener('loadedmetadata', onMetadata);
      video.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch(() => {
        setIsPlaying(false);
        setIsBuffering(false);
      });
    }
  }, [resolverData?.video_url]);

  // Video event listeners with fast buffer recovery and Android Chrome fix
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Android Chrome recovery: if video time is advancing and video is not paused, dismiss buffering overlay
      if (video.currentTime > 0 && !video.paused) {
        setIsBuffering(false);
      }
    };
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleWaiting = () => {
      if (!video.paused && video.readyState < 3) {
        setIsBuffering(true);
      }
    };
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handleProgress = () => {
      if (video.readyState >= 3) {
        setIsBuffering(false);
      }
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlay);
    video.addEventListener('loadeddata', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlay);
      video.removeEventListener('loadeddata', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // YouTube-style auto-hide controls timer
  const resetControlsTimer = () => {
    if (qualityMenuOpen) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      return;
    }

    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!qualityMenuOpen) {
          setShowControls(false);
        }
      }, 3000);
    }
  };

  useEffect(() => {
    if (!isPlaying || qualityMenuOpen) {
      setShowControls(true);
      if (controlsTimeoutRef.current && !qualityMenuOpen) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimer();
    }
  }, [isPlaying, qualityMenuOpen]);

  // Dedicated transparent interaction overlay tap handler
  const handleOverlayTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (qualityMenuOpen) {
      setQualityMenuOpen(false);
      return;
    }
    setShowControls((prev) => {
      const nextState = !prev;
      if (nextState && isPlaying) {
        resetControlsTimer();
      } else if (!nextState) {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      }
      return nextState;
    });
  };

  // Play / Pause toggle
  const togglePlay = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    resetControlsTimer();
  };

  // Rewind / Forward 10 seconds
  const handleRewind10 = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
    resetControlsTimer();
  };

  const handleForward10 = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration, video.currentTime + 10);
    resetControlsTimer();
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    resetControlsTimer();
  };

  // Volume handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    resetControlsTimer();
  };

  // Sound / Mute Toggle (Working & untouched)
  const toggleMute = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const video = videoRef.current;
    if (!video) return;

    const newMutedState = !isMuted;
    video.muted = newMutedState;
    setIsMuted(newMutedState);
    if (!newMutedState && volume === 0) {
      setVolume(1);
      video.volume = 1;
    }
    resetControlsTimer();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    resetControlsTimer();
  };

  // Quality change & dropdown toggle handler
  const toggleQualityMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setQualityMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      } else {
        resetControlsTimer();
      }
      return next;
    });
  };

  const changeQuality = async (q: string) => {
    if (q === selectedQuality) {
      setQualityMenuOpen(false);
      resetControlsTimer();
      return;
    }
    setSelectedQuality(q);
    setQualityMenuOpen(false);

    // If Hls.js instance has internal levels in master playlist, switch level instantly without reload
    if (hlsRef.current && hlsRef.current.levels && hlsRef.current.levels.length > 0) {
      if (q === 'Auto') {
        hlsRef.current.currentLevel = -1; // Auto adaptive bitrate
        resetControlsTimer();
        return;
      } else {
        const targetHeight = parseInt(q.replace('p', ''), 10);
        const levelIdx = hlsRef.current.levels.findIndex((l) => l.height === targetHeight);
        if (levelIdx !== -1) {
          hlsRef.current.currentLevel = levelIdx;
          resetControlsTimer();
          return;
        }
      }
    }

    setLoading(true);
    try {
      const data = await resolveBlakiteVideo(animeId, targetEpisodeId, q === 'Auto' ? undefined : q);
      if (data && data.status && data.video_url) {
        setResolverData(data);
        setError(false);
        if (data.available_qualities && data.available_qualities.length > 0) {
          const apiQuals = data.available_qualities;
          setAvailableQualities(apiQuals.includes('Auto') ? apiQuals : ['Auto', ...apiQuals]);
        }
      } else {
        setError(true);
        setErrorMessage(data?.error || `Quality ${q} is unavailable for this video.`);
      }
    } catch (err: any) {
      console.error('Quality change error:', err);
      setError(true);
      setErrorMessage(err?.message || `Failed to switch to quality ${q}.`);
    } finally {
      setLoading(false);
      resetControlsTimer();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePrevEpisode = () => {
    if (currentEpNum > 1 && onNavigateEpisode) {
      const prevNum = currentEpNum - 1;
      const cleanEp = episodeId.replace(/^manual_/, '');
      const seasonNum = cleanEp.split('-')[0] || '1';
      onNavigateEpisode(`${seasonNum}-${prevNum}`, prevNum);
    }
  };

  const handleNextEpisode = () => {
    if (onNavigateEpisode) {
      const nextNum = currentEpNum + 1;
      const cleanEp = episodeId.replace(/^manual_/, '');
      const seasonNum = cleanEp.split('-')[0] || '1';
      onNavigateEpisode(`${seasonNum}-${nextNum}`, nextNum);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 space-y-3">
      {/* Compact Information Bar */}
      <div className="flex items-center justify-between bg-[#121222] px-4 py-2.5 rounded-xl border border-purple-900/40 text-xs sm:text-sm">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition-all flex-shrink-0 cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="truncate">
            <span className="font-bold text-white">{resolverData?.animeTitle || (isMovie ? 'Anime Movie' : 'Anime Series')}</span>
            <span className="mx-2 text-purple-400">•</span>
            {isMovie ? (
              <span className="text-pink-300 font-semibold">Movie (Hindi Dubbed)</span>
            ) : (
              <>
                <span className="text-gray-300">Season {resolverData?.season || 1}</span>
                <span className="mx-2 text-purple-400">•</span>
                <span className="text-purple-300 font-semibold">Ep {resolverData?.episode || currentEpNum}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-purple-950 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-lg text-xs font-bold">
            {selectedQuality === 'Auto' && resolverData?.quality
              ? `Auto (${resolverData.quality})`
              : selectedQuality}
          </span>
          {resolverData?.format && (
            <span className="bg-pink-950/60 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-lg text-[10px] font-semibold hidden sm:inline">
              {resolverData.format}
            </span>
          )}
        </div>
      </div>

      {/* VIDEO PLAYER CONTAINER */}
      <div
        ref={playerContainerRef}
        onMouseMove={resetControlsTimer}
        className="relative w-full aspect-video bg-black rounded-2xl border border-purple-500/40 shadow-xl shadow-purple-950/80 group select-none flex items-center justify-center"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black rounded-2xl pointer-events-none"
          playsInline
          preload="metadata"
        />

        {/* DEDICATED TRANSPARENT INTERACTION OVERLAY (Always active) */}
        <div
          onClick={handleOverlayTap}
          onTouchEnd={handleOverlayTap}
          className="absolute inset-0 z-10 cursor-pointer"
          style={{ pointerEvents: 'auto' }}
          title="Toggle Controls"
        />

        {/* Loading / Buffering */}
        {(loading || isBuffering) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-20 pointer-events-none rounded-2xl">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            <p className="text-[11px] font-medium text-purple-200 mt-2">
              {loading ? 'Resolving Stream...' : 'Buffering...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0b14]/95 p-4 text-center z-40 rounded-2xl">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <h3 className="text-sm font-bold text-white">Stream Error</h3>
            <p className="text-xs text-gray-400 max-w-xs mb-3">{errorMessage || 'Failed to play video.'}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadStream();
              }}
              className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* CENTER PLAY/PAUSE & 10s REWIND/FORWARD OVERLAY */}
        {showControls && !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-20 pointer-events-none transition-opacity">
            <div className="flex items-center gap-6 pointer-events-auto" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
              <button
                onClick={handleRewind10}
                onTouchEnd={handleRewind10}
                className="w-12 h-12 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 flex items-center justify-center text-white shadow-xl shadow-purple-950/60 transform hover:scale-110 transition-transform cursor-pointer"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                onTouchEnd={togglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-2xl shadow-purple-600/70 transform hover:scale-110 transition-transform cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
              </button>

              <button
                onClick={handleForward10}
                onTouchEnd={handleForward10}
                className="w-12 h-12 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 flex items-center justify-center text-white shadow-xl shadow-purple-950/60 transform hover:scale-110 transition-transform cursor-pointer"
                title="Forward 10 seconds"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* CUSTOM CONTROL BAR */}
        <div
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseMove={resetControlsTimer}
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#080812] via-[#080812]/95 to-transparent p-3 transition-opacity duration-300 z-35 flex flex-col gap-2 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Seekbar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-300 w-8 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-grow h-1 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-pink-500 transition-all"
            />
            <span className="text-[10px] font-medium text-gray-400 w-8">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                onTouchEnd={togglePlay}
                className="w-8 h-8 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 flex items-center justify-center text-white transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              {/* Sound / Mute Button & Slider (Untouched & Working) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  onTouchEnd={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-purple-600/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-purple-300" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-purple-500 hidden sm:block"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              {resolverData?.video_url && (
                <a
                  href={resolverData.video_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  title="Download Video"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              )}

              {/* QUALITY SETTINGS BUTTON & VISIBLE POPUP DROPDOWN */}
              <div className="relative">
                <button
                  onClick={toggleQualityMenu}
                  onTouchEnd={toggleQualityMenu}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    qualityMenuOpen
                      ? 'bg-purple-600 text-white border-purple-400 shadow-lg'
                      : 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border-purple-500/40'
                  }`}
                  title="Quality Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>
                    {selectedQuality === 'Auto' && resolverData?.quality
                      ? `Auto (${resolverData.quality})`
                      : selectedQuality}
                  </span>
                </button>

                {qualityMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className="absolute bottom-full right-0 mb-3 w-40 bg-[#121222] border border-purple-500/40 rounded-xl shadow-2xl py-2 z-[99999] space-y-1 pointer-events-auto"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-purple-400 uppercase border-b border-purple-900/30">
                      Select Quality
                    </div>
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={(e) => {
                          e.stopPropagation();
                          changeQuality(q);
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          changeQuality(q);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                          selectedQuality === q
                            ? 'bg-purple-600 text-white font-bold'
                            : 'text-gray-200 hover:bg-purple-600/20 hover:text-white'
                        }`}
                      >
                        {q} {selectedQuality === q ? '✓' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                onTouchEnd={toggleFullscreen}
                className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-gray-300 hover:text-white border border-purple-500/40 transition-all cursor-pointer"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Previous / Next Episode Buttons OR Movie Navigation */}
      {isMovie ? (
        <div className="flex items-center justify-between gap-3 bg-[#121222] px-4 py-2.5 rounded-xl border border-purple-900/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-xs font-bold text-white">Full Length Feature Film</span>
            <span className="text-[10px] text-purple-300 font-semibold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              Hindi Dubbed
            </span>
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Movie Details
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-[#121222] px-4 py-2.5 rounded-xl border border-purple-900/40">
          <button
            onClick={handlePrevEpisode}
            disabled={currentEpNum <= 1}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
              currentEpNum <= 1
                ? 'opacity-40 cursor-not-allowed bg-gray-900 text-gray-600'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40'
            }`}
          >
            <SkipBack className="w-3.5 h-3.5" /> Previous
          </button>

          <span className="text-[11px] text-gray-400 font-medium">
            Episode {currentEpNum}
          </span>

          <button
            onClick={handleNextEpisode}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            Next <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
