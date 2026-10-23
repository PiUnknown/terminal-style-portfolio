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

  const hasTrack = data.url.startsWith("https://open.spotify.com/track/");
  const mobileLabel = hasTrack
    ? `${data.isPlaying ? "Now playing" : "Last played"} · ${data.song}`
    : data.song === "Loading..."
      ? "Loading Spotify…"
      : data.song === "Setup Required"
        ? "Spotify setup required"
        : data.song === "Silence"
          ? "No recent track"
          : data.song === "Podcast/Other"
            ? "Spotify is playing another format"
            : "Spotify unavailable";

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 hover:text-primary transition-colors cursor-pointer pointer-events-auto mobile-spotify-link"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
      title={hasTrack ? `${data.isPlaying ? "Now playing" : "Last played"}: ${data.song}` : mobileLabel}
      aria-label={hasTrack ? `${data.isPlaying ? "Now playing" : "Last played"} ${data.song} by ${data.artist} on Spotify` : mobileLabel}
    >
      <span className="text-primary text-center inline-block hidden sm:inline-block">
        [♫]
      </span>
      <svg className="mobile-spotify-mark sm:hidden" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#1DB954" />
        <path d="M6.7 9.2c3.6-1.1 7.5-.7 10.6 1.2M7.5 12.1c2.9-.8 6.1-.5 8.6 1M8.2 14.8c2.3-.6 4.7-.3 6.6.8" fill="none" stroke="#07130b" strokeWidth="1.55" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline truncate max-w-[150px] lg:max-w-[250px]">
        {data.isPlaying ? "Playing: " : "Last Played: "}
        <span className="text-foreground">{data.song}</span>
      </span>
      <span className="sm:hidden mobile-spotify-compact">
        {mobileLabel}
      </span>
    </a>
  );
}
