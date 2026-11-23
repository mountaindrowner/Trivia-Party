/* NINETY-NINE · audio.js
   Everything you hear is synthesized with Web Audio: no sound files. API:
     NN.audio.init()            start audio (call from a click or key press)
     NN.audio.track(name)       switch the music loop: keys of NN.TRACKS (null / '' fades to silence).
                                The switch lands on the next bar, or after a short fade if that is > 1 s away.
                                Asking for the track that's already playing does nothing (no restart).
     NN.audio.current           the track asked for last (null before any)
     NN.audio.paused = bool     silence the music while paused (it resumes where it stopped)
     NN.audio.muted             true while muted
     NN.audio.toggleMute()      mute everything; returns the new muted state
     NN.audio.ctx               the AudioContext (null before init)
     NN.audio.choir = bool      optional: the sheep choir sings along (layers marked when:'choir')
     NN.sfx.<name>()            one-shot sound effects
     NN.note(t, freq, dur, type, vol, dest, slide), NN.mf(midi) for custom sounds; NN.sfxOk() is true when
                                they would be heard (dest defaults to the sfx bus)
   Testing: NN.audio.render(name, seconds, {raw, choir}) renders a track or an sfx into an OfflineAudioContext and
   resolves to the AudioBuffer; NN.audio.loopSeconds(name); NN.audio.warnings lists notation problems. */
(() => {
'use strict';
const NN = window.NN = window.NN || {};
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
const MASTER = 0.9, MUSIC = 0.5, SFXV = 0.62;
const WARN = [];
const warn = s => { WARN.push(s); if (typeof console !== 'undefined') console.warn('[audio] ' + s); };
const rnd = Math.random;

// ---------------------------------------------------------------- node helpers
function G(E, v = 0) { const g = E.ctx.createGain(); g.gain.value = v; return g; }
function F(E, type, f, q = 0.7) { const b = E.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function O(E, type, f, t) {
  const o = E.ctx.createOscillator();
  if (E.waves[type]) o.setPeriodicWave(E.waves[type]); else o.type = type;
  o.frequency.setValueAtTime(f, t); return o;
}
function Nz(E, buf, t, dur, loop) {
  const s = E.ctx.createBufferSource(); s.buffer = buf || E.white;
  const len = s.buffer.duration, max = len - (isFinite(dur) ? dur : len) - 0.05;
  if (loop) s.loop = true;
  s.start(t, loop || max <= 0 ? rnd() * len * 0.5 : rnd() * max);
  if (isFinite(dur)) s.stop(t + dur + 0.05);
  return s;
}
// attack / decay-to-sustain / hold / release on a gain param; returns a safe stop time
function env(p, t, a, peak, dec, sus, dur, rel) {
  p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
  if (sus < 1) p.setTargetAtTime(peak * sus, t + a, dec);
  const e = t + Math.max(a, dur); p.setTargetAtTime(0, e, rel);
  return e + rel * 7;
}
function vib(E, targets, t, f, depth, rate, delay, end) {
  const l = O(E, 'sine', rate, t), g = G(E);
  g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(f * depth, t + delay + 0.3);
  l.connect(g); targets.forEach(o => g.connect(o.frequency)); l.start(t); l.stop(end);
}
function tone(E, out, t, type, f0, f1, dur, vel, cut, att = 0.004) {
  const o = O(E, type, f0, t), g = G(E); let n = o;
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  if (cut) { n = F(E, 'lowpass', cut, 0.7); o.connect(n); }
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + att); g.gain.setTargetAtTime(0, t + att, dur / 4);
  n.connect(g); g.connect(out); o.start(t); o.stop(t + dur * 1.8 + 0.05);
  return o;
}
function burst(E, out, t, type, f, q, dur, vel, att = 0.002, f1, buf) {
  const s = Nz(E, buf, t, dur * 1.8), b = F(E, type, f, q), g = G(E);
  if (f1) b.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + att); g.gain.setTargetAtTime(0, t + att, dur / 4);
  s.connect(b); b.connect(g); g.connect(out);
}

// ---------------------------------------------------------------- buffers and waves
function noiseBuf(ctx, secs, brown) {
  const n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { const w = rnd() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last; } else d[i] = w; }
  if (brown) {
    const drift = d[n - 1] - d[0]; let pk = 0;
    for (let i = 0; i < n; i++) { d[i] -= drift * i / (n - 1); pk = Math.max(pk, Math.abs(d[i])); }
    for (let i = 0; i < n; i++) d[i] /= pk;
  }
  return b;
}
function impulse(ctx, secs) {
  const sr = ctx.sampleRate, n = Math.floor(sr * secs), b = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) {
      const x = rnd() * 2 - 1; lp += (x - lp) * (0.55 - 0.45 * i / n);
      d[i] = i < sr * 0.012 ? 0 : lp * Math.pow(1 - i / n, 2.8);
    }
  }
  return b;
}
function waves(ctx) {
  const mk = fn => {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { const [a, b] = fn(k); re[k] = a; im[k] = b; }
    return ctx.createPeriodicWave(re, im);
  };
  return {
    sq: mk(k => [0, k % 2 ? (4 / (Math.PI * k)) * Math.pow(0.86, k) : 0]),                    // soft, rolled-off square
    p25: mk(k => [(2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25) * Math.pow(0.9, k), 0]),   // 25% pulse
    p12: mk(k => [(2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.125) * Math.pow(0.92, k), 0]), // 12% pulse (reedy)
  };
}

