// Rendu canvas, boucle de jeu et gestion des entrées (clavier, tactile).
// Toute la logique de jeu est dans game.js ; ce fichier ne fait qu'afficher et relayer.
import {
  createGame,
  queueDirection,
  start,
  togglePause,
  pause,
  step,
  tickInterval,
  resolveDifficulty,
} from './game.js';
import { t, resolveLanguage, nextLanguage, DEFAULT_LANGUAGE } from './i18n.js';
import { unlockAudio, playEat } from './sound.js';

const BEST_KEY = 'snake.best';
const LANG_KEY = 'snake.lang';
const DIFFICULTY_KEY = 'snake.difficulty';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const pauseBtn = document.getElementById('pause-btn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');
const difficultySelect = document.getElementById('difficulty');
const langBtn = document.getElementById('lang-btn');

// --- Préférences (localStorage peut être indisponible : navigation privée, cookies bloqués…) ---
function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Stockage indisponible : la valeur reste valable pour la session en cours.
  }
}

function loadBest() {
  const n = Number.parseInt(load(BEST_KEY) ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Langue enregistrée, sinon celle du navigateur, sinon le français.
function loadLanguage() {
  return resolveLanguage(load(LANG_KEY)) ?? resolveLanguage(navigator.language) ?? DEFAULT_LANGUAGE;
}

let state = createGame();
let best = loadBest();
let lang = loadLanguage();
let difficulty = resolveDifficulty(load(DIFFICULTY_KEY));
let lastScore = 0;
let lastStatus = null;
let accumulator = 0;
let lastTime = 0;

// --- Actions ---
function newGame() {
  state = createGame();
  accumulator = 0;
}

function play() {
  if (state.status === 'over' || state.status === 'won') newGame();
  state = start(state);
}

function steer(dir) {
  if (state.status === 'over' || state.status === 'won') return;
  state = queueDirection(state, dir);
  // La première direction lance la partie ; elle reprend aussi après une pause.
  state = start(state);
}

// --- Langue ---
function applyLanguage() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(lang, el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(lang, el.dataset.i18nAria));
  }
  langBtn.lang = nextLanguage(lang); // le bouton affiche le nom de l'autre langue
  lastStatus = null; // force syncUi à réécrire l'overlay et le bouton pause
}

langBtn.addEventListener('click', () => {
  lang = nextLanguage(lang);
  save(LANG_KEY, lang);
  applyLanguage();
  langBtn.blur(); // évite qu'Espace ne « clique » le bouton ensuite
});

// --- Difficulté : modifiable seulement hors partie (le menu est désactivé en jeu et en pause) ---
difficultySelect.addEventListener('change', () => {
  difficulty = resolveDifficulty(difficultySelect.value);
  save(DIFFICULTY_KEY, difficulty);
  difficultySelect.blur(); // les flèches doivent ensuite diriger le serpent
});

// --- Son : les navigateurs exigent une interaction avant d'autoriser l'audio ---
for (const type of ['keydown', 'pointerdown', 'touchstart']) {
  window.addEventListener(type, unlockAudio, { passive: true });
}

// --- Clavier ---
const KEY_DIRS = {
  arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
  z: 'up', q: 'left', s: 'down', d: 'right', // ZQSD (AZERTY)
  w: 'up', a: 'left', // WASD (QWERTY) — « s » et « d » sont communs
};

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // Le menu de difficulté garde ses propres touches (flèches, Espace, Entrée).
  if (e.target === difficultySelect) return;
  const key = e.key.toLowerCase();
  const dir = KEY_DIRS[key];
  if (dir) {
    e.preventDefault();
    steer(dir);
  } else if (key === ' ' || key === 'spacebar') {
    e.preventDefault();
    if (e.repeat) return;
    if (state.status === 'playing' || state.status === 'paused') state = togglePause(state);
    else play();
  } else if (key === 'enter') {
    // Entrée relance une partie terminée (le bouton focalisé gère déjà le clic).
    if (state.status !== 'playing' && state.status !== 'paused' && document.activeElement !== overlayBtn) {
      e.preventDefault();
      play();
    }
  } else if (key === 'p' || key === 'escape') {
    state = pause(state);
  }
});

