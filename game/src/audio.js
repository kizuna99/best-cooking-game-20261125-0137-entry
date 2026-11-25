// Tiny WebAudio kitchen sounds — no audio files, everything synthesized.
// Chop (short noise tick), ding (station ready bell), serve (happy two-note),
// error (low buzz), tick (last-seconds clock). All calls fail silently when
// audio is unavailable or not yet unlocked by a user gesture.

let ctx = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.08, when = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  chop()  { tone(220, 0.06, 'square', 0.05); tone(140, 0.05, 'square', 0.04, 0.05); },
  sizzle() { tone(90, 0.25, 'sawtooth', 0.02); },
  ding()  { tone(1318, 0.35, 'sine', 0.09); tone(1760, 0.3, 'sine', 0.05, 0.02); },
  pop()   { tone(520, 0.07, 'sine', 0.06); },
  serve() { tone(660, 0.12, 'triangle', 0.09); tone(880, 0.18, 'triangle', 0.09, 0.09); },
  error() { tone(160, 0.22, 'sawtooth', 0.07); },
  strike() { tone(300, 0.15, 'sawtooth', 0.08); tone(200, 0.25, 'sawtooth', 0.08, 0.12); },
  tick()  { tone(980, 0.05, 'sine', 0.05); },
  day()   { tone(523, 0.14, 'triangle', 0.09); tone(659, 0.14, 'triangle', 0.09, 0.12); tone(784, 0.22, 'triangle', 0.09, 0.24); },
};
