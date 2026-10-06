// Logique pure du jeu Snake : aucun accès au DOM, aucune dépendance.
// Chaque fonction reçoit un état et renvoie un nouvel état (jamais de mutation),
// ce qui rend la logique simple à tester sous Node.

export const GRID_SIZE = 20;

// Nombre maximal de changements de direction mis en file entre deux pas.
export const MAX_QUEUE = 3;

// Vitesse : intervalle (ms) entre deux déplacements.
export const BASE_INTERVAL = 150;
export const SPEED_STEP = 10; // gain toutes les APPLES_PER_LEVEL pommes
export const APPLES_PER_LEVEL = 5;
export const MIN_INTERVAL = 60;

export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
});

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Statuts possibles : 'ready' (avant le départ), 'playing', 'paused',
// 'over' (défaite) et 'won' (grille entièrement remplie).

/**
 * Crée une nouvelle partie : serpent de 3 segments au centre, orienté à droite.
 * @param {() => number} rng générateur aléatoire dans [0, 1[ (injectable pour les tests)
 * @param {number} size taille de la grille
 */
export function createGame(rng = Math.random, size = GRID_SIZE) {
  const cy = Math.floor(size / 2);
  const cx = Math.floor(size / 2);
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return {
    size,
    snake, // snake[0] = tête
    direction: 'right',
    queue: [],
    apple: placeApple(snake, size, rng),
    score: 0,
    status: 'ready',
  };
}

/**
 * Choisit une case libre au hasard pour la pomme.
 * Renvoie null si la grille est pleine : pas de boucle de tirage infinie,
 * on tire directement parmi la liste des cases libres.
 */
export function placeApple(snake, size, rng = Math.random) {
  const occupied = new Set(snake.map((c) => c.y * size + c.x));
  const free = [];
  for (let i = 0; i < size * size; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return null;
  const pick = free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
  return { x: pick % size, y: Math.floor(pick / size) };
}

/**
 * Met en file un changement de direction.
 * Ignore le demi-tour et la répétition de la direction déjà prévue :
 * la comparaison se fait avec la dernière direction en file (ou la direction
 * courante), ce qui empêche un demi-tour via deux touches rapides.
 */
export function queueDirection(state, dir) {
  if (!(dir in DIRECTIONS)) return state;
  if (state.status === 'over' || state.status === 'won') return state;
  if (state.queue.length >= MAX_QUEUE) return state;
  const last = state.queue.length ? state.queue[state.queue.length - 1] : state.direction;
  if (dir === last || dir === OPPOSITE[last]) return state;
  return { ...state, queue: [...state.queue, dir] };
}

/** Lance la partie si elle est prête (ou reprend après une pause). */
export function start(state) {
  if (state.status === 'ready' || state.status === 'paused') {
    return { ...state, status: 'playing' };
  }
  return state;
}

/** Bascule entre jeu et pause. */
export function togglePause(state) {
  if (state.status === 'playing') return { ...state, status: 'paused' };
  if (state.status === 'paused') return { ...state, status: 'playing' };
  return state;
}

/** Met en pause uniquement si la partie est en cours (ex. onglet masqué). */
export function pause(state) {
  return state.status === 'playing' ? { ...state, status: 'paused' } : state;
}

/** Avance le serpent d'une case. Sans effet hors du statut 'playing'. */
export function step(state, rng = Math.random) {
  if (state.status !== 'playing') return state;

  const [nextDir, ...rest] = state.queue;
  const direction = nextDir ?? state.direction;
  const { x: dx, y: dy } = DIRECTIONS[direction];
  const head = state.snake[0];
  const newHead = { x: head.x + dx, y: head.y + dy };
  const base = { ...state, direction, queue: rest };

  // Collision avec un mur.
  if (newHead.x < 0 || newHead.y < 0 || newHead.x >= state.size || newHead.y >= state.size) {
    return { ...base, status: 'over' };
  }

  const eats = state.apple !== null && newHead.x === state.apple.x && newHead.y === state.apple.y;
  // Si le serpent ne mange pas, la queue se libère pendant ce pas :
  // la tête peut donc entrer dans la case que la queue quitte.
  const body = eats ? state.snake : state.snake.slice(0, -1);

  // Collision avec soi-même.
  if (body.some((c) => c.x === newHead.x && c.y === newHead.y)) {
    return { ...base, status: 'over' };
  }

  const snake = [newHead, ...body];
  if (!eats) return { ...base, snake };

  const apple = placeApple(snake, state.size, rng);
  return {
    ...base,
    snake,
    apple,
    score: state.score + 1,
    // Plus aucune case libre : la partie est gagnée.
    status: apple === null ? 'won' : 'playing',
  };
}

/** Intervalle entre deux pas (ms) : un peu plus rapide toutes les 5 pommes. */
export function tickInterval(score) {
  const level = Math.floor(score / APPLES_PER_LEVEL);
  return Math.max(MIN_INTERVAL, BASE_INTERVAL - level * SPEED_STEP);
}