// ---------------------------------------------------------------- engine (one per AudioContext: live or offline)
//   music layers → session bus → E.music → E.gate → E.master → compressor → out
//   sends: session → E.rvMus → E.rvGate → reverb → master;  session → E.echoIn → delay loop → E.gate
//   sfx → E.sfx (soft lowpass) → master;  sfx sends → E.sfxRv → reverb
function makeEngine(ctx, opt = {}) {
  const E = { ctx, live: !!opt.live, cur: null, pend: null, silent: false, flags: { choir: false } };
  E.waves = waves(ctx);
  E.master = G(E, MASTER);
  if (opt.raw) E.master.connect(ctx.destination);
  else {
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = -6; c.knee.value = 6; c.ratio.value = 6; c.attack.value = 0.004; c.release.value = 0.2;
    E.master.connect(c); c.connect(ctx.destination);
  }
  E.verb = ctx.createConvolver(); E.verb.buffer = impulse(ctx, 2.6); E.verb.connect(E.master);
  E.gate = G(E, 1); E.gate.connect(E.master);
  E.music = G(E, MUSIC); E.music.connect(E.gate);
  E.rvGate = G(E, 1); E.rvGate.connect(E.verb);
  E.rvMus = G(E, MUSIC); E.rvMus.connect(E.rvGate);
  E.echoIn = G(E, MUSIC); E.echo = ctx.createDelay(2); E.echoFb = G(E, 0.32);
  const el = F(E, 'lowpass', 2400, 0.5);
  E.echoIn.connect(E.echo); E.echo.connect(el); el.connect(E.echoFb); E.echoFb.connect(E.echo); el.connect(E.gate);
  const sl = F(E, 'lowpass', 9000, 0.5); E.sfx = G(E, SFXV); E.sfx.connect(sl); sl.connect(E.master);
  E.sfxRv = G(E, SFXV); E.sfxRv.connect(E.verb);
  E.white = noiseBuf(ctx, 2, false); E.brown = noiseBuf(ctx, 3, true);
  return E;
}
// a per-sound output that also feeds the reverb
function wet(E, amt) { const g = G(E, 1), s = G(E, amt); g.connect(E.sfx); g.connect(s); s.connect(E.sfxRv); return g; }