// --- Tactile : swipe sur le plateau ---
const SWIPE_MIN = 24; // px
let touchStart = null;

board.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

board.addEventListener('touchmove', (e) => {
  // Empêche le défilement / rebond de la page pendant le swipe.
  if (touchStart) e.preventDefault();
}, { passive: false });

board.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
  if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 'right' : 'left');
  else steer(dy > 0 ? 'down' : 'up');
});

// --- Boutons ---
overlayBtn.addEventListener('click', () => {
  if (state.status === 'paused') state = togglePause(state);
  else play();
});

pauseBtn.addEventListener('click', () => {
  if (state.status === 'playing' || state.status === 'paused') state = togglePause(state);
  else play();
  pauseBtn.blur(); // évite qu'Espace ne « clique » le bouton ensuite
});

// Pause automatique quand l'onglet est masqué.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) state = pause(state);
});

// --- Dimensionnement du canvas (net sur écrans haute densité) ---
let cell = 0;

function resize() {
  const rect = board.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(canvas.width / state.size, 0, 0, canvas.height / state.size, 0, 0);
  cell = rect.width / state.size;
}

new ResizeObserver(resize).observe(board);

// --- Rendu ---
// Le contexte est mis à l'échelle : 1 unité = 1 case de la grille.

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBackground() {
  const n = state.size;
  ctx.fillStyle = '#161d2e';
  ctx.fillRect(0, 0, n, n);
  // Damier discret pour lire la grille.
  ctx.fillStyle = '#1a2235';
  for (let y = 0; y < n; y++) {
    for (let x = (y % 2); x < n; x += 2) ctx.fillRect(x, y, 1, 1);
  }
}

