import { useState, useEffect } from "react";
import { useReducedMotion } from "motion/react";

interface SpotifyData {
  isPlaying: boolean;
  song: string;
  artist: string;
  url: string;
}

export function SpotifyWidget() {
  const [data, setData] = useState<SpotifyData>({
    isPlaying: false,
    song: "Loading...",
    artist: "Spotify",
    url: "#"
  });

  useEffect(() => {
    const fetchSpotify = async () => {
      try {
        const res = await fetch(`/api/spotify?t=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch Spotify status", e);
      }
    };
    
    fetchSpotify();
    const interval = setInterval(fetchSpotify, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group hidden sm:flex items-center gap-2 hover:text-primary transition-colors cursor-pointer pointer-events-auto"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
      title="Listen on Spotify"
    >
      <span className="text-primary text-center inline-block">
        [♫]
      </span>
      <span className="truncate max-w-[150px] lg:max-w-[250px]">
        {data.isPlaying ? "Playing: " : "Last Played: "}
        <span className="text-foreground">{data.song}</span>
      </span>
    </a>
  );
}
