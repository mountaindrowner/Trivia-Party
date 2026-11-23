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
  if (f1) { b.frequency.setValueAtTime(f, t); b.frequency.exponentialRampToValueAtTime(f1, t + dur); }
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
  bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 1.6);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 1.5); g.gain.setTargetAtTime(0, t + 1.5, 0.08);
  s.connect(bp); bp.connect(g); g.connect(out);
};

// ---------------------------------------------------------------- notation
// A track: { bpm, bars, swing (0..1, 1 = triplet), sw8 (swing 8ths, else 16ths), rev, echoT (steps), echoFb, gain,
//   shift: bar => semitones (key changes), chords: 'C | Am | Dm7 G | …' (one or two chords per bar), layers: [...] }
// A layer: { i: voice, v: volume, on: '0-7,16' (inclusive bars, default all), pan, rev, echo, when: 'choir', + one of
//   mel:   'E5 - - D5 C5 - D5 E5 | …'  one token per `res` 16ths (default 2 = 8ths); '-' holds, '.' rests, A+C chords;
//          loops over its own length from bar `at`; `tr` transposes
//   bass:  16 steps of R r(ghost) 3 b(♭3) 5 6 7 8 2 4 L(low root) a/A(approach next root from below/above) - .
//   chord: 16 steps of x - . (voiced in [lo, lo+12), or fixed `notes`)
//   arp:   16 steps of digits (chord tones upward from lo) - .
//   hit:   16 steps of x o g (loud/mid/ghost) or h m l (tom pitch)
//   drone: true (sustained for the whole loop, e.g. rain)
//   Patterns can be arrays: one per bar, cycling. }
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const acc = a => (a === '#' ? 1 : a === 'b' ? -1 : 0);
const noteNum = s => { const r = /^([A-G])([#b]?)(-?\d)$/.exec(s); return r ? PC[r[1]] + acc(r[2]) + 12 * (+r[3] + 1) : null; };
const QUAL = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], sus2: [0, 2, 7],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], dim: [0, 3, 6], aug: [0, 4, 8], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], 5: [0, 7], '7sus4': [0, 5, 7, 10],
};
function chord(sym) {
  const r = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(sym);
  if (!r || !QUAL[r[3]]) { warn('bad chord ' + sym); return { root: 0, ints: [0, 4, 7], bass: 0 }; }
  const root = (PC[r[1]] + acc(r[2]) + 12) % 12;
  return { root, ints: QUAL[r[3]], bass: r[4] ? (PC[r[4]] + acc(r[5]) + 12) % 12 : root };
}
const place = (pc, lo) => lo + ((((pc - lo) % 12) + 12) % 12);
const voicing = (c, sh, lo) => [...new Set(c.ints.map(i => place(c.root + i + sh, lo)))].sort((a, b) => a - b);
function ranges(s, n) {
  const on = new Array(n).fill(!s);
  if (s) for (const p of String(s).split(',')) {
    const [a, b] = p.split('-').map(Number);
    for (let i = a; i <= (isNaN(b) ? a : b); i++) if (i < n) on[i] = true;
  }
  return on;
}
function parseMel(str, res, where) {
  const per = 16 / res, evs = [], bars = str.split('|');
  let last = null;
  bars.forEach((bs, bi) => {
    const toks = bs.trim().split(/\s+/).filter(Boolean);
    if (toks.length !== per) warn(`${where}: melody bar ${bi} has ${toks.length} tokens (wants ${per}): "${bs.trim()}"`);
    toks.forEach((tk, k) => {
      if (tk === '-') { if (last) last.len++; return; }
      last = null;
      if (tk === '.') return;
      const ms = tk.split('+').map(noteNum);
      if (ms.some(x => x == null)) { warn(`${where}: bad note ${tk}`); return; }
      evs.push(last = { st: bi * per + k, len: 1, m: ms.length > 1 ? ms : ms[0] });
    });
  });
  return { evs, bars: bars.length, per };
}
function bassNote(ch, c, nc, lo, sh) {
  const R = place(c.root + sh, lo), B = place(c.bass + sh, lo), I = c.ints;
  switch (ch) {
    case 'R': case 'r': return B;
    case 'L': return B - 12;
    case '8': return B + 12;
    case '3': return R + (I.includes(3) ? 3 : I.includes(4) ? 4 : I.includes(5) ? 5 : 2);
    case 'b': return R + 3;
    case '5': return R + (I.find(i => i >= 6 && i <= 8) ?? 7);
    case '7': return R + (I.find(i => i === 10 || i === 11) ?? 10);
    case '6': return R + 9;
    case '2': return R + 2;
    case '4': return R + 5;
    case 'a': return place(nc.bass + sh, lo) - 1;
    case 'A': return place(nc.bass + sh, lo) + 1;
  }
  warn('bad bass token ' + ch); return R;
}
const HITV = { x: 1, o: 0.6, g: 0.3, h: 1, m: 1, l: 1 };
const CACHE = {};
function compile(name) {
  if (CACHE[name]) return CACHE[name];
  const D = NN.TRACKS[name]; if (!D) return null;
  const bars = D.bars, shift = D.shift || (() => 0);
  const cb = D.chords.split('|').map(s => s.trim().split(/\s+/).filter(Boolean).map(chord));
  if (cb.length !== bars) warn(`${name}: ${cb.length} chord bars for ${bars} bars`);
  const chAt = (b, s) => { const x = cb[b % cb.length]; return x[Math.min(x.length - 1, Math.floor(s * x.length / 16))]; };
  const chNext = (b, s) => {
    const x = cb[b % cb.length], k = Math.floor(s * x.length / 16);
    return k + 1 < x.length ? x[k + 1] : cb[((b + 1) % bars) % cb.length][0];
  };
  const table = []; for (let b = 0; b < bars; b++) table.push(new Array(16).fill(null));
  const put = (b, s, ev) => (table[b][s] || (table[b][s] = [])).push(ev);
  const layers = D.layers.map((L0, idx) => {
    const L = Object.assign({}, L0, { idx }), where = `${name}[${idx}:${L.i}]`;
    if (!V[L.i]) warn(`${where}: unknown voice`);
    if (L.drone) return L;
    const on = ranges(L.on, bars);
    if (L.mel) {
      const res = L.res || 2, M = parseMel(L.mel, res, where), at = L.at || 0;
      for (let b = 0; b < bars; b++) if (on[b]) {
        const mb = (((b - at) % M.bars) + M.bars) % M.bars, sh = shift(b) + (L.tr || 0);
        for (const e of M.evs) if (Math.floor(e.st / M.per) === mb) {
          put(b, (e.st % M.per) * res, { L, m: Array.isArray(e.m) ? e.m.map(x => x + sh) : e.m + sh, d: e.len * res,
            vel: (L.vel || 0.9) * ((e.st % M.per) % 4 === 0 ? 1 : 0.92) });
        }
      }
      return L;
    }
    const P = L.hit || L.bass || L.chord || L.arp;
    if (!P) { warn(`${where}: no notes`); return L; }
    const pats = (Array.isArray(P) ? P : [P]).map(p => p.replace(/\s+/g, ''));
    pats.forEach(p => { if (p.length !== 16) warn(`${where}: pattern "${p}" has ${p.length} steps`); });
    for (let b = 0; b < bars; b++) if (on[b]) {
      const p = pats[b % pats.length], sh = shift(b);
      for (let s = 0; s < 16; s++) {
        const ch = p[s]; if (!ch || ch === '.' || ch === '-') continue;
        let len = 1; while (s + len < 16 && p[s + len] === '-') len++;
        const c = chAt(b, s), ac = (s % 4 === 0 ? 1 : 0.85) * (L.vel || 1);
        if (L.hit) put(b, s, { L, m: null, d: len, vel: (HITV[ch] ?? 1) * (L.vel || 1), ch });
        else if (L.bass) put(b, s, { L, m: bassNote(ch, c, chNext(b, s), L.lo ?? 36, sh), d: len, vel: ch === 'r' ? 0.55 * ac : ac });
        else if (L.chord) put(b, s, { L, m: L.notes ? L.notes.map(x => x + sh) : voicing(c, sh, L.lo ?? 54), d: len, vel: ac });
        else {
          const tones = voicing(c, sh, L.lo ?? 60), k = parseInt(ch, 36);
          if (isNaN(k)) { warn(`${where}: bad arp token ${ch}`); continue; }
          put(b, s, { L, m: tones[k % tones.length] + 12 * Math.floor(k / tones.length), d: len, vel: ac });
        }
      }
    }
    return L;
  });
  return (CACHE[name] = { name, bpm: D.bpm, swing: D.swing || 0, sw8: !!D.sw8, bars, table, layers,
    rev: D.rev ?? 0.18, echoT: D.echoT || 3, echoFb: D.echoFb ?? 0.32, gain: D.gain ?? 1 });
}

