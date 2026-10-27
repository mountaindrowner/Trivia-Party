/* Tiny synthesized sound kit — no audio files needed. */
window.THP = window.THP || {};

THP.Sound = (function () {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("thp-muted") === "1"; } catch (e) {}

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol) {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function seq(notes, type, step, vol) {
    notes.forEach((f, i) => f && tone(f, i * step, step * 1.6, type, vol));
  }

  const fx = {
    tap: () => tone(660, 0, 0.06, "triangle", 0.12),
    tick: () => tone(1200, 0, 0.03, "square", 0.05),
    correct: () => seq([523, 659, 784, 1047], "triangle", 0.08),
    wrong: () => { tone(196, 0, 0.35, "sawtooth", 0.12); tone(185, 0.05, 0.35, "sawtooth", 0.1); },
    trial: () => seq([220, 0, 220, 0, 175, 0, 147], "square", 0.1, 0.1),
    win: () => seq([523, 659, 784, 1047, 784, 1047, 1319], "triangle", 0.1),
    lose: () => seq([392, 349, 330, 262], "triangle", 0.18),
    bray: () => { tone(520, 0, 0.18, "sawtooth", 0.08); tone(300, 0.2, 0.3, "sawtooth", 0.08); },
    step: () => tone(880, 0, 0.08, "sine", 0.15),
    flip: () => tone(440, 0, 0.05, "triangle", 0.1),
    crumble: () => { for (let i = 0; i < 6; i++) tone(90 + Math.random() * 60, i * 0.04, 0.2, "sawtooth", 0.08); },
    fanfare: () => seq([392, 392, 392, 523, 0, 659, 784], "square", 0.11, 0.09),
  };

  return {
    play(name) { try { fx[name] && fx[name](); } catch (e) {} },
    unlock() { ac(); },
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      try { localStorage.setItem("thp-muted", muted ? "1" : "0"); } catch (e) {}
      return muted;
    },
  };
})();
