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
    { id: 'invaders', name: 'Space Invaders' }
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
  // ============== INIT ========================
  // ============================================
  goTo(0);

})();