// ---------------------------------------------------------------- sessions and the lookahead scheduler
function startSession(E, name, t) {
  const tr = compile(name); if (!tr) return null;
  const c = E.ctx, S = { name, tr, step: 0, next: t, sd: 60 / tr.bpm / 4, outs: [], drones: [] };
  S.bus = G(E, tr.gain); S.bus.connect(E.music);
  S.rv = G(E, 1); S.rv.connect(E.rvMus);
  S.ec = G(E, 1); S.ec.connect(E.echoIn);
  E.echo.delayTime.setValueAtTime(Math.min(1.9, tr.echoT * S.sd), t);
  E.echoFb.gain.setValueAtTime(tr.echoFb, t);
  tr.layers.forEach(L => {
    const lg = G(E, L.v ?? 0.15); let o = lg;
    if (L.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = L.pan; lg.connect(p); o = p; }
    o.connect(S.bus);
    const rv = L.rev ?? tr.rev; if (rv > 0) { const s = G(E, rv); o.connect(s); s.connect(S.rv); }
    if (L.echo > 0) { const s = G(E, L.echo); o.connect(s); s.connect(S.ec); }
    S.outs[L.idx] = lg;
    if (L.drone) S.drones.push(V[L.i](E, lg, t, L.notes, 0, L.vel ?? 1, L));
  });
  return S;
}
function endSession(E, S, t, tau) {
  for (const n of [S.bus, S.rv, S.ec]) { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(n.gain.value, t); n.gain.setTargetAtTime(0, t, tau); }
  for (const d of S.drones) if (d) d.stop(t + tau * 6);
  if (E.live) setTimeout(() => { try { S.bus.disconnect(); S.rv.disconnect(); S.ec.disconnect(); } catch (e) { /* gone */ } },
    (t - E.ctx.currentTime + tau * 10 + 1) * 1000);
}
const SW = [0, 1 / 3, 2 / 3, 1 / 3];
function runStep(E, S, t) {
  const tr = S.tr, b = Math.floor(S.step / 16) % tr.bars, s = S.step % 16, evs = tr.table[b][s];
  if (!evs) return;
  const tt = t + (tr.sw8 ? SW[s % 4] : (s % 2) / 3) * tr.swing * S.sd;
  for (const ev of evs) {
    const L = ev.L; if (L.when && !E.flags[L.when]) continue;
    const vel = ev.vel * (0.94 + rnd() * 0.06), dur = ev.d * S.sd * (L.leg ?? 0.92), out = S.outs[L.idx], fn = V[L.i];
    if (!fn) continue;
    if (Array.isArray(ev.m)) ev.m.forEach((m, k) => fn(E, out, tt + k * (L.roll || 0), m, dur, vel, L, ev));
    else fn(E, out, tt, ev.m, dur, vel, L, ev);
  }
}
// Schedules every step before `until`. Track switches wait for the next downbeat, or fade if flagged.
function pump(E, until, now) {
  for (let guard = 0; guard < 8192; guard++) {
    const S = E.cur, p = E.pend;
    if (p) {
      if (!S) { E.cur = p.name ? startSession(E, p.name, now + 0.05) : null; E.pend = null; continue; }
      if (E.silent) { endSession(E, S, now, 0.05); E.cur = p.name ? startSession(E, p.name, now + 0.05) : null; E.pend = null; continue; }
      if (S.next < until && (S.step % 16 === 0 || p.fade)) {
        const t0 = S.next;
        if (p.fade) { endSession(E, S, t0, 0.1); E.cur = p.name ? startSession(E, p.name, t0 + 0.4) : null; }
        else { endSession(E, S, t0, 0.3); E.cur = p.name ? startSession(E, p.name, t0) : null; }
        E.pend = null; continue;
      }
    }
    if (!S || E.silent || S.next >= until) break;
    runStep(E, S, S.next); S.next += S.sd; S.step++;
  }
}

