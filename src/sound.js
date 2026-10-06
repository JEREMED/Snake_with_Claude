// Effets sonores synthétisés avec la Web Audio API : aucun fichier audio à charger.
// Les navigateurs n'autorisent le son qu'après une interaction de l'utilisateur :
// unlockAudio() est appelé sur la première touche / le premier toucher.

let ctx = null;

/** Crée (ou réveille) le contexte audio. À appeler depuis un gestionnaire d'événement utilisateur. */
export function unlockAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx ??= new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null; // Audio indisponible : le jeu reste jouable sans son.
  }
}

// Une note courte avec une enveloppe attaque / décroissance (évite les clics).
function blip(freq, start, duration, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** « Croc » joyeux quand le serpent mange une pomme : deux notes montantes. */
export function playEat() {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  blip(660, now, 0.08, 0.18);
  blip(990, now + 0.06, 0.1, 0.15);
}
