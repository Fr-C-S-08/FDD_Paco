// ============================================
// CONFIG
// ============================================
const CONFIG = {
  SPOTIFY_CLIENT_ID: '9074170a641e46c8a361bc82bce924e5',
  WORKER_URL: 'https://fdd-paco-proxy.francisco-c-s-08.workers.dev/',
  REDIRECT_URI: 'https://fr-c-s-08.github.io/FDD_Paco/callback.html',
  SCOPES: 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state user-library-read user-library-modify',
};

let chatHistory = [];
const MAX_HISTORY = 12;

// ============================================
// SVG ICONS
// ============================================
const ICONS = {
  play: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`,
  next: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
  like: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  likeFilled: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
};

// ============================================
// REVEAL Y NAV
// ============================================
const dots = document.querySelectorAll('.dots a');
const sections = document.querySelectorAll('section.slide');
const scroller = document.querySelector('.scroller');

dots.forEach(d => {
  d.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById(d.dataset.target).scrollIntoView({ behavior: 'smooth' });
  });
});

document.querySelectorAll('.topnav a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
  });
});

const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const id = en.target.id;
      dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
    }
  });
}, { root: scroller, threshold: 0.55 });
sections.forEach(s => io.observe(s));

const reveals = document.querySelectorAll('.reveal');
const ro = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('visible');
      ro.unobserve(en.target);
    }
  });
}, { root: scroller, threshold: 0.18 });
reveals.forEach(r => ro.observe(r));

setTimeout(() => {
  document.querySelectorAll('#hero .reveal').forEach(r => r.classList.add('visible'));
}, 80);

// ============================================
// SPOTIFY OAUTH
// ============================================
function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function loginWithSpotify() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CONFIG.SPOTIFY_CLIENT_ID,
    scope: CONFIG.SCOPES,
    redirect_uri: CONFIG.REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location = `https://accounts.spotify.com/authorize?${params}`;
}

function getStoredToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = parseInt(localStorage.getItem('spotify_expires_at') || '0');
  if (!token) return null;
  return { token, expiresAt };
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CONFIG.SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_expires_at', Date.now() + data.expires_in * 1000);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    return data.access_token;
  } catch (e) {
    console.error('Refresh error:', e);
    return null;
  }
}

async function ensureValidToken() {
  const stored = getStoredToken();
  if (!stored) return null;
  const TWO_MIN = 2 * 60 * 1000;
  if (Date.now() >= stored.expiresAt - TWO_MIN) {
    return await refreshAccessToken();
  }
  return stored.token;
}

function logoutSpotify() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_expires_at');
  showLoginUI();
  hideNowPlaying();
}

// ============================================
// SPOTIFY WEB PLAYBACK SDK
// ============================================
let spotifyPlayer = null;
let spotifyDeviceId = null;
let currentTrackId = null;
let isPlaying = false;
let progressInterval = null;

window.onSpotifyWebPlaybackSDKReady = async () => {
  const token = await ensureValidToken();
  if (!token) return;

  spotifyPlayer = new Spotify.Player({
    name: 'Paco DJ Web Player',
    getOAuthToken: async cb => {
      const t = await ensureValidToken();
      cb(t);
    },
    volume: 0.7,
  });

  spotifyPlayer.addListener('ready', ({ device_id }) => {
    spotifyDeviceId = device_id;
    setStatus('online');
  });

  spotifyPlayer.addListener('not_ready', () => setStatus('error'));

  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    console.error('Init error:', message);
    setStatus('error');
  });

  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    console.error('Auth error:', message);
    logoutSpotify();
  });

  spotifyPlayer.addListener('account_error', ({ message }) => {
    console.error('Account error:', message);
    addMessage('mascot', 'necesitas spotify premium para reproducir aquí 😿');
    setStatus('error');
  });

  // Estado del reproductor cambió → actualizar UI
  spotifyPlayer.addListener('player_state_changed', async (state) => {
    if (!state) {
      hideNowPlaying();
      return;
    }
    showNowPlaying();

    isPlaying = !state.paused;
    npPlayPause.innerHTML = isPlaying ? ICONS.pause : ICONS.play;

    npTimeCurrent.textContent = formatTime(state.position);
    npTimeTotal.textContent = formatTime(state.duration);
    npBarFill.style.width = `${(state.position / state.duration) * 100}%`;

    npRepeat.classList.toggle('active', state.repeat_mode !== 0);

    const trackId = state.track_window.current_track?.id;
    if (trackId && trackId !== currentTrackId) {
      currentTrackId = trackId;
      await checkIfLiked(trackId);
    }
  });

  spotifyPlayer.connect();

  // Tick cada 500ms para actualizar la barra de progreso
  progressInterval = setInterval(async () => {
    if (!spotifyPlayer || !isPlaying) return;
    const state = await spotifyPlayer.getCurrentState();
    if (!state) return;
    npTimeCurrent.textContent = formatTime(state.position);
    npBarFill.style.width = `${(state.position / state.duration) * 100}%`;
  }, 500);
};

