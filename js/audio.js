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

  /** Short filtered noise burst (whooshes, shatters). */
  function noise(start, dur, freq, vol) {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime + start;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = buf;
    f.type = "bandpass"; f.frequency.value = freq || 2000; f.Q.value = 0.8;
    g.gain.value = vol || 0.25;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }

  /** Pitch-dropping sine, the "boom" under impacts. */
  function drop(from, to, start, dur, vol) {
    const c = ac();
    if (!c || muted) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol || 0.4, t);
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
    correct: () => { seq([330, 494, 659, 988], "sawtooth", 0.06, 0.08); seq([165, 247, 330, 494], "square", 0.06, 0.05); },
    wrong: () => { tone(98, 0, 0.45, "sawtooth", 0.16); tone(92, 0.03, 0.45, "square", 0.1); drop(120, 40, 0, 0.4, 0.3); },
    trial: () => seq([220, 0, 220, 0, 175, 0, 147], "square", 0.1, 0.1),
    win: () => seq([523, 659, 784, 1047, 784, 1047, 1319], "triangle", 0.1),
    lose: () => seq([392, 349, 330, 262], "triangle", 0.18),
    bray: () => { tone(520, 0, 0.18, "sawtooth", 0.08); tone(300, 0.2, 0.3, "sawtooth", 0.08); },
    step: () => tone(880, 0, 0.08, "sine", 0.15),
    flip: () => tone(440, 0, 0.05, "triangle", 0.1),
    crumble: () => { for (let i = 0; i < 6; i++) tone(90 + Math.random() * 60, i * 0.04, 0.2, "sawtooth", 0.08); },
    fanfare: () => { drop(140, 45, 0, 0.5, 0.35); seq([196, 196, 196, 262, 0, 330, 392], "sawtooth", 0.11, 0.07); },
    impact: () => { drop(160, 38, 0, 0.45, 0.45); noise(0, 0.18, 900, 0.18); },
    shatter: () => { noise(0, 0.5, 4200, 0.3); noise(0.05, 0.35, 2500, 0.2); drop(90, 30, 0, 0.4, 0.35); },
    whoosh: () => noise(0, 0.35, 1200, 0.2),
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