// ---------------------------------------------------------------- instruments: V[name](E, out, t, midi, durSec, vel, layer, event)
const V = {};
V.lead = (E, out, t, m, dur, vel, L) => {               // soft square lead with delayed vibrato
  const f = mf(m), o = O(E, L.wave || 'sq', f, t), lp = F(E, 'lowpass', L.cut || 2400, 0.5), g = G(E);
  const end = env(g.gain, t, 0.01, vel, 0.12, 0.7, dur, 0.04);
  o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(end);
  if (dur > 0.25) vib(E, [o], t, f, 0.006 * (L.vib ?? 1), 5.4, 0.2, end);
};
V.pulse = (E, out, t, m, dur, vel, L) => V.lead(E, out, t, m, dur, vel * 0.9, { cut: L.cut || 2600, vib: L.vib ?? 0.7, wave: 'p25' });
V.reed = (E, out, t, m, dur, vel, L) => {               // nasal, piper-ish
  const f = mf(m), o = O(E, 'p12', f, t), lp = F(E, 'lowpass', L.cut || 1900, 2.2), g = G(E);
  const end = env(g.gain, t, 0.02, vel, 0.1, 0.85, dur, 0.04);
  o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(end);
  vib(E, [o], t, f, 0.004, 6, 0.12, end);
};
V.flute = (E, out, t, m, dur, vel, L) => {              // ocarina: triangle + octave sine + breath
  const f = mf(m), o = O(E, 'triangle', f, t), o2 = O(E, 'sine', f * 2, t), g2 = G(E, 0.12);
  const lp = F(E, 'lowpass', L.cut || 3200, 0.5), g = G(E);
  const end = env(g.gain, t, 0.045, vel, 0.2, 0.85, dur, 0.07);
  o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(out);
  o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  vib(E, [o, o2], t, f, 0.007 * (L.vib ?? 1), 4.8, 0.22, end);
  burst(E, out, t, 'bandpass', Math.min(f * 3, 7000), 1.5, 0.08, vel * 0.18, 0.01);
};
V.keys = (E, out, t, m, dur, vel, L) => {               // FM electric piano
  const f = mf(m), c = O(E, 'sine', f, t), mo = O(E, 'sine', f, t), mg = G(E), g = G(E);
  mg.gain.setValueAtTime(f * (L.idx || 1.4) * vel, t); mg.gain.setTargetAtTime(f * 0.12, t, 0.3);
  mo.connect(mg); mg.connect(c.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.005); g.gain.setTargetAtTime(vel * 0.3, t + 0.005, 0.5);
  const e = t + Math.max(dur, 0.06); g.gain.setTargetAtTime(0, e, 0.07);
  c.connect(g); g.connect(out); c.start(t); mo.start(t); c.stop(e + 0.5); mo.stop(e + 0.5);
};
V.bell = (E, out, t, m, dur, vel, L) => {               // FM glockenspiel, rings on its own
  const f = mf(m), c = O(E, 'sine', f, t), mo = O(E, 'sine', f * 3.5, t), mg = G(E), g = G(E), dec = L.dec || 0.4;
  mg.gain.setValueAtTime(f * 2.2, t); mg.gain.setTargetAtTime(0, t, dec * 0.5);
  mo.connect(mg); mg.connect(c.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, dec);
  c.connect(g); g.connect(out); const e = t + dec * 7; c.start(t); mo.start(t); c.stop(e); mo.stop(e);
};
V.pluck = (E, out, t, m, dur, vel, L) => {
  const f = mf(m), o = O(E, L.wave || 'sawtooth', f, t), lp = F(E, 'lowpass', Math.min(9000, f * 7), 0.9), g = G(E), dec = L.dec || 0.18;
  lp.frequency.setTargetAtTime(f * 1.5, t, 0.06);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, dec);
  o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dec * 7);
};
V.harp = (E, out, t, m, dur, vel, L) => {
  const f = mf(m), o = O(E, 'triangle', f, t), o2 = O(E, 'sine', f * 2, t), g2 = G(E, 0.25), g = G(E), dec = L.dec || 0.45;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, dec);
  o2.connect(g2); g2.connect(g); o.connect(g); g.connect(out);
  o.start(t); o2.start(t); o.stop(t + dec * 7); o2.stop(t + dec * 7);
};
V.pad = (E, out, t, m, dur, vel, L) => {                // filtered detuned saws
  const f = mf(m), d = L.det ?? 7, lp = F(E, 'lowpass', L.cut || 1100, 0.6), g = G(E), dets = L.three ? [-d, 0, d] : [-d, d];
  const end = env(g.gain, t, L.att ?? 0.3, vel * (L.three ? 0.33 : 0.5), 0.5, 1, dur, L.rel ?? 0.35);
  dets.forEach(dd => { const o = O(E, L.wave || 'sawtooth', f, t); o.detune.value = dd; o.connect(lp); o.start(t); o.stop(end); });
  if (L.wob) {
    const l = O(E, 'sine', 0.15 + rnd() * 0.1, t), lg = G(E, (L.cut || 1100) * 0.45);
    l.connect(lg); lg.connect(lp.frequency); l.start(t); l.stop(end);
  }
  lp.connect(g); g.connect(out);
};
V.ghost = (E, out, t, m, dur, vel, L) => V.pad(E, out, t, m, dur, vel, { cut: L.cut || 900, att: 0.9, rel: 0.6, det: 26, three: true, wob: true });
V.choir = (E, out, t, m, dur, vel, L) => {              // detuned sines + a formant "aah"
  const f = mf(m), g = G(E), lp = F(E, 'lowpass', 2800, 0.5);
  const end = env(g.gain, t, L.att ?? 0.32, vel, 0.4, 1, dur, L.rel ?? 0.3);
  const l = O(E, 'sine', 4.4 + rnd() * 0.6, t), lg = G(E, L.wide ? 22 : 9); l.connect(lg); l.start(t); l.stop(end);
  const d = L.det ?? 10;
  [-d, 0, d * 0.9].forEach(dd => {
    const o = O(E, 'sine', f, t), og = G(E, 0.26); o.detune.value = dd; lg.connect(o.detune);
    o.connect(og); og.connect(lp); o.start(t); o.stop(end);
  });
  const s = O(E, 'sawtooth', f, t), b1 = F(E, 'bandpass', 760, 4), b2 = F(E, 'bandpass', 1150, 5), sg = G(E, 0.35);
  lg.connect(s.detune); s.connect(b1); s.connect(b2); b1.connect(sg); b2.connect(sg); sg.connect(lp); s.start(t); s.stop(end);
  lp.connect(g); g.connect(out);
};
V.brass = (E, out, t, m, dur, vel) => {
  const f = mf(m), lp = F(E, 'lowpass', f * 1.2, 1.4), g = G(E);
  lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(Math.min(6000, f * 6), t + 0.04);
  lp.frequency.setTargetAtTime(Math.min(4000, f * 3), t + 0.04, 0.15);
  const end = env(g.gain, t, 0.025, vel * 0.5, 0.15, 0.75, dur, 0.05);
  [-6, 6].forEach(d => { const o = O(E, 'sawtooth', f, t); o.detune.value = d; o.connect(lp); o.start(t); o.stop(end); });
  lp.connect(g); g.connect(out);
};
// basses
V.fbass = (E, out, t, m, dur, vel, L) => {              // funky envelope-filter saw + sine sub
  const f = mf(m), o = O(E, 'sawtooth', f, t), s = O(E, 'sine', f, t), sg = G(E, 0.7);
  const lp = F(E, 'lowpass', 500 + 1500 * vel, L.q || 5), g = G(E);
  lp.frequency.setTargetAtTime(f * 2.2, t + 0.005, 0.06);
  const end = env(g.gain, t, 0.004, vel * 0.6, 0.15, 0.6, dur, 0.03);
  o.connect(lp); lp.connect(g); s.connect(sg); sg.connect(g); g.connect(out);
  o.start(t); s.start(t); o.stop(end); s.stop(end);
};
V.tbass = (E, out, t, m, dur, vel) => {
  const f = mf(m), o = O(E, 'triangle', f, t), s = O(E, 'sine', f, t), sg = G(E, 0.6), g = G(E);
  const end = env(g.gain, t, 0.006, vel * 0.7, 0.3, 0.75, dur, 0.05);
  o.connect(g); s.connect(sg); sg.connect(g); g.connect(out); o.start(t); s.start(t); o.stop(end); s.stop(end);
};
V.wbass = (E, out, t, m, dur, vel) => {                 // walking upright
  const f = mf(m), o = O(E, 'triangle', f, t), s = O(E, 'sine', f, t), sg = G(E, 0.5), lp = F(E, 'lowpass', 1100, 0.7), g = G(E);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.8, t + 0.005); g.gain.setTargetAtTime(vel * 0.3, t + 0.005, 0.18);
  const e = t + dur; g.gain.setTargetAtTime(0, e, 0.05);
  o.connect(lp); s.connect(sg); sg.connect(lp); lp.connect(g); g.connect(out);
  o.start(t); s.start(t); o.stop(e + 0.4); s.stop(e + 0.4);
};
V.sub = (E, out, t, m, dur, vel) => {
  const f = mf(m), o = O(E, 'sine', f, t), o2 = O(E, 'triangle', f, t), g2 = G(E, 0.3), g = G(E);
  const end = env(g.gain, t, 0.12, vel * 0.7, 0.5, 1, dur, 0.25);
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(end); o2.stop(end);
};
V.drone = (E, out, t, notes, dur, vel, L) => {          // sustained for the whole session
  const g = G(E), cut = L.cut || 700, lp = F(E, 'lowpass', cut, 0.5); lp.connect(g); g.connect(out);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.4, t + (L.att || 2));
  const os = [];
  (notes || [38]).forEach(m => [-6, 6].forEach(d => {
    const o = O(E, L.wave || 'sawtooth', mf(m), t); o.detune.value = d; o.connect(lp); o.start(t); os.push(o);
  }));
  const l = O(E, 'sine', 0.13, t), lg = G(E, cut * 0.3); l.connect(lg); lg.connect(lp.frequency); l.start(t); os.push(l);
  return { stop(t2) { g.gain.cancelScheduledValues(t2); g.gain.setTargetAtTime(0, t2, 0.2); os.forEach(o => o.stop(t2 + 1.5)); } };
};
// drums
V.kick = (E, out, t, m, dur, vel, L) => {
  const o = O(E, 'sine', 150, t), g = G(E);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.002); g.gain.setTargetAtTime(0, t + 0.03, L.dec || 0.08);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.7);
};
V.snare = (E, out, t, m, dur, vel) => { burst(E, out, t, 'bandpass', 1900, 0.8, 0.16, vel * 0.9); tone(E, out, t, 'triangle', 200, 150, 0.08, vel * 0.5); };
V.brush = (E, out, t, m, dur, vel) => burst(E, out, t, 'bandpass', 3200, 0.5, 0.2, vel * 0.7, 0.012);
V.hat = (E, out, t, m, dur, vel, L) => burst(E, out, t, 'highpass', 7500, 0.7, L.dec || 0.045, vel);
V.ohat = (E, out, t, m, dur, vel) => burst(E, out, t, 'highpass', 7000, 0.7, 0.25, vel * 0.8);
V.shaker = (E, out, t, m, dur, vel) => burst(E, out, t, 'bandpass', 6500, 1, 0.07, vel, 0.012);
V.clap = (E, out, t, m, dur, vel) => {
  const s = Nz(E, E.white, t, 0.3), b = F(E, 'bandpass', 1300, 1.3), g = G(E);
  g.gain.setValueAtTime(0, t);
  [0, 0.011, 0.022].forEach(d => { g.gain.setValueAtTime(vel, t + d); g.gain.setTargetAtTime(vel * 0.1, t + d + 0.001, 0.004); });
  g.gain.setValueAtTime(vel * 0.9, t + 0.033); g.gain.setTargetAtTime(0, t + 0.034, 0.045);
  s.connect(b); b.connect(g); g.connect(out);
};
V.rim = (E, out, t, m, dur, vel) => { tone(E, out, t, 'sine', 1300, 900, 0.05, vel * 0.6); burst(E, out, t, 'bandpass', 2600, 2, 0.02, vel * 0.5); };
V.tom = (E, out, t, m, dur, vel, L, ev) => {
  const f = ({ h: 190, m: 145, l: 105 })[ev && ev.ch] || L.f || 120;
  tone(E, out, t, 'sine', f, f * 0.62, 0.35, vel); burst(E, out, t, 'lowpass', 900, 0.7, 0.06, vel * 0.25);
};
V.tick = (E, out, t, m, dur, vel) => tone(E, out, t, 'sine', 2700, 2600, 0.025, vel);
V.heart = (E, out, t, m, dur, vel) => {                 // lub-dub
  tone(E, out, t, 'sine', 75, 42, 0.22, vel); tone(E, out, t, 'triangle', 90, 50, 0.12, vel * 0.3);
  tone(E, out, t + 0.2, 'sine', 66, 40, 0.2, vel * 0.65);
};
// weather and atmosphere
V.thunder = (E, out, t, m, dur, vel) => {
  const n = Nz(E, E.brown, t, Infinity, true), lp = F(E, 'lowpass', 320, 0.8), g = G(E);
  lp.frequency.setValueAtTime(320, t); lp.frequency.setTargetAtTime(110, t + 0.2, 1.2);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.7, t + 0.12); g.gain.setTargetAtTime(vel * 0.4, t + 0.12, 0.3);
  g.gain.setTargetAtTime(vel * 0.8, t + 0.7, 0.15); g.gain.setTargetAtTime(0, t + 1.0, 0.9);
  n.connect(lp); lp.connect(g); g.connect(out); n.stop(t + 7);
};
V.rain = (E, out, t, m, dur, vel) => {
  const g = G(E), gust = G(E, 0.75), s = Nz(E, E.white, t, Infinity, true), hp = F(E, 'highpass', 1000, 0.5), lp = F(E, 'lowpass', 6000, 0.5);
  const s2 = Nz(E, E.brown, t, Infinity, true), lp2 = F(E, 'lowpass', 500, 0.5), g2 = G(E, 0.9);
  const l = O(E, 'sine', 0.09, t), lg = G(E, 0.25); l.connect(lg); lg.connect(gust.gain); l.start(t);
  s.connect(hp); hp.connect(lp); lp.connect(g); s2.connect(lp2); lp2.connect(g2); g2.connect(g); g.connect(gust); gust.connect(out);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 1.5);
  return { stop(t2) { g.gain.cancelScheduledValues(t2); g.gain.setTargetAtTime(0, t2, 0.25); [s, s2, l].forEach(n => n.stop(t2 + 2)); } };
};
V.wind = (E, out, t, m, dur, vel) => {
  const s = Nz(E, E.white, t, Infinity, true), bp = F(E, 'bandpass', 500, 1.4), g = G(E), sw = G(E, 0.6);
  const l = O(E, 'sine', 0.07, t), lg = G(E, 260); l.connect(lg); lg.connect(bp.frequency);
  const l2 = O(E, 'sine', 0.11, t), lg2 = G(E, 0.4); l2.connect(lg2); lg2.connect(sw.gain);
  s.connect(bp); bp.connect(g); g.connect(sw); sw.connect(out); l.start(t); l2.start(t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 2);
  return { stop(t2) { g.gain.cancelScheduledValues(t2); g.gain.setTargetAtTime(0, t2, 0.25); [s, l, l2].forEach(n => n.stop(t2 + 2)); } };
};
V.chirp = (E, out, t, m, dur, vel) => {                 // a little bird
  const k = 2 + Math.floor(rnd() * 3), f = 2600 + rnd() * 1400;
  for (let i = 0; i < k; i++) {
    const tt = t + i * 0.07, o = O(E, 'sine', f * (1 + 0.05 * i), tt), g = G(E);
    o.frequency.exponentialRampToValueAtTime(f * 1.4, tt + 0.04);
    g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(vel, tt + 0.008); g.gain.setTargetAtTime(0, tt + 0.02, 0.015);
    o.connect(g); g.connect(out); o.start(tt); o.stop(tt + 0.15);
  }
};
V.whoosh = (E, out, t, m, dur, vel) => {
  const s = Nz(E, E.white, t, 2.3), bp = F(E, 'bandpass', 300, 3), g = G(E);
  bp.frequency.exponentialRampToValueAtTime(2400, t + 1.6);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 1.5); g.gain.setTargetAtTime(0, t + 1.5, 0.08);
  s.connect(bp); bp.connect(g); g.connect(out);
};

//@@NOTATION@@
})();