// ---------------------------------------------------------------- the score
const bars = (...p) => p.join(' | ');
const rest = n => Array(n).fill('. . . . . . . .').join(' | ');
const rep = (s, n) => Array(n).fill(s).join(' | ');
const xp = (s, n) => s.replace(/([A-G])([#b]?)/g, (_, l, a) => NAMES[(PC[l] + acc(a) + n + 120) % 12]);

// The main theme ("Ninety-Nine"), in C. A: the question and the search; B: the long way round; A': coming home.
const TH_A = bars('E5 - - D5 C5 - D5 E5', 'G5 - - - D5 - - -', 'E5 - - D5 C5 - D5 E5', 'A5 - - - G5 - - -',
  'A5 - C6 - B5 - A5 -', 'G5 - - E5 C5 - - -', 'D5 - - E5 F5 - E5 D5', 'D5 - - - - - . .');
const TH_AE = bars('E5 - - D5 C5 - D5 E5', 'G5 - - - D5 - - -', 'E5 - - D5 C5 - D5 E5', 'A5 - - - G5 - - -',
  'A5 - C6 - B5 - A5 -', 'G5 - - E5 C5 - - -', 'D5 - - E5 F5 - E5 D5', 'C5 - - - - - . .');
const TH_B = bars('F5 - - E5 D5 - C5 -', 'E5 - - D5 C5 - A4 -', 'D5 - - C5 B4 - G4 -', 'C5 - - D5 E5 - G5 -',
  'F5 - - E5 D5 - C5 -', 'E5 - - F5 G5 - A5 -', 'G5 - - F5 E5 - D5 -', 'D5 - - - G4 - - -');
const TC_A = 'C | G | Am | F | F | C | Dm7 G | G';
const TC_AE = 'C | G | Am | F | F | C | Dm7 G | C';
const TC_B = 'Dm7 | Am | G | C | Dm7 | F | G7 | G';
// The theme in the minor (the boss quotes its head; sorrow sings all of it, in D minor).
const TH_MIN = bars('Eb5 - - D5 C5 - D5 Eb5', 'G5 - - - D5 - - -', 'Eb5 - - D5 C5 - D5 Eb5', 'D5 - - - B4 - - -');

// Meadow: the farm's riff (16th notes), and its C section.
const MA = bars('C6 . A5 . C6 . D6 C6 . . A5 . F5 . G5 .', 'A5 - - . F5 . D5 . F5 - . G5 - . . .',
  'C6 . A5 . C6 . D6 C6 . . A5 . F6 . D6 .', 'C6 - - . Bb5 . A5 . G5 - - - . . . .',
  'C6 . A5 . C6 . D6 C6 . . A5 . F5 . G5 .', 'D6 - - . C6 . A5 . F5 - . G5 - . A5 .',
  'Bb5 - . A5 . G5 . F5 - . D5 . F5 . G5 .', 'E5 - - - . . . . C5 . D5 . E5 . G5 .');
const MC = bars('A5 . . A5 . . G5 . F5 . D5 . . . . .', 'Bb5 . . Bb5 . . A5 . G5 . F5 . . . . .',
  'D6 . . C6 . . Bb5 . A5 . . . F5 . G5 .', 'A5 - - - G5 - - - E5 - - - C5 . . .');
const MCH_A = 'F | Bb | F | C | F | Bb | Gm7 | C';
const MCH_C = 'Dm7 | Gm7 | Bb | C';
const FB1 = 'R..R..8.R.b3.5..', FB2 = 'R..R..8.R..58.a.';

const T = NN.TRACKS = {};

T.title = { bpm: 92, bars: 32, rev: 0.25,
  chords: bars('C | Am | F | G', TC_A, TC_B, TC_AE, 'F | C | Dm7 | G'),
  layers: [
    { i: 'pad', v: 0.1, chord: 'x-------x-------', lo: 52, cut: 1000 },
    { i: 'harp', v: 0.14, arp: '0-1-2-3-4-3-2-1-', lo: 60, pan: 0.25 },
    { i: 'lead', v: 0.15, mel: bars(rest(4), TH_A, TH_B, TH_AE, rest(4)), echo: 0.12 },
    { i: 'bell', v: 0.06, mel: bars(rest(20), TH_AE, rest(4)), tr: 12, pan: -0.3, on: '20-27' },
    { i: 'choir', v: 0.1, chord: 'x-------x-------', lo: 55, on: '20-31' },
    { i: 'tbass', v: 0.3, bass: 'R-----R-5-----5-', on: '4-31' },
    { i: 'kick', v: 0.3, hit: 'x.......x.......', on: '12-27' },
    { i: 'shaker', v: 0.05, hit: '..x...x...x...x.', on: '12-27', pan: 0.3 },
    { i: 'brush', v: 0.1, hit: '....x.......x...', on: '20-27' },
  ] };

T.meadow = { bpm: 112, swing: 0.25, bars: 32, rev: 0.15,
  chords: bars(MCH_A, MCH_A, xp(TC_A, 5), MCH_C, MCH_C),
  layers: [
    { i: 'pulse', v: 0.12, mel: MA, res: 1, on: '0-7', leg: 0.8, pan: -0.15 },
    { i: 'lead', v: 0.13, mel: MA, res: 1, on: '8-15', leg: 0.8, echo: 0.1 },
    { i: 'lead', v: 0.15, mel: TH_A, tr: 5, on: '16-23', echo: 0.1 },
    { i: 'pulse', v: 0.12, mel: MC, res: 1, on: '24-31', leg: 0.8 },
    { i: 'fbass', v: 0.3, bass: [FB1, FB1, FB1, FB2] },
    { i: 'kick', v: 0.38, hit: 'x.....x...x.....' },
    { i: 'snare', v: 0.12, hit: ['....x..g....x...', '....x..g....x..g'] },
    { i: 'hat', v: 0.045, hit: 'x.o.x.o.x.o.x.oo', pan: 0.25 },
    { i: 'clap', v: 0.1, hit: '....x.......x...', on: '8-15,24-31', pan: -0.1 },
    { i: 'keys', v: 0.13, chord: '..x...x...x..x..', lo: 57, on: '8-31', pan: 0.2 },
    { i: 'pluck', v: 0.08, arp: '0.2.4.2.1.3.4.3.', lo: 65, on: '8-15,24-31', pan: -0.3, echo: 0.15 },
    { i: 'pad', v: 0.08, chord: 'x-------x-------', lo: 53, on: '16-23' },
    { i: 'bell', v: 0.05, mel: TH_A, tr: 17, on: '20-23', pan: 0.3 },
  ] };

const RA = bars('D5 - G5 - - - F#5 E5', 'D5 - B4 - G4 - - -', 'E5 - G5 - - - A5 G5', 'F#5 - - - D5 - - -',
  'D5 - G5 - - - A5 B5', 'B5 - A5 G5 - - E5 -', 'E5 - D5 C5 - - A4 C5', 'D5 - - - - - . .');
const RB = bars('G5 - E5 - C5 - E5 -', 'D5 - B4 - G4 - B4 -', 'C5 - E5 - A5 - G5 E5', 'G5 - - - B4 - - -',
  'E5 - G5 - C6 - B5 A5', 'B5 - G5 - D5 - G5 -', 'A5 - G5 E5 F#5 - E5 D5', 'D5 - - - - - . .');
const RCH_A = 'G | Em | C | D | G | Em | Am7 | D', RCH_B = 'C | G | Am | Em | C | G | Am7 D | D';
T.river = { bpm: 100, swing: 0.55, sw8: true, bars: 32, rev: 0.22,
  chords: bars(RCH_A, RCH_B, RCH_A, RCH_B),
  layers: [
    { i: 'pulse', v: 0.11, mel: bars(RA, RB), on: '0-15', echo: 0.15, cut: 2200 },
    { i: 'flute', v: 0.2, mel: bars(RA, RB), on: '16-31' },
    { i: 'bell', v: 0.05, mel: RB, tr: 12, on: '24-31', pan: -0.3 },
    { i: 'harp', v: 0.13, arp: '0-1-2-3-4-3-2-1-', lo: 59, pan: 0.3 },
    { i: 'tbass', v: 0.3, bass: 'R--.5--.R--.5-3.' },
    { i: 'shaker', v: 0.05, hit: 'x.o.x.o.x.o.x.o.', on: '8-31', pan: -0.3 },
    { i: 'rim', v: 0.07, hit: '....x.......x...', on: '8-31' },
    { i: 'kick', v: 0.3, hit: 'x.......x..x....', on: '8-31' },
    { i: 'keys', v: 0.1, chord: '..x-..x-..x-..x-', lo: 55, on: '16-31', pan: 0.2 },
    { i: 'pad', v: 0.06, chord: 'x-------x-------', lo: 55, on: '24-31' },
  ] };

const TA = bars('G5 - - - F#5 - E5 -', 'E5 - - - - - D5 -', 'D5 - - - B4 - D5 -', 'A4 - - - - - . .',
  'G5 - - - F#5 - E5 -', 'E5 - - - G5 - A5 -', 'B5 - - - A5 - G5 -', 'F#5 - - - - - . .');
const TB = bars('E5 - G5 - C6 - - -', 'B5 - - - A5 - G5 -', 'F#5 - - - A5 - - -', 'G5 - - - E5 - - -',
  'E5 - G5 - C6 - B5 -', 'D6 - - - B5 - G5 -', 'A5 - - - G5 - E5 -', 'F#5 - - - D5 - - -');
const TCH_A = 'Em | C | G | D | Em | C | Am | B7', TCH_B = 'C | G | D | Em | C | G | Am7 | D';
T.thorns = { bpm: 80, bars: 32, rev: 0.3,
  chords: bars(TCH_A, TCH_B, TCH_A, TCH_B),
  layers: [
    { i: 'flute', v: 0.2, mel: bars(TA, TB), on: '0-15,24-31' },
    { i: 'keys', v: 0.17, mel: TA, on: '16-23', echo: 0.15 },
    { i: 'bell', v: 0.05, mel: TB, tr: 12, on: '24-31', echo: 0.2, pan: 0.3 },
    { i: 'harp', v: 0.13, arp: '0-2-4-2-3-4-5-4-', lo: 55, pan: -0.25 },
    { i: 'pad', v: 0.09, chord: 'x---------------', lo: 52, cut: 900 },
    { i: 'choir', v: 0.08, chord: 'x---------------', lo: 55, on: '8-15,24-31' },
    { i: 'tbass', v: 0.26, bass: 'R-------5-------', on: '8-31' },
    { i: 'heart', v: 0.25, hit: 'x.......x.......', on: '16-23' },
    { i: 'brush', v: 0.08, hit: '....x.......x...', on: '24-31' },
  ] };

const RDA = bars('G4 - B4 - D5 - E5 D5', 'E5 - G5 E5 C5 - - -', 'D5 - B4 - G4 - A4 B4', 'A4 - - - - - D5 C5',
  'B4 - D5 - G5 - F#5 E5', 'E5 - G5 - E5 - C5 -', 'A4 - C5 - F#5 - E5 D5', 'G5 - - - - - . .');
const RDB = bars('E5 - - E5 G5 - E5 -', 'C5 - - - G4 - A4 Bb4', 'B4 - - - D5 - G5 -', 'G#5 - - - E5 - D5 -',
  'C#5 - E5 - A5 - G5 -', 'E5 - - - C#5 - - -', 'D5 - F#5 - A5 - F#5 -', 'C5 - - - A4 - F#4 -');
const RDCH_A = 'G | C | G | D | G | C | D7 | G', RDCH_B = 'C | C | G | E7 | A7 | A7 | D | D7';
T.road = { bpm: 104, swing: 0.6, sw8: true, bars: 32, rev: 0.15,
  chords: bars(RDCH_A, RDCH_A, RDCH_B, RDCH_A),
  layers: [
    { i: 'pulse', v: 0.12, mel: RDA, on: '0-15' },
    { i: 'lead', v: 0.13, mel: RDB, on: '16-23', echo: 0.1 },
    { i: 'flute', v: 0.16, mel: RDA, tr: 12, on: '24-31' },
    { i: 'wbass', v: 0.38, bass: ['R---3---5---a---', 'R---5---8---a---'] },
    { i: 'kick', v: 0.3, hit: 'x.......x.......' },
    { i: 'hat', v: 0.05, hit: 'x...x.x.x...x.x.', pan: 0.3, dec: 0.06 },
    { i: 'brush', v: 0.1, hit: '....x.......x...' },
    { i: 'clap', v: 0.11, hit: '....x.......x...', on: '8-31', pan: -0.15 },
    { i: 'keys', v: 0.11, chord: '..x-..x-..x-..x-', lo: 55, on: '8-31', pan: 0.2 },
  ] };

const CA = bars('D5 - - - - - . .', '. . A4 - C5 - D5 -', 'E5 - - - - - . .', '. . G5 - E5 - C5 -',
  'D5 - - - - - . .', '. . F5 - E5 - D5 -', 'C5 - - - E5 - - -', 'D5 - - - - - . .');
const CW = bars('A5 - - G5 F5 - G5 A5', 'C6 - - - G5 - - -', 'F5 - - - D5 - - -', 'C5 - - - - - . .',
  'Bb4 - D5 - G5 - - -', 'F5 - - - E5 - D5 -', 'D5 - - - C5 - Bb4 -', 'C5 - - - E5 - - -');
const CCH_A = 'Dm | Dm | C | C | Bb | Bb | C | Dm', CCH_W = 'F | C | Bb | F | Gm | Dm | Bb | C';
T.canyon = { bpm: 76, bars: 32, rev: 0.35, echoT: 6, echoFb: 0.45,
  chords: bars(CCH_A, CCH_A, CCH_W, CCH_A),
  layers: [
    { i: 'wind', v: 0.12, drone: true },
    { i: 'flute', v: 0.19, mel: CA, on: '0-7', echo: 0.35 },
    { i: 'keys', v: 0.14, mel: CA, on: '8-15', echo: 0.4, pan: 0.2 },
    { i: 'flute', v: 0.2, mel: CW, on: '16-23', echo: 0.2 },
    { i: 'flute', v: 0.17, mel: CA, tr: -12, on: '24-31', echo: 0.35 },
    { i: 'bell', v: 0.05, mel: CA, on: '24-31', echo: 0.45, pan: -0.4 },
    { i: 'harp', v: 0.1, arp: '0...2...4...2...', lo: 50, on: '8-31', echo: 0.25, pan: -0.3 },
    { i: 'tbass', v: 0.26, bass: 'R-------........' },
    { i: 'pad', v: 0.09, chord: 'x---------------', lo: 52, cut: 800, on: '16-23' },
    { i: 'pad', v: 0.05, chord: 'x---------------', lo: 50, cut: 600, on: '24-31' },
    { i: 'tom', v: 0.18, hit: 'l.........l.....', on: '8-15,24-31', echo: 0.3 },
  ] };

const HA = bars('A4 - D5 - D5 E5 F#5 D5', 'E5 - C5 - C5 D5 E5 C5', 'D5 - B4 - G4 A4 B4 D5', 'A4 - - - D5 - - -',
  'F#5 - A5 - A5 B5 A5 F#5', 'G5 - E5 - C5 D5 E5 G5', 'B5 - G5 - E5 - C#5 -', 'D5 - - - - - . .');
const HB = bars('B5 - - A5 G5 - - B5', 'A5 - - F#5 D5 - - F#5', 'G5 - - E5 C5 - E5 G5', 'F#5 - - - A5 - - -',
  'B5 - - A5 G5 - B5 D6', 'A5 - F#5 - D5 - F#5 A5', 'G5 - E5 - E5 - C#5 -', 'D5 - - - - - . .');
const HCH_A = 'D | C | G | D | D | C | G A | D', HCH_B = 'G | D | C | D | G | D | C A | D';
T.highlands = { bpm: 116, swing: 0.7, sw8: true, bars: 32, rev: 0.2,
  chords: bars(HCH_A, HCH_A, HCH_B, HCH_A),
  layers: [
    { i: 'drone', v: 0.08, drone: true, notes: [38, 45, 50], cut: 600 },
    { i: 'reed', v: 0.12, mel: HA, on: '0-15,24-31' },
    { i: 'reed', v: 0.12, mel: HB, on: '16-23' },
    { i: 'flute', v: 0.12, mel: HA, on: '24-31' },
    { i: 'tbass', v: 0.3, bass: 'R-..5-..R-..5-..', on: '8-31' },
    { i: 'tom', v: 0.2, hit: 'l.m.l.m.l.m.h.m.', on: '8-31', pan: -0.15 },
    { i: 'shaker', v: 0.05, hit: 'x.x.x.x.x.x.x.x.', on: '8-31', pan: 0.3 },
    { i: 'kick', v: 0.3, hit: 'x.......x.......', on: '16-31' },
    { i: 'snare', v: 0.1, hit: '....x.......x...', on: '16-31' },
    { i: 'clap', v: 0.1, hit: '....x.......x...', on: '24-31' },
    { i: 'harp', v: 0.1, arp: '0-1-2-3-4-3-2-1-', lo: 62, on: '16-31', pan: 0.25 },
    { i: 'choir', v: 0.09, chord: 'x-------x-------', lo: 57, on: '16-31' },
    { i: 'bell', v: 0.04, mel: HA, tr: 12, on: '24-31', pan: -0.3 },
  ] };

// Home: the meadow riff again, slower, warmer, with the theme in the middle.
T.home = { bpm: 96, swing: 0.2, bars: 32, rev: 0.25,
  chords: bars('Fmaj7 | Bbmaj7 | Fmaj7 | C | Fmaj7 | Bbmaj7 | Gm7 | C', 'Fmaj7 | Bbmaj7 | Fmaj7 | C | Fmaj7 | Bbmaj7 | Gm7 | C',
    xp(TC_A, 5), MCH_C, MCH_C),
  layers: [
    { i: 'keys', v: 0.17, mel: MA, res: 1, on: '0-7', leg: 0.9 },
    { i: 'flute', v: 0.17, mel: MA, res: 1, tr: -12, on: '8-15', leg: 0.95 },
    { i: 'lead', v: 0.14, mel: TH_A, tr: -7, on: '16-23', echo: 0.1 },
    { i: 'bell', v: 0.05, mel: TH_A, tr: 5, on: '20-23', pan: 0.3 },
    { i: 'keys', v: 0.16, mel: MC, res: 1, on: '24-31' },
    { i: 'choir', v: 0.09, chord: 'x-------x-------', lo: 55, on: '16-31' },
    { i: 'pad', v: 0.08, chord: 'x-------x-------', lo: 53 },
    { i: 'harp', v: 0.1, arp: '0-2-4-2-1-3-4-3-', lo: 60, on: '8-31', pan: -0.25 },
    { i: 'tbass', v: 0.28, bass: 'R.....5.R...3...' },
    { i: 'kick', v: 0.26, hit: 'x.......x.......', on: '8-31' },
    { i: 'brush', v: 0.08, hit: '....x.......x...', on: '8-31' },
    { i: 'shaker', v: 0.04, hit: '..x...x...x...x.', on: '16-31', pan: 0.3 },
  ] };

const NA = bars('. . E5 - - - C5 -', 'A4 - - - - - . .', '. . F5 - - - D5 -', 'B4 - - - G#4 - - -',
  '. . E5 - - - A5 -', 'G5 - - - F5 - E5 -', 'F5 - - - D5 - B4 -', 'G#4 - - - - - . .');
const NB = 'R..R..5.R..3.5..';
T.night = { bpm: 84, swing: 0.15, bars: 32, rev: 0.25, echoFb: 0.35,
  chords: rep('Am | F | Dm | E', 8),
  layers: [
    { i: 'pad', v: 0.08, chord: 'x---------------', lo: 52, cut: 700 },
    { i: 'tbass', v: 0.3, bass: [NB, NB, NB, 'R..R..5.8.7.5.3.'] },
    { i: 'kick', v: 0.3, hit: 'x......x..x.....' },
    { i: 'hat', v: 0.04, hit: '..x...x...x...xx', pan: 0.3 },
    { i: 'rim', v: 0.07, hit: '....x.......x...', on: '8-31' },
    { i: 'pluck', v: 0.07, arp: '0..1..2.0..1..2.', lo: 57, on: '0-7,16-31', echo: 0.3, pan: -0.3, dec: 0.15 },
    { i: 'pulse', v: 0.1, mel: NA, on: '8-15', cut: 1800, echo: 0.2 },
    { i: 'reed', v: 0.1, mel: NA, tr: -12, on: '16-23', cut: 1400 },
    { i: 'bell', v: 0.05, mel: NA, on: '24-31', echo: 0.4, pan: 0.3 },
    { i: 'tom', v: 0.15, hit: '..........l...l.', on: '24-31' },
    { i: 'choir', v: 0.08, chord: 'x---------------', lo: 52, when: 'choir' },
  ] };

const FA = bars('F#5 - - - D5 - - -', 'D5 - - - Bb4 - - -', 'F#5 - - - G5 - F#5 -', 'A#4 - - - - - . .',
  'G5 - - - E5 - - -', 'Eb5 - - - C5 - - -', 'D5 - - - B4 - - -', 'C#5 - - - A#4 - E5 -');
const FCH = 'Bm | Gm | Bm | F# | Em | Cm | Bm | F#7';
T.frights = { bpm: 72, bars: 32, rev: 0.4, gain: 1.6, echoT: 6, echoFb: 0.45,
  chords: rep(FCH, 4),
  layers: [
    { i: 'drone', v: 0.07, drone: true, notes: [35, 42], cut: 300 },
    { i: 'ghost', v: 0.09, chord: 'x---------------', lo: 54 },
    { i: 'tick', v: 0.05, hit: 'x...x...x...x...', pan: 0.4 },
    { i: 'heart', v: 0.3, hit: 'x...............', on: '0-23' },
    { i: 'bell', v: 0.08, mel: FA, on: '8-15,24-31', echo: 0.4, pan: -0.2 },
    { i: 'flute', v: 0.14, mel: FA, tr: -12, on: '24-31', vib: 2 },
    { i: 'pluck', v: 0.06, arp: '0...1...2...1...', lo: 47, on: '16-31', dec: 0.3 },
    { i: 'choir', v: 0.07, chord: 'x---------------', lo: 59, on: '16-23', wide: true, det: 25 },
    { i: 'whoosh', v: 0.08, hit: 'x...............', on: '3,11,19,27' },
    { i: 'choir', v: 0.06, chord: 'x---------------', lo: 54, when: 'choir', on: '0-15,24-31' },
  ] };

const SA = bars('A4 - - D5 - - F5 -', 'F5 - - - E5 - D5 -', 'E5 - - - C5 - - -', 'C#5 - - - - - A4 -',
  'A4 - - D5 - - A5 -', 'G5 - - - F5 - D5 -', 'Bb4 - - - D5 - G5 -', 'E5 - - - C#5 - - -');
T.storm = { bpm: 88, bars: 32, rev: 0.25,
  chords: rep('Dm | Bb | C | A | Dm | Bb | Gm | A', 4),
  layers: [
    { i: 'rain', v: 0.11, drone: true },
    { i: 'thunder', v: 0.35, hit: ['......x.........', '..x.............', 'x...............', '..........x.....'], on: '2,9,17,27' },
    { i: 'pad', v: 0.08, chord: 'x---------------', lo: 50, cut: 650 },
    { i: 'tbass', v: 0.3, bass: ['R..R..R.R..R.5..', 'R..R..R.R.R.5.8.'] },
    { i: 'kick', v: 0.32, hit: 'x..x..x...x.....' },
    { i: 'hat', v: 0.035, hit: '..x...x...x...x.', on: '8-31', pan: 0.3 },
    { i: 'snare', v: 0.1, hit: '....x.......x...', on: '8-23' },
    { i: 'tom', v: 0.2, hit: '........h.m.l.ll', on: '7,15,23,31' },
    { i: 'lead', v: 0.12, mel: SA, on: '8-15', cut: 2000, echo: 0.15 },
    { i: 'reed', v: 0.11, mel: SA, on: '16-23', cut: 1500 },
    { i: 'choir', v: 0.07, chord: 'x---------------', lo: 50, on: '16-31' },
    { i: 'pluck', v: 0.06, arp: '0.1.2.1.0.1.2.1.', lo: 57, on: '16-23', echo: 0.2, pan: -0.3 },
    { i: 'bell', v: 0.05, mel: SA, on: '24-31', echo: 0.4, pan: 0.3 },
  ] };

const SBA = bars('C5 - E5 G5 - - A5 G5', 'F5 - A5 - C6 - A5 -', 'G5 - E5 - C5 - E5 G5', 'F5 - - - D5 - B4 -',
  'C5 - E5 G5 - - A5 G5', 'A5 - C6 - D6 - C6 A5', 'F#5 - A5 - G5 - F5 D5', 'C5 - - - - - . .');
const SBB = bars('A5 - - A5 G5 - F5 -', 'E5 - - - C5 - - -', 'A5 - - A5 Bb5 - A5 -', 'G5 - - - - - . .',
  'A5 - - A5 G5 - F5 -', 'E5 - G5 - C6 - - -', 'D6 - C6 - B5 - G5 -', 'C6 - - - - - . .');
const SBCH_A = 'C | F | C | G7 | C | F | D7 G7 | C', SBCH_B = 'F | C | F | G | F | C | D7 G7 | C';
T.sabbath = { bpm: 126, swing: 0.65, sw8: true, bars: 32, rev: 0.18, gain: 0.85,
  chords: bars(SBCH_A, SBCH_B, TC_AE, SBCH_A),
  layers: [
    { i: 'lead', v: 0.14, mel: SBA, on: '0-7' },
    { i: 'lead', v: 0.14, mel: SBB, on: '8-15' },
    { i: 'lead', v: 0.14, mel: TH_AE, on: '16-23', echo: 0.08 },
    { i: 'brass', v: 0.11, mel: SBA, on: '24-31' },
    { i: 'bell', v: 0.04, mel: SBA, tr: 12, on: '24-31', pan: 0.3 },
    { i: 'brass', v: 0.07, chord: '..x...x.....x...', lo: 60, on: '0-15' },
    { i: 'keys', v: 0.11, chord: '..x-..x-..x-..x-', lo: 55, pan: 0.2 },
    { i: 'tbass', v: 0.32, bass: 'R-3-5-6-8-6-5-3-' },
    { i: 'kick', v: 0.32, hit: 'x...x...x...x...' },
    { i: 'snare', v: 0.11, hit: '....x.......x...' },
    { i: 'hat', v: 0.04, hit: 'x.x.x.x.x.x.x.x.', pan: 0.3 },
    { i: 'clap', v: 0.12, hit: '....x.......x...', pan: -0.2 },
    { i: 'shaker', v: 0.05, hit: '..x...x...x...x.', on: '8-31', pan: -0.35 },
    { i: 'choir', v: 0.1, chord: 'x-------x-------', lo: 57, on: '8-23' },
    { i: 'bell', v: 0.05, mel: TH_AE, tr: 12, on: '16-23', pan: -0.3 },
  ] };

// The last night: the theme's head turns up in the minor, and the key climbs a semitone every eight bars.
const BA = bars('C5 - - Eb5 - - G5 -', 'Ab5 - G5 - Eb5 - C5 -', 'Eb5 - - - C5 - - -', 'D5 - - - B4 - - -',
  'C5 - - Eb5 - - G5 -', 'Bb5 - Ab5 - G5 - Eb5 -', 'F5 - - - Ab5 - C6 -', 'B5 - - - - - . .');
T.boss = { bpm: 136, bars: 32, rev: 0.15, shift: b => (b >= 24 ? 2 : b >= 16 ? 1 : 0),
  chords: rep('Cm | Cm | Ab | G | Cm | Cm | Fm | G', 4),
  layers: [
    { i: 'fbass', v: 0.28, bass: ['R.RR.RR.R.RR.R7.', 'R.RR.RR.R.RR8.b.'] },
    { i: 'kick', v: 0.36, hit: 'x...x...x...x...' },
    { i: 'snare', v: 0.12, hit: '....x.......x...', on: '8-31' },
    { i: 'hat', v: 0.035, hit: 'x.x.x.x.x.x.x.x.', pan: 0.3 },
    { i: 'hat', v: 0.025, hit: '.o.o.o.o.o.o.o.o', on: '24-31', pan: -0.3 },
    { i: 'tom', v: 0.2, hit: '........hhmmllll', on: '7,15,23,31' },
    { i: 'pad', v: 0.08, chord: 'x---------------', lo: 50, cut: 900 },
    { i: 'lead', v: 0.13, mel: BA, on: '8-15,24-31', cut: 2200 },
    { i: 'brass', v: 0.1, mel: TH_MIN, on: '16-23' },
    { i: 'brass', v: 0.06, chord: 'x--.x--.........', lo: 55, on: '24-31' },
    { i: 'choir', v: 0.09, chord: 'x---------------', lo: 55, on: '16-31' },
    { i: 'pluck', v: 0.06, arp: '0.1.2.0.1.2.0.1.', lo: 60, on: '16-31', echo: 0.2, pan: -0.3 },
  ] };

// The days without Him: the theme in D minor, slow, then a consoling turn to F.
const SOA = bars('F5 - - E5 D5 - E5 F5', 'A5 - - - E5 - - -', 'F5 - - E5 D5 - E5 F5', 'Bb5 - - - A5 - - -',
  'Bb5 - D6 - C6 - Bb5 -', 'A5 - - F5 D5 - - -', 'E5 - - F5 G5 - F5 E5', 'E5 - - - - - . .');
const SOB = bars('D5 - - - F5 - - -', 'C5 - - - A4 - - -', 'Bb4 - - - D5 - G5 -', 'F5 - - - - - . .',
  'D5 - - - F5 - Bb5 -', 'A5 - - - G5 - F5 -', 'G5 - - - F5 - E5 -', 'E5 - - - - - . .');
const SOCH_A = 'Dm | Am | Dm | Gm | Bb | Dm | Gm A | A', SOCH_B = 'Bb | F | Gm | Dm | Bb | F | Gm | A';
T.sorrow = { bpm: 60, bars: 24, rev: 0.35,
  chords: bars(SOCH_A, SOCH_B, SOCH_A),
  layers: [
    { i: 'flute', v: 0.2, mel: SOA, tr: -12, on: '0-7', vib: 0.7 },
    { i: 'keys', v: 0.16, mel: SOB, on: '8-15', echo: 0.12 },
    { i: 'flute', v: 0.19, mel: SOA, on: '16-23', vib: 0.8 },
    { i: 'pad', v: 0.08, chord: 'x-------x-------', lo: 50, cut: 800 },
    { i: 'choir', v: 0.09, chord: 'x-------x-------', lo: 55, on: '16-23' },
    { i: 'sub', v: 0.22, bass: 'R-------R-------', on: '8-23' },
    { i: 'harp', v: 0.08, arp: '0---2---4---2---', lo: 55, on: '8-23', pan: 0.25 },
  ] };

// The third morning: birds and a hush, a first try at the tune, then the whole theme, in D.
const MORN_I = bars('E5 - - D5 C5 - D5 E5', 'G5 - - - - - . .', 'C5 - - - A4 - - -', 'B4 - - - D5 - - -');
T.morning = { bpm: 88, bars: 32, rev: 0.28,
  chords: bars(xp('C | Am | F | G | C | Am | F | G', 2), xp(TC_A, 2), xp(TC_B, 2), xp(TC_AE, 2)),
  layers: [
    { i: 'pad', v: 0.09, chord: 'x-------x-------', lo: 54, cut: 1000 },
    { i: 'harp', v: 0.11, arp: '0---2---4---2---', lo: 57, on: '0-7', pan: 0.25 },
    { i: 'harp', v: 0.12, arp: '0-1-2-3-4-3-2-1-', lo: 60, on: '8-31', pan: 0.25 },
    { i: 'chirp', v: 0.05, hit: ['..x.......x.....', '.......x........', '....x.....x.x...', '................'], on: '0-15', pan: 0.4 },
    { i: 'flute', v: 0.18, mel: bars(rest(4), MORN_I, TH_A, rest(16)), tr: 2, on: '4-15' },
    { i: 'lead', v: 0.14, mel: bars(rest(16), TH_B, TH_AE), tr: 2, on: '16-31', echo: 0.1 },
    { i: 'bell', v: 0.05, mel: bars(rest(24), TH_AE), tr: 14, on: '24-31', pan: -0.3 },
    { i: 'choir', v: 0.1, chord: 'x-------x-------', lo: 57, on: '16-31' },
    { i: 'tbass', v: 0.28, bass: 'R-----R-5-----5-', on: '8-31' },
    { i: 'kick', v: 0.28, hit: 'x.......x.......', on: '16-31' },
    { i: 'shaker', v: 0.045, hit: '..x...x...x...x.', on: '16-31', pan: -0.3 },
    { i: 'snare', v: 0.09, hit: '....x.......x...', on: '24-31' },
    { i: 'pad', v: 0.06, chord: 'x-------x-------', lo: 62, cut: 2000, on: '24-31' },
  ] };

T.credits = { bpm: 100, bars: 40, rev: 0.25, shift: b => (b >= 28 && b <= 35 ? 2 : 0),
  chords: bars('C | Am | F | G', TC_A, TC_B, TC_A, TC_AE, 'F | C | Dm7 | G'),
  layers: [
    { i: 'pad', v: 0.09, chord: 'x-------x-------', lo: 53 },
    { i: 'harp', v: 0.12, arp: '0-1-2-3-4-3-2-1-', lo: 60, pan: 0.3 },
    { i: 'lead', v: 0.15, mel: bars(rest(4), TH_A, rest(8), TH_A, TH_AE, rest(4)), echo: 0.1 },
    { i: 'keys', v: 0.17, mel: bars(rest(12), TH_B, rest(20)), on: '12-19' },
    { i: 'bell', v: 0.05, mel: bars(rest(20), TH_A, TH_AE, rest(4)), tr: 12, on: '20-35', pan: -0.3 },
    { i: 'choir', v: 0.1, chord: 'x-------x-------', lo: 55, on: '20-39' },
    { i: 'brass', v: 0.07, mel: bars(rest(28), TH_AE, rest(4)), tr: -12, on: '28-35' },
    { i: 'tbass', v: 0.3, bass: 'R-----R-5-----5-', on: '4-35' },
    { i: 'kick', v: 0.3, hit: 'x.......x.......', on: '12-35' },
    { i: 'snare', v: 0.1, hit: '....x.......x...', on: '20-35' },
    { i: 'shaker', v: 0.045, hit: '..x...x...x...x.', on: '12-35', pan: 0.3 },
    { i: 'hat', v: 0.03, hit: 'x.x.x.x.x.x.x.x.', on: '28-35' },
  ] };

// ---------------------------------------------------------------- sound effects: SFX[name](engine, time)
const NO = {};
const SFX = {
  heart(E, t) { const o = wet(E, 0.1); tone(E, o, t, 'sq', 988, 0, 0.07, 0.2, 3500); tone(E, o, t + 0.05, 'sq', 1319, 0, 0.1, 0.2, 3500); },
  join(E, t) {
    const o = wet(E, 0.2);
    [72, 76, 79, 84].forEach((m, i) => tone(E, o, t + i * 0.07, 'sq', mf(m), 0, 0.16, 0.17, 3200));
    V.bell(E, o, t + 0.28, 96, 0, 0.12, { dec: 0.3 });
  },
  swing(E, t) { burst(E, E.sfx, t, 'bandpass', 700, 1.2, 0.11, 0.35, 0.01, 2600); tone(E, E.sfx, t, 'triangle', 420, 160, 0.09, 0.22); },
  bark(E, t) {
    [0, 0.12].forEach(d => { tone(E, E.sfx, t + d, 'sq', 360, 200, 0.08, 0.26, 1300); burst(E, E.sfx, t + d, 'bandpass', 900, 1, 0.05, 0.2); });
  },
  bell(E, t) {
    const o = wet(E, 0.35);
    V.bell(E, o, t, 91, 0, 0.4, { dec: 0.45 }); V.bell(E, o, t + 0.2, 91, 0, 0.32, { dec: 0.45 }); V.bell(E, o, t, 79, 0, 0.12, { dec: 0.6 });
  },
  whistle(E, t) {
    const o = O(E, 'sine', 1700, t), g = G(E);
    o.frequency.exponentialRampToValueAtTime(2300, t + 0.14); o.frequency.setValueAtTime(2300, t + 0.18);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.36);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.02); g.gain.setTargetAtTime(0.06, t + 0.13, 0.02);
    g.gain.setTargetAtTime(0.22, t + 0.18, 0.015); g.gain.setTargetAtTime(0, t + 0.32, 0.03);
    o.connect(g); g.connect(wet(E, 0.2)); o.start(t); o.stop(t + 0.6);
    vib(E, [o], t, 1900, 0.012, 9, 0, t + 0.6);
  },
  hurt(E, t) { tone(E, E.sfx, t, 'sawtooth', 190, 90, 0.2, 0.28, 900); tone(E, E.sfx, t, 'sine', 120, 50, 0.15, 0.4); },
  yelp(E, t) {
    const o = O(E, 'triangle', 850, t), g = G(E);
    o.frequency.exponentialRampToValueAtTime(1500, t + 0.05); o.frequency.exponentialRampToValueAtTime(650, t + 0.17);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01); g.gain.setTargetAtTime(0, t + 0.1, 0.03);
    o.connect(g); g.connect(E.sfx); o.start(t); o.stop(t + 0.35);
  },
  level(E, t) {
    const o = wet(E, 0.25);
    [60, 64, 67, 72, 76, 79].forEach((m, i) => tone(E, o, t + i * 0.06, 'sq', mf(m), 0, 0.16, 0.16, 3200));
    V.bell(E, o, t + 0.38, 91, 0, 0.18, NO); V.bell(E, o, t + 0.46, 96, 0, 0.14, NO);
  },
  baa(E, t, f0) {
    const f = f0 || 270 + rnd() * 130, len = 0.34 + rnd() * 0.16, o = O(E, 'sawtooth', f, t);
    const l = O(E, 'sine', 19 + rnd() * 6, t), lg = G(E, f * 0.05);
    o.frequency.linearRampToValueAtTime(f * 1.05, t + 0.08); o.frequency.linearRampToValueAtTime(f * 0.88, t + len);
    l.connect(lg); lg.connect(o.frequency);
    const b1 = F(E, 'bandpass', 750, 2.5), b2 = F(E, 'bandpass', 1400, 3.5), dry = G(E, 0.12), lp = F(E, 'lowpass', 2600, 0.5), g = G(E);
    o.connect(b1); o.connect(b2); o.connect(dry); b1.connect(lp); b2.connect(lp); dry.connect(lp); lp.connect(g); g.connect(E.sfx);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55, t + 0.04); g.gain.setTargetAtTime(0.4, t + 0.04, 0.1);
    g.gain.setTargetAtTime(0, t + len - 0.08, 0.04);
    o.start(t); l.start(t); o.stop(t + len + 0.3); l.stop(t + len + 0.3);
  },
  // IV(add9) → Vsus4 → V → I(add9), rolled on keys with a choir under it and a bell melody A–C–B–C on top.
  forgive(E, t) {
    const o = wet(E, 0.45);
    const seq = [[0, [53, 60, 65, 67, 69], 81, 0.42], [0.42, [55, 62, 67, 72], 84, 0.26],
      [0.68, [55, 62, 67, 71], 83, 0.27], [0.95, [48, 55, 64, 67, 74, 76], 84, 1.9]];
    for (const [d, ch, top, len] of seq) {
      ch.forEach((m, k) => V.keys(E, o, t + d + k * 0.028, m, len, 0.11, { idx: 1 }));
      ch.slice(-3).forEach(m => V.choir(E, o, t + d, m, len, 0.06, { att: d ? 0.08 : 0.2, rel: len > 1 ? 0.5 : 0.12 }));
      V.bell(E, o, t + d + 0.02, top, 0, 0.16, { dec: len > 1 ? 0.6 : 0.35 });
    }
    V.bell(E, o, t + 1.1, 88, 0, 0.08, { dec: 0.5 }); V.bell(E, o, t + 1.22, 91, 0, 0.06, { dec: 0.5 });
    V.sub(E, o, t + 0.95, 36, 1.6, 0.25, NO);
  },
  build(E, t) {
    const o = wet(E, 0.15);
    [0, 0.13, 0.26].forEach((d, i) => { tone(E, E.sfx, t + d, 'sine', 700 + i * 90, 420, 0.06, 0.32); burst(E, E.sfx, t + d, 'bandpass', 1800, 1.5, 0.03, 0.25); });
    [72, 76, 79, 84].forEach((m, i) => V.harp(E, o, t + 0.42 + i * 0.045, m, 0, 0.2, NO));
    V.bell(E, o, t + 0.6, 91, 0, 0.12, NO);
  },
  collect(E, t) {
    const o = wet(E, 0.15);
    tone(E, o, t, 'triangle', 1319, 0, 0.1, 0.25); tone(E, o, t + 0.07, 'triangle', 1976, 0, 0.18, 0.22);
    V.bell(E, o, t + 0.07, 96, 0, 0.06, { dec: 0.25 });
  },
  chop(E, t) { burst(E, E.sfx, t, 'bandpass', 1500, 1, 0.06, 0.45); tone(E, E.sfx, t, 'sine', 220, 80, 0.12, 0.45); burst(E, E.sfx, t, 'highpass', 3500, 0.7, 0.02, 0.18); },
  thunder(E, t) {
    const o = wet(E, 0.3);
    burst(E, o, t, 'highpass', 1200, 0.5, 0.25, 0.16); burst(E, o, t + 0.02, 'lowpass', 900, 0.7, 0.4, 0.25);
    V.thunder(E, o, t + 0.05, null, 0, 0.9, NO);
  },
  fright(E, t) {
    const o = wet(E, 0.4);
    [520, 533].forEach(f => {
      const s = O(E, 'sine', f, t), g = G(E), tr = G(E, 1), l = O(E, 'sine', 11, t), lg = G(E, 0.5);
      s.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.9); l.connect(lg); lg.connect(tr.gain);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.1); g.gain.setTargetAtTime(0, t + 0.5, 0.15);
      s.connect(g); g.connect(tr); tr.connect(o); s.start(t); l.start(t); s.stop(t + 1.5); l.stop(t + 1.5);
    });
    burst(E, o, t, 'bandpass', 2600, 2, 0.6, 0.06, 0.2);
  },
  roar(E, t) {                                          // the Prowler: low, growling, not too loud
    const o = wet(E, 0.25), a = O(E, 'sawtooth', 80, t), b = O(E, 'sawtooth', 54, t), lp = F(E, 'lowpass', 300, 1.5);
    const am = G(E, 0.6), l = O(E, 'sine', 27, t), lg = G(E, 0.4), g = G(E);
    a.frequency.linearRampToValueAtTime(95, t + 0.35); a.frequency.exponentialRampToValueAtTime(52, t + 1.5);
    b.frequency.linearRampToValueAtTime(64, t + 0.35); b.frequency.exponentialRampToValueAtTime(35, t + 1.5);
    lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(900, t + 0.3); lp.frequency.setTargetAtTime(250, t + 0.5, 0.4);
    l.connect(lg); lg.connect(am.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42, t + 0.25); g.gain.setTargetAtTime(0.28, t + 0.3, 0.3);
    g.gain.setTargetAtTime(0, t + 1.1, 0.2);
    a.connect(lp); b.connect(lp); lp.connect(am); am.connect(g); g.connect(o);
    [a, b, l].forEach(n => { n.start(t); n.stop(t + 2.4); });
    burst(E, o, t, 'lowpass', 600, 0.7, 1.2, 0.25, 0.2, 0, E.brown);
    tone(E, o, t, 'sine', 48, 38, 1.2, 0.3, 0, 0.2);
  },
  splash(E, t) {
    const o = wet(E, 0.2);
    burst(E, o, t, 'bandpass', 2600, 0.9, 0.35, 0.4, 0.005, 500); burst(E, o, t, 'lowpass', 800, 0.7, 0.15, 0.3);
    [0.1, 0.17, 0.27].forEach((d, i) => tone(E, o, t + d, 'sine', 1100 + i * 250, 2100 + i * 300, 0.05, 0.12));
  },
  door(E, t) {
    const o = O(E, 'sawtooth', 130, t), bp = F(E, 'bandpass', 900, 4), g = G(E), l = O(E, 'sine', 7, t), lg = G(E, 35);
    l.connect(lg); lg.connect(o.frequency); o.frequency.linearRampToValueAtTime(170, t + 0.35);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.05); g.gain.setTargetAtTime(0, t + 0.36, 0.02);
    o.connect(bp); bp.connect(g); g.connect(E.sfx); o.start(t); l.start(t); o.stop(t + 0.55); l.stop(t + 0.55);
    tone(E, E.sfx, t + 0.38, 'sine', 120, 55, 0.18, 0.45); burst(E, E.sfx, t + 0.38, 'lowpass', 500, 0.7, 0.1, 0.35);
  },
  menu(E, t) { tone(E, E.sfx, t, 'triangle', 660, 0, 0.07, 0.25); tone(E, E.sfx, t + 0.05, 'triangle', 990, 0, 0.1, 0.22); },
  select(E, t) { tone(E, E.sfx, t, 'sq', 880, 0, 0.05, 0.13, 3000); tone(E, E.sfx, t + 0.055, 'sq', 1320, 0, 0.08, 0.13, 3000); },
  cancel(E, t) { tone(E, E.sfx, t, 'triangle', 700, 0, 0.07, 0.25); tone(E, E.sfx, t + 0.07, 'triangle', 470, 0, 0.12, 0.25); },
  page(E, t) { burst(E, E.sfx, t, 'bandpass', 4200, 0.9, 0.14, 0.22, 0.02, 1400); burst(E, E.sfx, t + 0.06, 'highpass', 3000, 0.7, 0.05, 0.1); },
  munch(E, t) { [0, 0.12, 0.24].forEach(d => burst(E, E.sfx, t + d, 'bandpass', 900 + rnd() * 600, 1.4, 0.06, 0.8, 0.004)); },
  gulp(E, t) { tone(E, E.sfx, t, 'sine', 240, 520, 0.1, 0.35, 0, 0.01); tone(E, E.sfx, t + 0.13, 'sine', 330, 720, 0.07, 0.2, 0, 0.01); },
  snore(E, t) {
    const s = Nz(E, E.brown, t, 1.4), lp = F(E, 'lowpass', 450, 2), g = G(E), o = O(E, 'sawtooth', 82, t), ol = F(E, 'lowpass', 300, 1), og = G(E, 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.7); g.gain.linearRampToValueAtTime(0, t + 1.2);
    s.connect(lp); lp.connect(g); o.connect(ol); ol.connect(og); og.connect(g); g.connect(E.sfx); o.start(t); o.stop(t + 1.3);
    tone(E, E.sfx, t + 1.3, 'sine', 1000, 760, 0.4, 0.05, 0, 0.1);
  },
  cheer(E, t) {
    const o = wet(E, 0.2);
    [0, 0.07, 0.15].forEach((d, i) => SFX.baa(E, t + d, 330 + i * 60));
    [72, 76, 79, 84, 88].forEach((m, i) => V.harp(E, o, t + 0.05 + i * 0.05, m, 0, 0.18, NO));
    [0, 0.18, 0.36].forEach(d => V.clap(E, E.sfx, t + 0.1 + d, null, 0, 0.35));
  },
  step(E, t) { burst(E, E.sfx, t, 'lowpass', 300 + rnd() * 250, 0.8, 0.05, 0.22, 0.003); },
};

