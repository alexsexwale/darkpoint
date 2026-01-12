"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface BackgroundVideoProps {
  src?: string;
  youtubeId?: string;
  posterImage?: string;
  loop?: boolean;
  muted?: boolean;
  opacity?: number;
  pauseOnBlur?: boolean;
  className?: string;
}

export function BackgroundVideo({
  src,
  youtubeId,
  posterImage,
  loop = true,
  muted = true,
  opacity = 0.5,
  pauseOnBlur = true,
  className,
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Calculate cover dimensions for YouTube
  useEffect(() => {
    const updateDimensions = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const videoRatio = 16 / 9; // YouTube aspect ratio
      const windowRatio = windowWidth / windowHeight;

      let width, height;

      if (windowRatio > videoRatio) {
        // Window is wider than video
        width = windowWidth;
        height = windowWidth / videoRatio;
      } else {
        // Window is taller than video
        height = windowHeight;
        width = windowHeight * videoRatio;
      }

      // Add extra to ensure no gaps
      setDimensions({
        width: width + 200,
        height: height + 200,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Handle self-hosted video
  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;

    const handleLoad = () => {
      setIsLoaded(true);
    };

    video.addEventListener("loadeddata", handleLoad);

    return () => {
      video.removeEventListener("loadeddata", handleLoad);
    };
  }, [src]);

  // Handle visibility change
  useEffect(() => {
    if (!pauseOnBlur || !videoRef.current) return;

    const video = videoRef.current;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {
          // Autoplay was prevented
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseOnBlur]);

  // YouTube embed
  if (youtubeId) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[-1] overflow-hidden pointer-events-none",
          className
        )}
      >
        {/* Poster image as fallback */}
        {posterImage && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{ 
              backgroundImage: `url(${posterImage})`,
              opacity: isLoaded ? 0 : 1,
            }}
          />
        )}
        
        {/* YouTube iframe container */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            opacity: opacity,
          }}
        >
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1&playlist=${youtubeId}&start=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoaded(true)}
            style={{ border: 'none' }}
          />
        </div>
        
        {/* Overlay for darkening */}
        <div className="absolute inset-0 bg-black/30" />
      </div>
    );
  }

  // Self-hosted video
  if (src) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[-1] overflow-hidden",
          className
        )}
        style={{ opacity }}
      >
        {posterImage && !isLoaded && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${posterImage})` }}
          />
        )}
        <video
          ref={videoRef}
          className="absolute w-full h-full object-cover"
          autoPlay
          muted={muted}
          loop={loop}
          playsInline
          poster={posterImage}
          preload="metadata"
        >
          {/* Prefer WebM for smaller file size, fallback to MP4 */}
          <source src={src.replace('.mp4', '.webm')} type="video/webm" />
          <source src={src} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/30" />
      </div>
    );
  }

  // Static background image
  if (posterImage) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[-1] bg-cover bg-center",
          className
        )}
        style={{
          backgroundImage: `url(${posterImage})`,
          opacity,
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>
    );
  }

  return null;
}
