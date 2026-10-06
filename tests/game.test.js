// Tests de la logique pure du jeu (node:test, aucune dépendance).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_SIZE,
  MAX_QUEUE,
  BASE_INTERVAL,
  MIN_INTERVAL,
  createGame,
  placeApple,
  queueDirection,
  start,
  togglePause,
  pause,
  step,
  tickInterval,
  resolveDifficulty,
  DIFFICULTIES,
} from '../src/game.js';

// Générateur « aléatoire » déterministe : toujours la première case libre.
const first = () => 0;

// Construit une partie en cours avec un état contrôlé.
function game(overrides = {}) {
  return { ...start(createGame(first)), ...overrides };
}

test('nouvelle partie : grille 20x20, serpent de 3, pomme hors du serpent', () => {
  const s = createGame();
  assert.equal(s.size, GRID_SIZE);
  assert.equal(s.snake.length, 3);
  assert.equal(s.status, 'ready');
  assert.equal(s.score, 0);
  assert.ok(!s.snake.some((c) => c.x === s.apple.x && c.y === s.apple.y));
});

test('aucun déplacement tant que la partie n’est pas lancée', () => {
  const s = createGame(first);
  assert.equal(step(s), s);
  assert.equal(start(s).status, 'playing');
});

test('le serpent avance d’une case dans sa direction', () => {
  const s = game({ apple: { x: 0, y: 0 } });
  const n = step(s);
  assert.deepEqual(n.snake[0], { x: 11, y: 10 });
  assert.equal(n.snake.length, 3);
  assert.deepEqual(n.snake.at(-1), { x: 9, y: 10 });
});

test('manger une pomme : +1 segment, +1 point, nouvelle pomme sur case libre', () => {
  const s = game({ apple: { x: 11, y: 10 } });
  const n = step(s, first);
  assert.equal(n.snake.length, 4);
  assert.equal(n.score, 1);
  assert.ok(n.apple);
  assert.ok(!n.snake.some((c) => c.x === n.apple.x && c.y === n.apple.y));
});

test('placeApple choisit uniquement parmi les cases libres', () => {
  // Grille 2x2 avec 3 cases occupées : seule (1,1) est libre.
  const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  for (const r of [0, 0.5, 0.999999]) {
    assert.deepEqual(placeApple(snake, 2, () => r), { x: 1, y: 1 });
  }
});

test('grille pleine : placeApple renvoie null (pas de boucle infinie)', () => {
  const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  assert.equal(placeApple(snake, 2, Math.random), null);
});

test('manger la dernière pomme remplit la grille → victoire', () => {
  // Grille 2x2 : serpent de 3 cases, la pomme occupe la dernière case libre.
  const s = {
    size: 2,
    snake: [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    direction: 'right',
    queue: [],
    apple: { x: 1, y: 1 },
    score: 0,
    status: 'playing',
  };
  const n = step(s);
  assert.equal(n.status, 'won');
  assert.equal(n.apple, null);
  assert.equal(n.snake.length, 4);
  assert.equal(n.score, 1);
  // Une fois gagnée, la partie ne bouge plus.
  assert.equal(step(n), n);
});

test('collision avec un mur → game over', () => {
  const s = game({ snake: [{ x: 19, y: 5 }, { x: 18, y: 5 }, { x: 17, y: 5 }] });
  assert.equal(step(s).status, 'over');
  const up = game({ snake: [{ x: 3, y: 0 }, { x: 3, y: 1 }], direction: 'up' });
  assert.equal(step(up).status, 'over');
});

test('collision avec soi-même → game over', () => {
  // Serpent en U : en allant vers le bas, la tête rentre dans son corps.
  const s = game({
    snake: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }],
    direction: 'left',
    queue: ['down'],
  });
  assert.equal(step(s).status, 'over');
});

test('la tête peut entrer dans la case que la queue libère', () => {
  // Carré de 4 : la tête suit la queue qui se déplace en même temps.
  const s = game({
    snake: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }],
    direction: 'left',
    queue: ['down'],
    apple: { x: 0, y: 0 },
  });
  const n = step(s);
  assert.equal(n.status, 'playing');
  assert.deepEqual(n.snake[0], { x: 5, y: 6 });
});

test('demi-tour instantané interdit', () => {
  const s = game(); // direction : droite
  assert.deepEqual(queueDirection(s, 'left').queue, []);
  assert.deepEqual(queueDirection(s, 'right').queue, []);
  assert.deepEqual(queueDirection(s, 'up').queue, ['up']);
});

test('changements rapides mis en file, sans demi-tour sur la dernière direction prévue', () => {
  let s = game(); // direction : droite
  s = queueDirection(s, 'up');
  s = queueDirection(s, 'down'); // opposé de la dernière direction en file → ignoré
  s = queueDirection(s, 'left');
  assert.deepEqual(s.queue, ['up', 'left']);
  s = step(s);
  assert.equal(s.direction, 'up');
  s = step(s);
  assert.equal(s.direction, 'left');
  assert.equal(s.status, 'playing');
});

test('la file de directions est limitée', () => {
  let s = game();
  for (const d of ['up', 'left', 'down', 'right', 'up']) s = queueDirection(s, d);
  assert.equal(s.queue.length, MAX_QUEUE);
  assert.deepEqual(s.queue, ['up', 'left', 'down']);
});

test('direction inconnue ignorée', () => {
  const s = game();
  assert.equal(queueDirection(s, 'diagonale'), s);
});

test('pause / reprise', () => {
  const s = game();
  const p = togglePause(s);
  assert.equal(p.status, 'paused');
  assert.equal(step(p), p);
  assert.equal(togglePause(p).status, 'playing');
  assert.equal(pause(s).status, 'paused');
  const over = { ...s, status: 'over' };
  assert.equal(pause(over), over);
  assert.equal(togglePause(over), over);
});

test('la vitesse augmente toutes les 5 pommes, avec un plancher', () => {
  assert.equal(tickInterval(0), BASE_INTERVAL);
  assert.equal(tickInterval(4), BASE_INTERVAL);
  assert.ok(tickInterval(5) < tickInterval(4));
  assert.equal(tickInterval(9), tickInterval(5));
  assert.ok(tickInterval(10) < tickInterval(9));
  assert.equal(tickInterval(1000), MIN_INTERVAL);
});

test('les fonctions ne modifient jamais l’état reçu', () => {
  const s = game({ apple: { x: 11, y: 10 } });
  const snapshot = structuredClone(s);
  step(queueDirection(s, 'up'), first);
  togglePause(s);
  assert.deepEqual(s, snapshot);
});

test('difficulté : rapide = vitesse ×1,5, extrême = ×3 par rapport au normal', () => {
  for (const score of [0, 7, 1000]) {
    const normal = tickInterval(score, 'normal');
    assert.equal(tickInterval(score), normal);
    assert.equal(tickInterval(score, 'fast'), normal / 1.5);
    assert.equal(tickInterval(score, 'extreme'), normal / 3);
  }
  assert.deepEqual(Object.keys(DIFFICULTIES), ['normal', 'fast', 'extreme']);
});

test('difficulté inconnue → normale', () => {
  for (const v of [null, undefined, '', 'toString', '__proto__', 'impossible', 3]) {
    assert.equal(resolveDifficulty(v), 'normal');
    assert.equal(tickInterval(0, v), BASE_INTERVAL);
  }
  assert.equal(resolveDifficulty('extreme'), 'extreme');
});