// ---------------------------------------------------------------- the live engine and the public API
const A = { E: null, track: null, paused: false, muted: false, music: true, flags: { choir: false }, timer: 0, last: {} };
function tick() {
  const E = A.E; if (!E) return;
  const now = E.ctx.currentTime, silent = A.paused || A.muted || !A.music;
  if (silent !== E.silent) {
    E.silent = silent;
    for (const n of [E.gate, E.rvGate]) { n.gain.cancelScheduledValues(now); n.gain.setTargetAtTime(silent ? 0 : 1, now, silent ? 0.03 : 0.06); }
  }
  const S = E.cur;
  if (S && (silent || S.next < now - 0.25)) S.next = Math.max(S.next, now + 0.06);   // freeze while silent; skip after a stall
  pump(E, now + 0.12, now);
}
const sfxOk = () => !!(A.E && !A.muted);
function note(t, f, d, type = 'square', v = 0.1, dest, slide = 0) {
  const E = A.E; if (!E) return;
  const o = E.ctx.createOscillator(), g = E.ctx.createGain();
  if (E.waves[type]) o.setPeriodicWave(E.waves[type]); else o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(dest || E.sfx); o.start(t); o.stop(t + d + 0.02);
}
NN.sfx = {};
for (const k of Object.keys(SFX)) {
  NN.sfx[k] = () => {
    if (!sfxOk()) return;
    const now = A.E.ctx.currentTime;
    if (now - (A.last[k] || -1) < 0.035) return;      // the same sound twice in one frame is just louder
    A.last[k] = now;
    try { SFX[k](A.E, now + 0.005); } catch (e) { warn(`sfx ${k}: ${e.message}`); }
  };
}

