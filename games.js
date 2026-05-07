/* ===== JUEGOS · paquito.dev ===== */
/* Carousel + Snake + Pong + Space Invaders */

(function() {
  'use strict';

  // ============================================
  // ============== PALETTE =====================
  // ============================================
  const C = {
    bg:    '#F2EAD8',
    cream: '#F5EDD8',
    ink:   '#1C2230',
    pine:  '#2C4A3E',
    pineL: '#3D6452',
    sun:   '#C8392E',
    soft:  'rgba(28,34,48,0.4)'
  };

  // ============================================
  // ============== CAROUSEL ====================
  // ============================================
  const games = [
    { id: 'snake',    name: 'Snake' },
    { id: 'pong',     name: 'Pong' },
    { id: 'invaders', name: 'Space Invaders' },
    { id: 'robot',    name: 'Vector Field' }
  ];
  let currentIdx = 0;

  const track    = document.getElementById('carouselTrack');
  const prevBtn  = document.getElementById('prevGame');
  const nextBtn  = document.getElementById('nextGame');
  const nameEl   = document.getElementById('carouselName');
  const idxEl    = document.getElementById('carouselIdx');

  if (!track) return;

  const gameInstances = {};

  function currentGameId() { return games[currentIdx].id; }

  function goTo(idx) {
    if (idx < 0) idx = games.length - 1;
    if (idx >= games.length) idx = 0;

    // Stop current game if it was running
    const cur = gameInstances[games[currentIdx].id];
    if (cur && cur.stop) cur.stop();

    currentIdx = idx;
    track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    nameEl.textContent = games[idx].name;
    idxEl.textContent = String(idx + 1).padStart(2, '0');
  }

  prevBtn.addEventListener('click', () => goTo(currentIdx - 1));
  nextBtn.addEventListener('click', () => goTo(currentIdx + 1));

  // ============================================
  // =============== SNAKE ======================
  // ============================================
  gameInstances.snake = (function() {
    const canvas = document.getElementById('snakeCanvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const SIZE = canvas.width;
    const GRID = 20;
    const CELL = SIZE / GRID;

    const scoreEl   = document.getElementById('snakeScore');
    const bestEl    = document.getElementById('snakeBest');
    const overlay   = document.getElementById('snakeOverlay');
    const overlayTx = document.getElementById('snakeOverlayText');
    const playBtn   = document.getElementById('snakePlayBtn');

    let snake, dir, nextDir, food, score, best, alive, speed, intervalId;

    best = parseInt(localStorage.getItem('snakeBest') || '0', 10);
    bestEl.textContent = best;

    function reset() {
      snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
      dir = {x: 1, y: 0};
      nextDir = {x: 1, y: 0};
      score = 0;
      speed = 130;
      placeFood();
      alive = true;
      scoreEl.textContent = score;
    }

    function placeFood() {
      while (true) {
        const x = Math.floor(Math.random() * GRID);
        const y = Math.floor(Math.random() * GRID);
        if (!snake.some(s => s.x === x && s.y === y)) {
          food = {x, y};
          return;
        }
      }
    }

    function step() {
      if (!alive) return;
      dir = nextDir;
      const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        die(); return;
      }
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        die(); return;
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        placeFood();
        if (speed > 65) {
          speed -= 2;
          clearInterval(intervalId);
          intervalId = setInterval(step, speed);
        }
      } else {
        snake.pop();
      }

      draw();
    }

    function draw() {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      ctx.fillStyle = C.sun;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL/2, food.y * CELL + CELL/2, CELL/2 - 3, 0, Math.PI * 2);
      ctx.fill();

      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? C.ink : C.pine;
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
    }

    function die() {
      alive = false;
      clearInterval(intervalId);
      intervalId = null;
      if (score > best) {
        best = score;
        localStorage.setItem('snakeBest', best);
        bestEl.textContent = best;
      }
      overlayTx.textContent = score > 0 ? 'Game over · ' + score + ' pts' : 'Game over';
      playBtn.textContent = 'jugar otra vez →';
      overlay.classList.remove('hidden');
    }

    function start() {
      reset();
      overlay.classList.add('hidden');
      intervalId = setInterval(step, speed);
      draw();
    }

    function stop() {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      alive = false;
      overlayTx.textContent = 'Flechas o WASD. Swipe en celular.';
      playBtn.textContent = 'play →';
      overlay.classList.remove('hidden');
    }

    document.addEventListener('keydown', (e) => {
      if (currentGameId() !== 'snake' || !alive) return;
      const key = e.key.toLowerCase();
      if ((key === 'arrowup' || key === 'w') && dir.y === 0) nextDir = {x: 0, y: -1};
      else if ((key === 'arrowdown' || key === 's') && dir.y === 0) nextDir = {x: 0, y: 1};
      else if ((key === 'arrowleft' || key === 'a') && dir.x === 0) nextDir = {x: -1, y: 0};
      else if ((key === 'arrowright' || key === 'd') && dir.x === 0) nextDir = {x: 1, y: 0};
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    });

    let touchX = 0, touchY = 0;
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      touchX = t.clientX; touchY = t.clientY;
    }, {passive: true});
    canvas.addEventListener('touchend', (e) => {
      if (!alive) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchX;
      const dy = t.clientY - touchY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30 && dir.x === 0) nextDir = {x: 1, y: 0};
        else if (dx < -30 && dir.x === 0) nextDir = {x: -1, y: 0};
      } else {
        if (dy > 30 && dir.y === 0) nextDir = {x: 0, y: 1};
        else if (dy < -30 && dir.y === 0) nextDir = {x: 0, y: -1};
      }
    }, {passive: true});

    playBtn.addEventListener('click', start);

    reset();
    draw();

    return { start, stop };
  })();

  // ============================================
  // =============== PONG =======================
  // ============================================
  gameInstances.pong = (function() {
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const playerScoreEl = document.getElementById('pongPlayerScore');
    const cpuScoreEl    = document.getElementById('pongCpuScore');
    const overlay       = document.getElementById('pongOverlay');
    const overlayTx     = document.getElementById('pongOverlayText');
    const playBtn       = document.getElementById('pongPlayBtn');

    const PADDLE_W = 90;
    const PADDLE_H = 12;
    const BALL_R   = 8;
    const WIN_PTS  = 5;

    let playerX, cpuX, ballX, ballY, vx, vy, playerScore, cpuScore;
    let alive = false, rafId = null;
    let keys = {left: false, right: false};

    function reset() {
      playerX = W/2 - PADDLE_W/2;
      cpuX = W/2 - PADDLE_W/2;
      playerScore = 0;
      cpuScore = 0;
      playerScoreEl.textContent = 0;
      cpuScoreEl.textContent = 0;
      resetBall(Math.random() < 0.5 ? -1 : 1);
    }

    function resetBall(dir) {
      ballX = W/2;
      ballY = H/2;
      const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
      const speed = 4.5;
      vx = Math.sin(angle) * speed;
      vy = dir * Math.cos(angle) * speed;
    }

    function loop() {
      if (!alive) return;

      // Player movement (keyboard)
      if (keys.left)  playerX -= 6;
      if (keys.right) playerX += 6;
      playerX = Math.max(0, Math.min(W - PADDLE_W, playerX));

      // CPU AI: follows ball with smoothing + slight delay
      const cpuCenter = cpuX + PADDLE_W/2;
      const diff = ballX - cpuCenter;
      const cpuSpeed = 4.2;
      if (Math.abs(diff) > 4) cpuX += Math.sign(diff) * cpuSpeed;
      cpuX = Math.max(0, Math.min(W - PADDLE_W, cpuX));

      // Ball physics
      ballX += vx;
      ballY += vy;

      // Wall bounce (left/right)
      if (ballX < BALL_R) { ballX = BALL_R; vx = -vx; }
      if (ballX > W - BALL_R) { ballX = W - BALL_R; vx = -vx; }

      // Player paddle (bottom)
      if (vy > 0 && ballY > H - 30 - BALL_R && ballY < H - 30 + PADDLE_H + BALL_R) {
        if (ballX > playerX && ballX < playerX + PADDLE_W) {
          ballY = H - 30 - BALL_R;
          vy = -Math.abs(vy) * 1.04;
          // add english based on hit position
          const hit = (ballX - (playerX + PADDLE_W/2)) / (PADDLE_W/2);
          vx += hit * 1.5;
          vx = Math.max(-7, Math.min(7, vx));
        }
      }

      // CPU paddle (top)
      if (vy < 0 && ballY < 30 + PADDLE_H + BALL_R && ballY > 30 - BALL_R) {
        if (ballX > cpuX && ballX < cpuX + PADDLE_W) {
          ballY = 30 + PADDLE_H + BALL_R;
          vy = Math.abs(vy) * 1.04;
          const hit = (ballX - (cpuX + PADDLE_W/2)) / (PADDLE_W/2);
          vx += hit * 1.5;
          vx = Math.max(-7, Math.min(7, vx));
        }
      }

      // Score
      if (ballY < -BALL_R) {
        playerScore++;
        playerScoreEl.textContent = playerScore;
        if (playerScore >= WIN_PTS) return win('¡Ganaste! · ' + playerScore + '-' + cpuScore);
        resetBall(1);
      } else if (ballY > H + BALL_R) {
        cpuScore++;
        cpuScoreEl.textContent = cpuScore;
        if (cpuScore >= WIN_PTS) return win('Perdiste · ' + playerScore + '-' + cpuScore);
        resetBall(-1);
      }

      draw();
      rafId = requestAnimationFrame(loop);
    }

    function draw() {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      // Center dashed line
      ctx.strokeStyle = C.soft;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(0, H/2);
      ctx.lineTo(W, H/2);
      ctx.stroke();
      ctx.setLineDash([]);

      // CPU paddle (top)
      ctx.fillStyle = C.ink;
      ctx.fillRect(cpuX, 30, PADDLE_W, PADDLE_H);

      // Player paddle (bottom)
      ctx.fillStyle = C.pine;
      ctx.fillRect(playerX, H - 30 - PADDLE_H, PADDLE_W, PADDLE_H);

      // Ball
      ctx.fillStyle = C.sun;
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    function win(text) {
      alive = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      overlayTx.textContent = text;
      playBtn.textContent = 'jugar otra vez →';
      overlay.classList.remove('hidden');
    }

    function start() {
      reset();
      alive = true;
      overlay.classList.add('hidden');
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      alive = false;
      keys.left = false; keys.right = false;
      overlayTx.textContent = 'A/D o flechas para mover. Primero a 5 gana.';
      playBtn.textContent = 'play →';
      overlay.classList.remove('hidden');
    }

    document.addEventListener('keydown', (e) => {
      if (currentGameId() !== 'pong' || !alive) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { keys.left = true; e.preventDefault(); }
      if (k === 'arrowright' || k === 'd') { keys.right = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', (e) => {
      if (currentGameId() !== 'pong') return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keys.left = false;
      if (k === 'arrowright' || k === 'd') keys.right = false;
    });

    // Touch: drag finger horizontally
    canvas.addEventListener('touchmove', (e) => {
      if (!alive) return;
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const scale = W / rect.width;
      playerX = (t.clientX - rect.left) * scale - PADDLE_W/2;
      playerX = Math.max(0, Math.min(W - PADDLE_W, playerX));
      e.preventDefault();
    }, {passive: false});

    playBtn.addEventListener('click', start);

    reset();
    draw();

    return { start, stop };
  })();

  // ============================================
  // =========== SPACE INVADERS =================
  // ============================================
  gameInstances.invaders = (function() {
    const canvas = document.getElementById('invadersCanvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const scoreEl   = document.getElementById('invadersScore');
    const bestEl    = document.getElementById('invadersBest');
    const overlay   = document.getElementById('invadersOverlay');
    const overlayTx = document.getElementById('invadersOverlayText');
    const playBtn   = document.getElementById('invadersPlayBtn');

    const ROWS = 4, COLS = 8;
    const ALIEN_W = 28, ALIEN_H = 18;
    const ALIEN_GAP_X = 14, ALIEN_GAP_Y = 18;
    const PLAYER_W = 38, PLAYER_H = 14;
    const BULLET_W = 3, BULLET_H = 12;

    let aliens, playerX, bullets, alienBullets;
    let alienDx, alienStepDown;
    let score, best, alive = false, rafId = null;
    let lastAlienMove, lastAlienShoot;
    let keys = {left: false, right: false, shoot: false};
    let canShoot = true;

    best = parseInt(localStorage.getItem('invadersBest') || '0', 10);
    bestEl.textContent = best;

    function reset() {
      aliens = [];
      const totalW = COLS * ALIEN_W + (COLS - 1) * ALIEN_GAP_X;
      const startX = (W - totalW) / 2;
      const startY = 60;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          aliens.push({
            x: startX + c * (ALIEN_W + ALIEN_GAP_X),
            y: startY + r * (ALIEN_H + ALIEN_GAP_Y),
            row: r,
            alive: true
          });
        }
      }
      playerX = W/2 - PLAYER_W/2;
      bullets = [];
      alienBullets = [];
      alienDx = 0.6;
      alienStepDown = false;
      score = 0;
      scoreEl.textContent = 0;
      lastAlienMove = 0;
      lastAlienShoot = 0;
      canShoot = true;
    }

    function loop(ts) {
      if (!alive) return;

      // Player movement
      if (keys.left)  playerX -= 4;
      if (keys.right) playerX += 4;
      playerX = Math.max(0, Math.min(W - PLAYER_W, playerX));

      // Player shoot
      if (keys.shoot && canShoot && bullets.length < 3) {
        bullets.push({x: playerX + PLAYER_W/2 - BULLET_W/2, y: H - 40});
        canShoot = false;
        setTimeout(() => { canShoot = true; }, 280);
      }

      // Move bullets up
      bullets = bullets.filter(b => {
        b.y -= 7;
        return b.y > -BULLET_H;
      });

      // Move alien bullets down
      alienBullets = alienBullets.filter(b => {
        b.y += 4;
        return b.y < H;
      });

      // Move aliens (interval based on remaining count)
      const remaining = aliens.filter(a => a.alive).length;
      const moveInterval = Math.max(120, 600 - (ROWS * COLS - remaining) * 10);
      if (ts - lastAlienMove > moveInterval) {
        lastAlienMove = ts;

        // Check edges
        let hitEdge = false;
        for (const a of aliens) {
          if (!a.alive) continue;
          if ((alienDx > 0 && a.x + ALIEN_W + alienDx >= W - 4) ||
              (alienDx < 0 && a.x + alienDx <= 4)) {
            hitEdge = true; break;
          }
        }

        if (hitEdge) {
          alienDx = -alienDx * 1.05;
          for (const a of aliens) if (a.alive) a.y += 14;
        } else {
          for (const a of aliens) if (a.alive) a.x += alienDx * 18;
        }
      }

      // Alien shoots randomly
      if (ts - lastAlienShoot > 900 && remaining > 0) {
        lastAlienShoot = ts;
        const livingAliens = aliens.filter(a => a.alive);
        const shooter = livingAliens[Math.floor(Math.random() * livingAliens.length)];
        alienBullets.push({x: shooter.x + ALIEN_W/2 - BULLET_W/2, y: shooter.y + ALIEN_H});
      }

      // Bullet vs alien collisions
      for (const b of bullets) {
        for (const a of aliens) {
          if (!a.alive) continue;
          if (b.x < a.x + ALIEN_W && b.x + BULLET_W > a.x &&
              b.y < a.y + ALIEN_H && b.y + BULLET_H > a.y) {
            a.alive = false;
            b.y = -100; // mark for removal
            score += (ROWS - a.row) * 10;
            scoreEl.textContent = score;
          }
        }
      }
      bullets = bullets.filter(b => b.y > -BULLET_H);

      // Alien bullet vs player
      for (const b of alienBullets) {
        if (b.x < playerX + PLAYER_W && b.x + BULLET_W > playerX &&
            b.y + BULLET_H > H - 30 && b.y < H - 30 + PLAYER_H) {
          return die();
        }
      }

      // Aliens reach bottom
      for (const a of aliens) {
        if (a.alive && a.y + ALIEN_H >= H - 40) {
          return die();
        }
      }

      // Win
      if (remaining === 0) {
        return win();
      }

      draw();
      rafId = requestAnimationFrame(loop);
    }

    function draw() {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      // Aliens
      for (const a of aliens) {
        if (!a.alive) continue;
        ctx.fillStyle = a.row === 0 ? C.sun : (a.row === 1 ? C.ink : C.pine);
        ctx.fillRect(a.x, a.y, ALIEN_W, ALIEN_H);
        // little eyes
        ctx.fillStyle = C.bg;
        ctx.fillRect(a.x + 6, a.y + 5, 4, 4);
        ctx.fillRect(a.x + ALIEN_W - 10, a.y + 5, 4, 4);
      }

      // Player ship
      ctx.fillStyle = C.pine;
      ctx.fillRect(playerX, H - 30, PLAYER_W, PLAYER_H);
      ctx.fillRect(playerX + PLAYER_W/2 - 3, H - 36, 6, 6);

      // Bullets (player)
      ctx.fillStyle = C.sun;
      for (const b of bullets) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);

      // Alien bullets
      ctx.fillStyle = C.ink;
      for (const b of alienBullets) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);

      // Floor line
      ctx.strokeStyle = C.soft;
      ctx.beginPath();
      ctx.moveTo(0, H - 12);
      ctx.lineTo(W, H - 12);
      ctx.stroke();
    }

    function die() {
      alive = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (score > best) {
        best = score;
        localStorage.setItem('invadersBest', best);
        bestEl.textContent = best;
      }
      overlayTx.textContent = 'Game over · ' + score + ' pts';
      playBtn.textContent = 'jugar otra vez →';
      overlay.classList.remove('hidden');
    }

    function win() {
      alive = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (score > best) {
        best = score;
        localStorage.setItem('invadersBest', best);
        bestEl.textContent = best;
      }
      overlayTx.textContent = '¡Limpiaste el cielo! · ' + score + ' pts';
      playBtn.textContent = 'otra vez →';
      overlay.classList.remove('hidden');
    }

    function start() {
      reset();
      alive = true;
      overlay.classList.add('hidden');
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      alive = false;
      keys.left = false; keys.right = false; keys.shoot = false;
      overlayTx.textContent = 'A/D para mover. Espacio para disparar.';
      playBtn.textContent = 'play →';
      overlay.classList.remove('hidden');
    }

    document.addEventListener('keydown', (e) => {
      if (currentGameId() !== 'invaders' || !alive) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { keys.left = true; e.preventDefault(); }
      if (k === 'arrowright' || k === 'd') { keys.right = true; e.preventDefault(); }
      if (e.key === ' ' || k === 'w' || k === 'arrowup') { keys.shoot = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', (e) => {
      if (currentGameId() !== 'invaders') return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keys.left = false;
      if (k === 'arrowright' || k === 'd') keys.right = false;
      if (e.key === ' ' || k === 'w' || k === 'arrowup') keys.shoot = false;
    });

    // Touch: drag for movement, tap to shoot
    let touchMoveX = null;
    canvas.addEventListener('touchstart', (e) => {
      if (!alive) return;
      const t = e.touches[0];
      touchMoveX = t.clientX;
      // Tap to shoot if tap is brief
      if (canShoot && bullets.length < 3) {
        bullets.push({x: playerX + PLAYER_W/2 - BULLET_W/2, y: H - 40});
        canShoot = false;
        setTimeout(() => { canShoot = true; }, 280);
      }
    }, {passive: true});
    canvas.addEventListener('touchmove', (e) => {
      if (!alive) return;
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const scale = W / rect.width;
      playerX = (t.clientX - rect.left) * scale - PLAYER_W/2;
      playerX = Math.max(0, Math.min(W - PLAYER_W, playerX));
      e.preventDefault();
    }, {passive: false});

    playBtn.addEventListener('click', start);

    reset();
    draw();

    return { start, stop };
  })();

  // ============================================
  // ============== VECTOR FIELD ROBOT ==========
  // ============================================
  gameInstances.robot = (function() {
    const canvas = document.getElementById('robotCanvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const scoreEl   = document.getElementById('robotScore');
    const bestEl    = document.getElementById('robotBest');
    const overlay   = document.getElementById('robotOverlay');
    const overlayTx = document.getElementById('robotOverlayText');
    const playBtn   = document.getElementById('robotPlayBtn');

    // Constantes (mismas ideas que su control en C)
    const ROBOT_R   = 10;       // radio visual del robot
    const ROBOT_V   = 2.2;      // velocidad lineal constante (px/frame) - igual que VF_U_REF
    const K_THETA   = 0.10;     // ganancia P de orientación - igual que VF_K_THETA
    const REACH_R   = 14;       // distancia para considerar target alcanzado
    const COIN_R    = 8;
    const BOMB_R    = 14;
    const DURATION  = 45000;    // 45s por ronda
    const BOMB_DELAY = 6000;    // 6s antes de que aparezcan bombas
    const BOMB_INTERVAL = 2800; // ms entre spawns de bomba
    const BOMB_TTL = 8000;      // duración de cada bomba
    const TRAIL_MAX = 40;

    let robot, target, coins, bombs, score, best, alive, startTime, lastBombSpawn, intervalId, trail;

    best = parseInt(localStorage.getItem('robotBest') || '0', 10);
    bestEl.textContent = best;

    function reset() {
      robot = { x: W/2, y: H/2, theta: 0 };
      target = null;
      coins = [];
      bombs = [];
      score = 0;
      alive = false;
      trail = [];
      startTime = Date.now();
      lastBombSpawn = startTime;
      spawnCoin();
      scoreEl.textContent = 0;
    }

    function spawnCoin() {
      const margin = 40;
      coins.push({
        x: margin + Math.random() * (W - 2*margin),
        y: margin + Math.random() * (H - 2*margin),
        alive: true
      });
    }

    function spawnBomb() {
      const margin = 50;
      const x = margin + Math.random() * (W - 2*margin);
      const y = margin + Math.random() * (H - 2*margin);
      // No spawnear muy cerca del robot
      if (Math.hypot(x - robot.x, y - robot.y) < 90) return;
      bombs.push({ x, y, alive: true, born: Date.now() });
    }

    function wrapToPi(a) {
      return Math.atan2(Math.sin(a), Math.cos(a));
    }

    function step() {
      if (!alive) return;
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed >= DURATION) {
        finish('Tiempo · ' + score + ' coins');
        return;
      }

      // Ley de control: vector field hacia target (si hay)
      if (target) {
        const dx = target.x - robot.x;
        const dy = target.y - robot.y;
        const dist = Math.hypot(dx, dy);

        if (dist < REACH_R) {
          target = null;
        } else {
          // theta_d = atan2(Vy, Vx)
          const theta_d = Math.atan2(dy, dx);
          // e_theta = wrapToPi(theta_d - psi)
          const e_theta = wrapToPi(theta_d - robot.theta);
          // omega = K_THETA * e_theta (control P)
          robot.theta += K_THETA * e_theta;
          // Cinemática del uniciclo
          robot.x += ROBOT_V * Math.cos(robot.theta);
          robot.y += ROBOT_V * Math.sin(robot.theta);
        }
      } else {
        // Sin target: deriva lenta
        robot.x += 0.3 * ROBOT_V * Math.cos(robot.theta);
        robot.y += 0.3 * ROBOT_V * Math.sin(robot.theta);
      }

      // Rebote suave en bordes (no game over por pared)
      if (robot.x < ROBOT_R) {
        robot.x = ROBOT_R;
        robot.theta = Math.PI - robot.theta;
        target = null;
      }
      if (robot.x > W - ROBOT_R) {
        robot.x = W - ROBOT_R;
        robot.theta = Math.PI - robot.theta;
        target = null;
      }
      if (robot.y < ROBOT_R) {
        robot.y = ROBOT_R;
        robot.theta = -robot.theta;
        target = null;
      }
      if (robot.y > H - ROBOT_R) {
        robot.y = H - ROBOT_R;
        robot.theta = -robot.theta;
        target = null;
      }

      // Trail
      trail.push({ x: robot.x, y: robot.y });
      if (trail.length > TRAIL_MAX) trail.shift();

      // Recolección de monedas (auto al tocar)
      coins.forEach(c => {
        if (c.alive && Math.hypot(c.x - robot.x, c.y - robot.y) < ROBOT_R + COIN_R) {
          c.alive = false;
          score++;
          scoreEl.textContent = score;
          if (target && Math.hypot(target.x - c.x, target.y - c.y) < 5) target = null;
        }
      });
      coins = coins.filter(c => c.alive);
      if (coins.length === 0) spawnCoin();

      // Bombas (después del delay)
      if (elapsed > BOMB_DELAY && now - lastBombSpawn > BOMB_INTERVAL) {
        spawnBomb();
        lastBombSpawn = now;
      }

      bombs.forEach(b => {
        if (!b.alive) return;
        if (now - b.born > BOMB_TTL) { b.alive = false; return; }
        if (Math.hypot(b.x - robot.x, b.y - robot.y) < BOMB_R + ROBOT_R) {
          die();
        }
      });
      bombs = bombs.filter(b => b.alive);

      draw(elapsed);
    }

    function draw(elapsed) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      // Barra de tiempo arriba
      const progress = (elapsed || 0) / DURATION;
      ctx.fillStyle = 'rgba(28,34,48,0.08)';
      ctx.fillRect(0, 0, W, 4);
      ctx.fillStyle = C.sun;
      ctx.fillRect(0, 0, W * (1 - progress), 4);

      // Trail
      if (trail.length > 1) {
        ctx.strokeStyle = 'rgba(44,74,62,0.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();
      }

      // Target (crosshair)
      if (target) {
        ctx.strokeStyle = 'rgba(28,34,48,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 8, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(target.x - 14, target.y);
        ctx.lineTo(target.x - 4,  target.y);
        ctx.moveTo(target.x + 4,  target.y);
        ctx.lineTo(target.x + 14, target.y);
        ctx.moveTo(target.x, target.y - 14);
        ctx.lineTo(target.x, target.y - 4);
        ctx.moveTo(target.x, target.y + 4);
        ctx.lineTo(target.x, target.y + 14);
        ctx.stroke();
      }

      // Monedas
      ctx.fillStyle = C.sun;
      coins.forEach(c => {
        if (!c.alive) return;
        ctx.beginPath();
        ctx.arc(c.x, c.y, COIN_R, 0, Math.PI*2);
        ctx.fill();
      });

      // Bombas (X negras con pulse)
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      bombs.forEach(b => {
        if (!b.alive) return;
        const age = Date.now() - b.born;
        const pulse = 1 + 0.15 * Math.sin(age / 120);
        const r = BOMB_R * pulse;
        ctx.beginPath();
        ctx.moveTo(b.x - r, b.y - r);
        ctx.lineTo(b.x + r, b.y + r);
        ctx.moveTo(b.x + r, b.y - r);
        ctx.lineTo(b.x - r, b.y + r);
        ctx.stroke();
      });

      // Robot (triángulo orientado)
      ctx.fillStyle = C.pine;
      ctx.save();
      ctx.translate(robot.x, robot.y);
      ctx.rotate(robot.theta);
      ctx.beginPath();
      ctx.moveTo(ROBOT_R + 4, 0);
      ctx.lineTo(-ROBOT_R, -ROBOT_R * 0.7);
      ctx.lineTo(-ROBOT_R, ROBOT_R * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function die() {
      alive = false;
      clearInterval(intervalId);
      finish('Boom · ' + score + ' coins');
    }

    function finish(msg) {
      if (score > best) {
        best = score;
        localStorage.setItem('robotBest', best);
        bestEl.textContent = best;
      }
      overlayTx.textContent = msg;
      playBtn.textContent = 'jugar otra vez →';
      overlay.classList.remove('hidden');
    }

    function start() {
      reset();
      alive = true;
      intervalId = setInterval(step, 16);
      overlay.classList.add('hidden');
      draw(0);
    }

    function stop() {
      alive = false;
      clearInterval(intervalId);
    }

    // Click/touch para colocar target
    function placeTarget(clientX, clientY) {
      if (!alive) return;
      const rect = canvas.getBoundingClientRect();
      const scale = W / rect.width;
      target = {
        x: (clientX - rect.left) * scale,
        y: (clientY - rect.top) * scale
      };
    }

    canvas.addEventListener('click', (e) => {
      placeTarget(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      placeTarget(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });

    playBtn.addEventListener('click', start);

    reset();
    draw(0);

    return { start, stop };
  })();

  // ============================================
  // ============== INIT ========================
  // ============================================
  goTo(0);

})();
