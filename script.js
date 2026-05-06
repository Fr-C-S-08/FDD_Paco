// ============================================
// CONFIG — Llena estos valores antes de subir
// ============================================
const CONFIG = {
  // Tu Client ID de Spotify (dashboard developer.spotify.com)
  SPOTIFY_CLIENT_ID: '9074170a641e46c8a361bc82bce924e5',

  // URL de tu Worker en Cloudflare
  WORKER_URL: 'https://fdd-paco-proxy.francisco-c-s-08.workers.dev/',

  // Redirect URI registrada en Spotify
  REDIRECT_URI: 'https://fr-c-s-08.github.io/FDD_Paco/callback.html',

  // Permisos que pedimos a Spotify
  SCOPES: 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state',
};

// ============================================
// REVEAL Y NAV (lógica del boceto original)
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
// SPOTIFY OAUTH (PKCE FLOW)
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

function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = parseInt(localStorage.getItem('spotify_expires_at') || '0');
  if (!token || Date.now() >= expiresAt) {
    return null;
  }
  return token;
}

function logoutSpotify() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_expires_at');
  showLoginUI();
}

// ============================================
// SPOTIFY WEB PLAYBACK SDK
// ============================================
let spotifyPlayer = null;
let spotifyDeviceId = null;

window.onSpotifyWebPlaybackSDKReady = () => {
  const token = getAccessToken();
  if (!token) return;

  spotifyPlayer = new Spotify.Player({
    name: 'Paco DJ Web Player',
    getOAuthToken: cb => cb(token),
    volume: 0.7,
  });

  spotifyPlayer.addListener('ready', ({ device_id }) => {
    spotifyDeviceId = device_id;
    setStatus('online');
  });

  spotifyPlayer.addListener('not_ready', () => {
    setStatus('error');
  });

  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    console.error('Init error:', message);
    setStatus('error');
  });

  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    console.error('Auth error:', message);
    logoutSpotify();
  });

  spotifyPlayer.addListener('account_error', ({ message }) => {
    console.error('Account error (probablemente no es Premium):', message);
    addMessage('mascot', 'necesitas spotify premium para reproducir aquí 😿');
    setStatus('error');
  });

  spotifyPlayer.connect();
};

async function searchTrack(track, artist) {
  const token = getAccessToken();

  // Helper: normalizar texto (sin acentos, lowercase)
  const normalize = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Búsqueda estricta con comillas
  const strictQuery = `track:"${track}" artist:"${artist}"`;
  let res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(strictQuery)}&type=track&limit=1`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (res.ok) {
    const data = await res.json();
    if (data.tracks?.items?.[0]) return data.tracks.items[0];
  }

  // 2. Búsqueda libre, filtrando por artista coincidente
  const freeQuery = `${track} ${artist}`;
  res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(freeQuery)}&type=track&limit=10`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.tracks?.items || [];

  // Buscar el primer track cuyo artista incluya el nombre buscado
  const targetArtist = normalize(artist);
  const matching = items.find(t =>
    t.artists.some(a => {
      const normalA = normalize(a.name);
      return normalA.includes(targetArtist) || targetArtist.includes(normalA);
    })
  );

  return matching || null;  // si no hay match de artista, mejor decir "no encontré"
}

async function playTrack(trackUri) {
  const token = getAccessToken();
  if (!spotifyDeviceId) throw new Error('Player no listo todavía');

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

// ============================================
// CHAT — LLAMADA AL WORKER (CLAUDE)
// ============================================
async function askClaude(message) {
  const res = await fetch(CONFIG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Worker error: ${res.status}`);
  return res.json();
}

// ============================================
// CHAT UI
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

mascotBtn.addEventListener('click', () => {
  chatWindow.classList.toggle('open');
  if (chatWindow.classList.contains('open')) {
    chatInput.focus();
  }
});
chatClose.addEventListener('click', () => chatWindow.classList.remove('open'));

spotifyLoginBtn.addEventListener('click', () => loginWithSpotify());

function setStatus(state) {
  chatStatus.classList.remove('online', 'error');
  if (state) chatStatus.classList.add(state);
}

function showLoginUI() {
  chatLogin.hidden = false;
  chatInputWrap.hidden = true;
  setStatus('');
}

function showChatUI() {
  chatLogin.hidden = true;
  chatInputWrap.hidden = false;
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

chatInput.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter' || !chatInput.value.trim()) return;

  const message = chatInput.value.trim();
  chatInput.value = '';
  addMessage('user', message);

  if (!getAccessToken()) {
    addMessage('mascot', 'primero conéctate con spotify ✨');
    showLoginUI();
    return;
  }

  if (!spotifyDeviceId) {
    addMessage('mascot', 'el reproductor está iniciando, espera un momento...');
    return;
  }

  // Estado "pensando"
  mascotBtn.classList.add('thinking');
  const loadingMsg = addMessage('mascot', 'pensando en algo bueno...', true);

  try {
    const recommendation = await askClaude(message);

    if (!recommendation.track || !recommendation.artist) {
      throw new Error('Respuesta inesperada de Claude');
    }

    loadingMsg.textContent = 'buscando en spotify...';
    const track = await searchTrack(recommendation.track, recommendation.artist);

    if (!track) {
      loadingMsg.classList.remove('loading');
      loadingMsg.innerHTML = `no encontré "${recommendation.track}" de ${recommendation.artist} 😿<br><small>${recommendation.reason || ''}</small>`;
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
if (getAccessToken()) {
  showChatUI();
} else {
  showLoginUI();
}