NN.audio = {
  init() {
    if (A.E) { if (A.E.ctx.state === 'suspended') A.E.ctx.resume(); return; }
    let ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    A.E = makeEngine(ctx, { live: true }); A.E.flags = A.flags;
    if (A.muted) A.E.master.gain.value = 0;
    if (A.track) A.E.pend = { name: A.track };
    if (ctx.state === 'suspended') ctx.resume();
    A.timer = setInterval(tick, 25); tick();
  },
  track(name) {
    if (name === undefined) return;
    if (name && !NN.TRACKS[name]) { warn('unknown track ' + name); name = null; }
    name = name || null;
    if (name === A.track) return;
    A.track = name;
    const E = A.E; if (!E) return;
    const S = E.cur;
    if (S && S.name === name) { E.pend = null; return; }
    let fade = false;
    if (S) fade = S.next - E.ctx.currentTime + ((16 - S.step % 16) % 16) * S.sd > 1.0;
    E.pend = { name, fade };
  },
  get current() { return A.track; },
  get paused() { return A.paused; }, set paused(v) { A.paused = !!v; tick(); },
  get muted() { return A.muted; },
  toggleMute() {
    A.muted = !A.muted;
    if (A.E) { const now = A.E.ctx.currentTime; A.E.master.gain.cancelScheduledValues(now); A.E.master.gain.setTargetAtTime(A.muted ? 0 : MASTER, now, 0.02); }
    tick();
    return A.muted;
  },
  get ctx() { return A.E ? A.E.ctx : null; },
  get choir() { return A.flags.choir; }, set choir(v) { A.flags.choir = !!v; },
  get warnings() { return WARN.slice(); },
  loopSeconds(name) { const tr = compile(name); return tr ? tr.bars * 16 * 60 / tr.bpm / 4 : 0; },
  // Renders a track (or an sfx) offline. opt.raw skips the safety compressor so the levels are honest.
  render(name, seconds = 20, opt = {}) {
    const sr = opt.sr || 44100, oc = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
    const E = makeEngine(oc, { raw: opt.raw }); E.flags = { choir: !!opt.choir };
    if (SFX[name]) SFX[name](E, 0.05);
    else { E.pend = { name }; pump(E, seconds, 0); }
    return oc.startRendering();
  },
};
NN.note = note; NN.mf = mf; NN.sfxOk = sfxOk;
})();
