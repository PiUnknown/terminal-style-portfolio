export default async function handler(req, res) {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;

  // Set CORS headers so the local dev server can access it if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return res.status(200).json({ isPlaying: false, song: "Setup Required", artist: "Check Guide", url: "#" });
  }

  try {
    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: SPOTIFY_REFRESH_TOKEN,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error("Failed to get access token");
    }
    
    const { access_token } = data;

    // Get currently playing
    const playingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (playingResponse.status === 204 || playingResponse.status > 400) {
      // Fallback to recently played
      const recentResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const recentData = await recentResponse.json();
      
      if (!recentData.items || recentData.items.length === 0) {
         return res.status(200).json({ isPlaying: false, song: "Silence", artist: "Nothing played recently", url: "#" });
      }
      
      const track = recentData.items[0].track;
      return res.status(200).json({
        isPlaying: false,
        song: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        url: track.external_urls.spotify,
      });
    }

    const playingData = await playingResponse.json();
    
    if (playingData.currently_playing_type !== 'track' || !playingData.item) {
       // Could be a podcast or empty
       return res.status(200).json({ isPlaying: playingData.is_playing, song: "Podcast/Other", artist: "Spotify", url: "#" });
    }

    const track = playingData.item;
    return res.status(200).json({
      isPlaying: playingData.is_playing,
      song: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      url: track.external_urls.spotify,
    });
  } catch (error) {
    console.error("Spotify API Error:", error);
    return res.status(200).json({ isPlaying: false, song: "API Error", artist: "Check Logs", url: "#" });
  }
}
