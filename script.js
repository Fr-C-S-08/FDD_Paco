// ============================================
// CONFIG
// ============================================
const CONFIG = {
  SPOTIFY_CLIENT_ID: '<<RELLENA_CON_TU_CLIENT_ID>>',
  WORKER_URL: 'https://fdd-paco-proxy.francisco-c-s-08.workers.dev/',
  REDIRECT_URI: 'https://fr-c-s-08.github.io/FDD_Paco/callback.html',
  SCOPES: 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state',
};

let chatHistory = [];
const MAX_HISTORY = 12;

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

    if (!res.ok) {
      console.error('Refresh failed:', await res.text());
      return null;
    }

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
}

// ============================================
// SPOTIFY WEB PLAYBACK SDK
// ============================================
let spotifyPlayer = null;
let spotifyDeviceId = null;

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

  spotifyPlayer.connect();
};

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

// ============================================
// CHAT — WORKER (CON HISTORIAL)
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
  if (chatWindow.classList.contains('open')) chatInput.focus();
});
chatClose.addEventListener('click', () => chatWindow.classList.remove('open'));
spotifyLoginBtn.addEventListener('click', () => loginWithSpotify());

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

    // Guardar respuesta de Claude en formato natural y legible
    // (mucho mejor para el contexto de las siguientes conversaciones)
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