function drawApple(apple, time) {
  if (!apple) return;
  const pulse = 1 + Math.sin(time / 180) * 0.04;
  const cx = apple.x + 0.5;
  const cy = apple.y + 0.55;
  const r = 0.38 * pulse;

  // Halo
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.9);
  glow.addColorStop(0, 'rgba(255, 77, 94, 0.35)');
  glow.addColorStop(1, 'rgba(255, 77, 94, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(apple.x - 0.5, apple.y - 0.5, 2, 2);

  // Fruit
  const body = ctx.createRadialGradient(cx - 0.12, cy - 0.12, 0.05, cx, cy, r);
  body.addColorStop(0, '#ff8a94');
  body.addColorStop(0.5, '#ff4d5e');
  body.addColorStop(1, '#c21f35');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Queue et feuille
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.9);
  ctx.lineTo(cx + 0.04, cy - r - 0.12);
  ctx.stroke();
  ctx.fillStyle = '#4fd67f';
  ctx.beginPath();
  ctx.ellipse(cx + 0.14, cy - r - 0.06, 0.13, 0.06, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function segmentColor(i, len) {
  // Dégradé de vert : tête claire → queue foncée.
  const t = len > 1 ? i / (len - 1) : 0;
  const light = 62 - t * 30;
  const hue = 135 + t * 15;
  return `hsl(${hue}, 68%, ${light}%)`;
}

function drawSnake() {
  const { snake, direction, status } = state;
  const len = snake.length;
  const pad = 0.08;

  // De la queue vers la tête, pour que la tête soit dessinée par-dessus.
  for (let i = len - 1; i >= 0; i--) {
    const c = snake[i];
    ctx.fillStyle = segmentColor(i, len);
    roundRect(c.x + pad, c.y + pad, 1 - pad * 2, 1 - pad * 2, i === 0 ? 0.35 : 0.22);
    ctx.fill();

    // Pont entre segments consécutifs pour un corps continu.
    const next = snake[i - 1];
    if (next) {
      const minX = Math.min(c.x, next.x);
      const minY = Math.min(c.y, next.y);
      if (c.x !== next.x) ctx.fillRect(minX + 0.5, c.y + pad, 1, 1 - pad * 2);
      else ctx.fillRect(c.x + pad, minY + 0.5, 1 - pad * 2, 1);
    }
  }

  // Tête : contour + yeux orientés selon la direction.
  const head = snake[0];
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 0.05;
  roundRect(head.x + pad, head.y + pad, 1 - pad * 2, 1 - pad * 2, 0.35);
  ctx.stroke();

  const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  const [dx, dy] = dir;
  const cx = head.x + 0.5 + dx * 0.12;
  const cy = head.y + 0.5 + dy * 0.12;
  // Vecteur perpendiculaire pour écarter les deux yeux.
  const px = -dy * 0.2;
  const py = dx * 0.2;
  const dead = status === 'over';

  for (const s of [-1, 1]) {
    const ex = cx + px * s;
    const ey = cy + py * s;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, 0.13, 0, Math.PI * 2);
    ctx.fill();
    if (dead) {
      // Yeux en croix
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.moveTo(ex - 0.07, ey - 0.07); ctx.lineTo(ex + 0.07, ey + 0.07);
      ctx.moveTo(ex + 0.07, ey - 0.07); ctx.lineTo(ex - 0.07, ey + 0.07);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#0b1a10';
      ctx.beginPath();
      ctx.arc(ex + dx * 0.05, ey + dy * 0.05, 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function render(time) {
  if (!cell) return;
  drawBackground();
  drawApple(state.apple, time);
  drawSnake();
}

// --- Interface (HUD + overlay) ---
function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth; // relance l'animation CSS
  el.classList.add('bump');
}

function showOverlay(kind, title, text, button) {
  overlay.className = `overlay ${kind}`;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayBtn.textContent = button;
}

function syncUi() {
  if (state.score !== lastScore) {
    scoreEl.textContent = String(state.score);
    if (state.score > lastScore) bump(scoreEl);
    lastScore = state.score;
  }

  if (state.score > best) {
    best = state.score;
    bestEl.textContent = String(best);
    save(BEST_KEY, best);
  }

  if (state.status === lastStatus) return;
  lastStatus = state.status;

  const paused = state.status === 'paused';
  pauseBtn.textContent = paused ? '▶' : '❚❚';
  pauseBtn.setAttribute('aria-label', t(lang, paused ? 'resume' : 'pause'));
  // Pas de changement de vitesse en cours de partie.
  difficultySelect.disabled = state.status === 'playing' || paused;

  switch (state.status) {
    case 'ready':
      showOverlay('ready', 'Snake', t(lang, 'readyText'), t(lang, 'play'));
      break;
    case 'paused':
      showOverlay('paused', t(lang, 'pausedTitle'), t(lang, 'pausedText'), t(lang, 'resume'));
      break;
    case 'over': {
      const record = state.score > 0 && state.score === best ? t(lang, 'newRecord') : '';
      showOverlay('over', t(lang, 'overTitle'),
        `${t(lang, 'overScore', { score: state.score })}${record}\n${t(lang, 'overHint')}`,
        t(lang, 'replay'));
      overlayBtn.focus({ preventScroll: true });
      break;
    }
    case 'won':
      showOverlay('won', t(lang, 'wonTitle'), t(lang, 'wonText', { score: state.score }), t(lang, 'replay'));
      overlayBtn.focus({ preventScroll: true });
      break;
    default:
      overlay.className = 'overlay hidden';
      if (overlay.contains(document.activeElement)) document.activeElement.blur();
  }
}

// --- Boucle de jeu à pas fixe ---
function frame(time) {
  const dt = Math.min(time - (lastTime || time), 250); // borne après un onglet en arrière-plan
  lastTime = time;

  if (state.status === 'playing') {
    accumulator += dt;
    let interval = tickInterval(state.score, difficulty);
    while (accumulator >= interval && state.status === 'playing') {
      accumulator -= interval;
      const before = state.score;
      state = step(state);
      if (state.score > before) playEat();
      interval = tickInterval(state.score, difficulty);
    }
  } else {
    accumulator = 0;
  }

  syncUi();
  render(time);
  requestAnimationFrame(frame);
}

bestEl.textContent = String(best);
difficultySelect.value = difficulty;
applyLanguage();
resize();
requestAnimationFrame(frame);
