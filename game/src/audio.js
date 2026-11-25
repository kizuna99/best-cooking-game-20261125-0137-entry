// Tiny WebAudio kitchen sounds, synthesised — no audio files to load. A short chop knock, a
// ready "ding" when a station finishes, a happy two-note serve chime and a low error buzz.
// Everything is guarded: with no AudioContext (or before the first user gesture) the kitchen
// simply stays silent and the game plays on.

let context = null;

function ensureContext() {
  if (context !== null) return context;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
  } catch {
    context = null;
  }
  return context;
}

/** Play one short tone; `slideTo` bends the pitch for knocks and buzzes. */
function tone(frequency, seconds, type, volume, delay = 0, slideTo = null) {
  const ctx = ensureContext();
  if (ctx === null) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  } catch {
    // Sound is garnish: a failed tone must never break service.
  }
}

export const kitchenSounds = {
  /** Knife on the board: two quick knocks. */
  chop() {
    tone(210, 0.07, 'square', 0.12, 0, 120);
    tone(190, 0.07, 'square', 0.1, 0.09, 110);
  },
  /** Something lands on the hot grill. */
  sizzle() {
    tone(1400, 0.16, 'sawtooth', 0.03, 0, 900);
  },
  /** A station finished: a clear bell ding. */
  ding() {
    tone(1318, 0.28, 'sine', 0.16);
    tone(1975, 0.2, 'sine', 0.07, 0.02);
  },
  /** An ingredient lands on the plate. */
  plate() {
    tone(660, 0.06, 'triangle', 0.12);
  },
  /** A correct serve: two rising notes. */
  serve() {
    tone(784, 0.1, 'triangle', 0.14);
    tone(1175, 0.16, 'triangle', 0.14, 0.09);
  },
  /** A wrong plate or a lost ticket. */
  error() {
    tone(196, 0.22, 'sawtooth', 0.1, 0, 130);
  },
  /** The shift bell at day's end. */
  bell() {
    tone(1046, 0.3, 'sine', 0.15);
    tone(1046, 0.4, 'sine', 0.15, 0.35);
  },
};