function formatTime(ms) {
  const sec = Math.floor((ms || 0) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function searchTrack(track, artist) {
  const token = await ensureValidToken();
  if (!token) throw new Error('No token');

  const normalize = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const strictQuery = `track:"${track}" artist:"${artist}"`;
  let res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(strictQuery)}&type=track&limit=1`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (res.ok) {
    const data = await res.json();
    if (data.tracks?.items?.[0]) return data.tracks.items[0];
  }

  const freeQuery = `${track} ${artist}`;
  res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(freeQuery)}&type=track&limit=10`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.tracks?.items || [];

  const targetArtist = normalize(artist);
  const matching = items.find(t =>
    t.artists.some(a => {
      const normalA = normalize(a.name);
      return normalA.includes(targetArtist) || targetArtist.includes(normalA);
    })
  );
  return matching || null;
}

async function playTrack(trackUri) {
  const token = await ensureValidToken();
  if (!spotifyDeviceId) throw new Error('Player no listo');

  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ uris: [trackUri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Play failed: ${res.status}`);
  }
}

async function checkIfLiked(trackId) {
  try {
    const token = await ensureValidToken();
    const res = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const [liked] = await res.json();
    npLike.innerHTML = liked ? ICONS.likeFilled : ICONS.like;
    npLike.classList.toggle('active', liked);
  } catch (e) {
    console.error('check liked:', e);
  }
}

async function toggleLike() {
  if (!currentTrackId) return;
  try {
    const token = await ensureValidToken();
    const isLiked = npLike.classList.contains('active');
    await fetch(`https://api.spotify.com/v1/me/tracks?ids=${currentTrackId}`, {
      method: isLiked ? 'DELETE' : 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    npLike.innerHTML = isLiked ? ICONS.like : ICONS.likeFilled;
    npLike.classList.toggle('active', !isLiked);
  } catch (e) {
    console.error('toggle like:', e);
  }
}

async function toggleRepeat() {
  try {
    const state = await spotifyPlayer.getCurrentState();
    if (!state) return;
    const newMode = state.repeat_mode === 0 ? 'track' : 'off';
    const token = await ensureValidToken();
    await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${newMode}&device_id=${spotifyDeviceId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  } catch (e) {
    console.error('toggle repeat:', e);
  }
}

// ============================================
// CHAT — WORKER
// ============================================
async function askClaude(messages) {
  const res = await fetch(CONFIG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Worker error: ${res.status}`);
  return res.json();
}

// ============================================
// UI ELEMENTS
// ============================================
const mascotBtn = document.getElementById('mascotBtn');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatLogin = document.getElementById('chatLogin');
const chatInputWrap = document.getElementById('chatInputWrap');
const spotifyLoginBtn = document.getElementById('spotifyLogin');
const chatStatus = document.getElementById('chatStatus');

// Now playing controls
const nowPlaying = document.getElementById('nowPlaying');
const npTimeCurrent = document.getElementById('npTimeCurrent');
const npTimeTotal = document.getElementById('npTimeTotal');
const npBar = document.getElementById('npBar');
const npBarFill = document.getElementById('npBarFill');
const npPlayPause = document.getElementById('npPlayPause');
const npPrev = document.getElementById('npPrev');
const npNext = document.getElementById('npNext');
const npRepeat = document.getElementById('npRepeat');
const npLike = document.getElementById('npLike');

// Init icons
npPlayPause.innerHTML = ICONS.play;
npPrev.innerHTML = ICONS.prev;
npNext.innerHTML = ICONS.next;
npRepeat.innerHTML = ICONS.repeat;
npLike.innerHTML = ICONS.like;

// Event listeners
mascotBtn.addEventListener('click', () => {
  chatWindow.classList.toggle('open');
  if (chatWindow.classList.contains('open')) chatInput.focus();
});
chatClose.addEventListener('click', () => chatWindow.classList.remove('open'));
spotifyLoginBtn.addEventListener('click', () => loginWithSpotify());

npPlayPause.addEventListener('click', () => spotifyPlayer && spotifyPlayer.togglePlay());
npPrev.addEventListener('click', () => spotifyPlayer && spotifyPlayer.previousTrack());
npNext.addEventListener('click', () => spotifyPlayer && spotifyPlayer.nextTrack());
npRepeat.addEventListener('click', () => toggleRepeat());
npLike.addEventListener('click', () => toggleLike());

// Click en barra de progreso para hacer seek
npBar.addEventListener('click', async (e) => {
  if (!spotifyPlayer) return;
  const rect = npBar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const state = await spotifyPlayer.getCurrentState();
  if (!state) return;
  spotifyPlayer.seek(Math.floor(ratio * state.duration));
});

// ============================================
// UI HELPERS
// ============================================
function setStatus(state) {
  chatStatus.classList.remove('online', 'error');
  if (state) chatStatus.classList.add(state);
}

function showLoginUI() {
  chatLogin.style.display = 'flex';
  chatInputWrap.style.display = 'none';
  setStatus('');
}

function showChatUI() {
  chatLogin.style.display = 'none';
  chatInputWrap.style.display = 'block';
}

function showNowPlaying() {
  nowPlaying.style.display = 'block';
}

function hideNowPlaying() {
  nowPlaying.style.display = 'none';
  isPlaying = false;
  currentTrackId = null;
}

function addMessage(sender, text, isLoading = false) {
  const msg = document.createElement('div');
  msg.className = `msg msg-${sender}`;
  if (isLoading) msg.classList.add('loading');
  msg.innerHTML = text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

// ============================================
// CHAT INPUT
// ============================================
chatInput.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter' || !chatInput.value.trim()) return;

  const userMessage = chatInput.value.trim();
  chatInput.value = '';
  addMessage('user', userMessage);

  const token = await ensureValidToken();
  if (!token) {
    addMessage('mascot', 'la sesión expiró, conéctate de nuevo ✨');
    showLoginUI();
    return;
  }

  if (!spotifyDeviceId) {
    addMessage('mascot', 'el reproductor está iniciando, espera un momento...');
    return;
  }

  chatHistory.push({ role: 'user', content: userMessage });
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory = chatHistory.slice(-MAX_HISTORY);
  }

  mascotBtn.classList.add('thinking');
  const loadingMsg = addMessage('mascot', 'pensando en algo bueno...', true);

  try {
    const recommendation = await askClaude(chatHistory);

    if (!recommendation.track || !recommendation.artist) {
      throw new Error('Respuesta inesperada de Claude');
    }

    chatHistory.push({
      role: 'assistant',
      content: `Te recomendé "${recommendation.track}" de ${recommendation.artist}. ${recommendation.reason || ''}`,
    });

    loadingMsg.textContent = 'buscando en spotify...';
    const track = await searchTrack(recommendation.track, recommendation.artist);

    if (!track) {
      loadingMsg.classList.remove('loading');
      loadingMsg.innerHTML = `no encontré "${recommendation.track}" de ${recommendation.artist} en spotify 😿<br><small>${recommendation.reason || ''}</small>`;
      return;
    }

    await playTrack(track.uri);

    loadingMsg.classList.remove('loading');
    loadingMsg.innerHTML = `
      🎵 <strong>${track.name}</strong> · ${track.artists[0].name}
      <small>${recommendation.reason || ''}</small>
      <a href="${track.external_urls.spotify}" target="_blank" class="track-link">abrir en spotify ↗</a>
    `;

  } catch (err) {
    console.error(err);
    loadingMsg.classList.remove('loading');
    loadingMsg.textContent = 'algo salió mal, inténtalo de nuevo 😿';
  } finally {
    mascotBtn.classList.remove('thinking');
  }
});

// ============================================
// INICIO
// ============================================
(async () => {
  const token = await ensureValidToken();
  if (token) {
    showChatUI();
  } else {
    showLoginUI();
  }
})();
