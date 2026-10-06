// Textes de l'interface en français et en anglais. Module pur (aucun accès au DOM) :
// main.js applique les traductions, les tests vérifient que les deux langues sont complètes.

export const LANGUAGES = Object.freeze(['fr', 'en']);
export const DEFAULT_LANGUAGE = 'fr';

const MESSAGES = {
  fr: {
    scoreLabel: 'Score',
    bestLabel: 'Record',
    pause: 'Pause',
    resume: 'Reprendre',
    board: 'Plateau de jeu Snake',
    readyText: 'Appuie sur une flèche, ZQSD/WASD, ou swipe pour commencer',
    play: 'Jouer',
    pausedTitle: 'Pause',
    pausedText: 'Espace ou le bouton pour reprendre',
    overTitle: 'Game Over',
    overScore: 'Score : {score}',
    newRecord: ' — nouveau record !',
    overHint: 'Espace ou Entrée pour rejouer',
    wonTitle: 'Victoire !',
    wonText: 'Grille remplie ! Score : {score}',
    replay: 'Rejouer',
    difficulty: 'Difficulté',
    'difficulty.normal': 'Normal',
    'difficulty.fast': 'Rapide (×1,5)',
    'difficulty.extreme': 'Extrême (×3)',
    switchLanguage: 'English',
    switchLanguageLabel: 'Switch to English',
    helpSteer: 'pour diriger',
    helpPause: 'pause',
    spaceKey: 'Espace',
    helpSwipe: 'Swipe pour diriger',
  },
  en: {
    scoreLabel: 'Score',
    bestLabel: 'Best',
    pause: 'Pause',
    resume: 'Resume',
    board: 'Snake game board',
    readyText: 'Press an arrow key, ZQSD/WASD, or swipe to start',
    play: 'Play',
    pausedTitle: 'Paused',
    pausedText: 'Space or the button to resume',
    overTitle: 'Game Over',
    overScore: 'Score: {score}',
    newRecord: ' — new record!',
    overHint: 'Space or Enter to play again',
    wonTitle: 'You win!',
    wonText: 'Board full! Score: {score}',
    replay: 'Play again',
    difficulty: 'Difficulty',
    'difficulty.normal': 'Normal',
    'difficulty.fast': 'Fast (×1.5)',
    'difficulty.extreme': 'Extreme (×3)',
    switchLanguage: 'Français',
    switchLanguageLabel: 'Passer en français',
    helpSteer: 'to steer',
    helpPause: 'pause',
    spaceKey: 'Space',
    helpSwipe: 'Swipe to steer',
  },
};

/** Clés de traduction d'une langue (exposé pour les tests). */
export function messageKeys(lang) {
  return Object.keys(MESSAGES[lang] ?? {});
}

/** Ramène une valeur quelconque (localStorage, navigator.language…) à une langue gérée. */
export function resolveLanguage(value) {
  const code = String(value ?? '').toLowerCase().slice(0, 2);
  return LANGUAGES.includes(code) ? code : null;
}

/** Langue suivante (bascule fr ↔ en). */
export function nextLanguage(lang) {
  return lang === 'fr' ? 'en' : 'fr';
}

/**
 * Traduit une clé, en remplaçant les paramètres {nom}.
 * Repli : langue par défaut, puis la clé elle-même.
 */
export function t(lang, key, params = {}) {
  const table = MESSAGES[resolveLanguage(lang) ?? DEFAULT_LANGUAGE];
  const text = table[key] ?? MESSAGES[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
