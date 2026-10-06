// Tests des traductions (node:test, aucune dépendance).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANGUAGES, messageKeys, resolveLanguage, nextLanguage, t } from '../src/i18n.js';

test('le français et l’anglais ont exactement les mêmes clés', () => {
  assert.deepEqual(LANGUAGES, ['fr', 'en']);
  assert.deepEqual(messageKeys('en').sort(), messageKeys('fr').sort());
});

test('chaque clé utilisée dans index.html existe', () => {
  const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
  const used = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length > 0);
  for (const key of used) assert.ok(messageKeys('fr').includes(key), `clé manquante : ${key}`);
});

test('chaque difficulté a un libellé', () => {
  for (const d of ['normal', 'fast', 'extreme']) {
    assert.ok(messageKeys('fr').includes(`difficulty.${d}`));
  }
});

test('traduction et paramètres', () => {
  assert.equal(t('fr', 'play'), 'Jouer');
  assert.equal(t('en', 'play'), 'Play');
  assert.equal(t('fr', 'overScore', { score: 12 }), 'Score : 12');
  assert.equal(t('en', 'wonText', { score: 3 }), 'Board full! Score: 3');
  // Paramètre absent : le motif reste visible plutôt que « undefined ».
  assert.equal(t('en', 'overScore'), 'Score: {score}');
});

test('replis : langue inconnue → français, clé inconnue → la clé', () => {
  assert.equal(t('de', 'play'), 'Jouer');
  assert.equal(t('en', 'cle-inconnue'), 'cle-inconnue');
});

test('résolution de la langue (localStorage, navigator.language)', () => {
  assert.equal(resolveLanguage('fr-FR'), 'fr');
  assert.equal(resolveLanguage('en-US'), 'en');
  assert.equal(resolveLanguage('EN'), 'en');
  assert.equal(resolveLanguage('de-DE'), null);
  assert.equal(resolveLanguage(null), null);
  assert.equal(nextLanguage('fr'), 'en');
  assert.equal(nextLanguage('en'), 'fr');
});
