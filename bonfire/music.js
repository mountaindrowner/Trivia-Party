/* Bonfire's campfire guitar: an acoustic guitar noodling and jamming by the fire, made on the spot (no audio files).

   The sound: each note is a plucked string (Karplus-Strong: a burst of noise ringing round a delay as long as one
   period of the note, softened every time round, which is very close to how a real string behaves), through a
   guitar-body resonance and a little room reverb.
   The playing: open chords in G, fingerpicked (an alternating thumb on the bass, fingers on the top strings) or
   strummed, with a melody noodling over the top from the G major pentatonic, and everything a little loose in time
   and touch, like a person playing. Moods follow the screen: "title" (sparse), "lobby" (laid-back fingerpicking),
   "game" (a strummed jam with a soft cajon and shaker), "report" (slow and warm).
   The host's voice ducks it: duck(true) while speaking.

   BONFIRE_MUSIC(getContext) -> { start(), stop(), duck(on), mood(name), sfx(name) } */
window.BONFIRE_MUSIC = (getContext) => {
  "use strict";
  let c = null, master = null, dry = null, wet = null, timer = 0, on = false, ducked = false, current = "lobby", want = "lobby";
  const VOL = 0.75, DUCK = 0.24;
  const buffers = new Map();
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /** A plucked string, rendered once per note and kept. `tone` 0 (dark, nylon-ish) to 1 (bright, steel). */
  function stringBuffer(midi, tone = 0.5) {
    const key = `${midi}:${tone}`;
    if (buffers.has(key)) return buffers.get(key);
    // The loop is a whole number of samples, less half a sample from the smoothing, so it's tuned by playback speed.
    const sr = c.sampleRate, f = midiHz(midi), period = Math.max(2, Math.ceil(sr / f + 0.5));
    const len = Math.floor(sr * (midi < 52 ? 3.2 : midi < 64 ? 2.4 : 1.6));
    const buf = c.createBuffer(1, len, sr), out = buf.getChannelData(0), ring = new Float32Array(period);
    // The pluck: noise, smoothed (a softer pick), with a notch for where along the string it was plucked.
    let lp = 0;
    const smooth = 0.25 + (1 - tone) * 0.55, pos = Math.max(1, Math.floor(period * 0.18));
    for (let i = 0; i < period; i++) { lp += ((Math.random() * 2 - 1) - lp) * (1 - smooth); ring[i] = lp; }
    for (let i = period - 1; i >= pos; i--) ring[i] -= ring[i - pos] * 0.5;
    const decay = midi < 52 ? 0.9985 : midi < 64 ? 0.997 : 0.9955;
    let p = 0;
    for (let i = 0; i < len; i++) {
      const a = ring[p], b = ring[(p + 1) % period];
      ring[p] = decay * (a * 0.5 + b * 0.5);
      out[i] = a;
      p = (p + 1) % period;
    }
    for (let i = 0; i < 400; i++) out[len - 1 - i] *= i / 400; // no click at the end
    buf.tune = (f * (period - 0.5)) / sr;
    buffers.set(key, buf);
    return buf;
  }

  /** The guitar's body and the room: a warm EQ, then a short reverb made from decaying noise. */
  function build() {
    master = c.createGain(); master.gain.value = 0;
    const body = c.createBiquadFilter(); body.type = "peaking"; body.frequency.value = 180; body.Q.value = 1.1; body.gain.value = 4;
    const air = c.createBiquadFilter(); air.type = "lowpass"; air.frequency.value = 5200;
    dry = c.createGain(); dry.gain.value = 0.85;
    wet = c.createGain(); wet.gain.value = 0.32;
    const verb = c.createConvolver(), n = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    verb.buffer = ir;
    body.connect(air);
    air.connect(dry).connect(master);
    air.connect(verb).connect(wet).connect(master);
    master.connect(c.destination);
    return body;
  }
  let input = null;

  /** Play one string at `when`: loudness 0..1, pan -1..1. */
  function note(midi, when, vel = 0.6, pan = 0, tone = 0.5) {
    const s = c.createBufferSource(), g = c.createGain(), pn = c.createStereoPanner ? c.createStereoPanner() : null;
    s.buffer = stringBuffer(midi, tone);
    s.playbackRate.value = s.buffer.tune * (1 + rnd(-0.0012, 0.0012)); // in tune, give or take a hair, like a real guitar
    g.gain.value = vel * 0.55;
    s.connect(g);
    if (pn) { pn.pan.value = pan; g.connect(pn).connect(input); } else g.connect(input);
    s.start(when);
  }
  /** A strum across a chord shape: down (low to high) or up, the strings a few milliseconds apart. */
  function strum(shape, when, vel, up) {
    const strings = up ? shape.slice(-4).reverse() : shape;
    strings.forEach((m, i) => note(m, when + i * rnd(0.009, 0.016), vel * (up ? 0.7 : 1) * (1 - i * 0.04), -0.3 + (i / strings.length) * 0.6, 0.55));
  }
  /** A soft cajon (a thump) and a shaker (a hiss), for the jam. */
  function thump(when, vel) {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(110, when); o.frequency.exponentialRampToValueAtTime(48, when + 0.12);
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.5 * vel, when + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    o.connect(g).connect(input); o.start(when); o.stop(when + 0.25);
  }
  let shakerBuf = null;
  function shaker(when, vel) {
    if (!shakerBuf) { const n = Math.floor(c.sampleRate * 0.08); shakerBuf = c.createBuffer(1, n, c.sampleRate); const d = shakerBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / n); }
    const s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = shakerBuf; hp.type = "highpass"; hp.frequency.value = 6000; g.gain.value = 0.12 * vel;
    s.connect(hp).connect(g).connect(input); s.start(when);
  }

  /* Open chords (MIDI notes, low string to high). */
  const CH = {
    G: [43, 47, 50, 55, 59, 67], Em: [40, 47, 52, 55, 59, 64], C: [48, 52, 55, 60, 64], D: [50, 57, 62, 66],
    Am: [45, 52, 57, 60, 64], Cadd9: [48, 52, 55, 62, 67], Dsus4: [50, 57, 62, 67], Bm: [47, 54, 59, 62, 66],
  };
  /* The noodling: G major pentatonic, around the middle of the neck. */
  const PENTA = [62, 64, 67, 69, 71, 74, 76, 79, 81];
  const MOODS = {
    title: { bpm: 68, prog: ["G", "Cadd9", "Em", "D"], style: "sparse", noodle: 0.35 },
    lobby: { bpm: 80, prog: ["G", "Em", "Cadd9", "D", "G", "D", "Em", "Cadd9"], style: "pick", noodle: 0.55 },
    game: { bpm: 100, prog: ["G", "D", "Em", "C", "G", "D", "C", "D"], style: "strum", noodle: 0.4 },
    report: { bpm: 70, prog: ["C", "G", "Am", "G", "C", "G", "D", "D"], style: "pick", noodle: 0.6 },
  };

  /* The scheduler: a few tenths of a second ahead, one eighth note at a time. */
  let next = 0, step = 0, bar = 0, phrase = [];
  function schedule() {
    if (!on || !c) return;
    while (next < c.currentTime + 0.35) {
      const m = MOODS[current], eighth = 60 / m.bpm / 2, e = step % 8;
      if (e === 0 && current !== want) { current = want; bar = 0; } // moods change on the bar
      const mood = MOODS[current], shape = CH[mood.prog[bar % mood.prog.length]];
      const swing = e % 2 ? eighth * 0.12 : 0, t = next + swing + rnd(-0.006, 0.006);
      const bass = shape[0], alt = shape[Math.min(2, shape.length - 1)], top = shape.slice(-3);
      if (mood.style === "pick") {
        // An alternating thumb, fingers in between (Travis-style).
        const plan = [bass, top[0], alt, top[1], bass, top[2], alt, top[1]];
        note(plan[e], t, e % 2 ? rnd(0.32, 0.45) : rnd(0.5, 0.62), e % 2 ? 0.25 : -0.2, 0.45);
      } else if (mood.style === "strum") {
        // Down, down-up, up-down-up, with the odd skipped stroke; a cajon on 1 and 3, a shaker on the eighths.
        const pattern = [1, 0, 1, 1, 0, 1, 1, 1];
        if (pattern[e] && Math.random() > 0.08) strum(shape, t, e === 0 ? 0.62 : rnd(0.32, 0.46), e % 2 === 1);
        if (e === 0 || e === 4) thump(t, e === 0 ? 1 : 0.7);
        if (e === 2 || e === 6) thump(t, 0.35);
        shaker(t, e % 2 ? 0.6 : 1);
      } else {
        // Sparse: the bass and a slow arpeggio.
        if (e === 0) note(bass, t, 0.55, -0.2, 0.4);
        if (e === 2 || e === 5) note(pick(top), t, rnd(0.25, 0.38), 0.3, 0.4);
      }
      // Noodling: now and then a little phrase over the top, landing on chord tones.
      if (e === 0 && !phrase.length && Math.random() < mood.noodle) {
        const len = Math.floor(rnd(3, 8)), tones = shape.map((x) => x % 12);
        let k = Math.floor(rnd(2, PENTA.length - 2));
        phrase = Array.from({ length: len }, (_, i) => {
          k = Math.max(0, Math.min(PENTA.length - 1, k + pick([-2, -1, -1, 1, 1, 2])));
          let n = PENTA[k];
          if (i === len - 1) { const near = PENTA.filter((x) => tones.includes(x % 12)); n = near.sort((a, b) => Math.abs(a - n) - Math.abs(b - n))[0] || n; }
          return { n, at: 1 + Math.floor(i * rnd(1, 1.6)), hammer: Math.random() < 0.18 };
        });
        phrase.start = step;
      }
      if (phrase.length) {
        const due = phrase.filter((p) => phrase.start + p.at === step);
        for (const p of due) {
          note(p.n, t + 0.01, rnd(0.34, 0.48), 0.35, 0.7);
          if (p.hammer) note(p.n + 2, t + eighth * 0.45, 0.22, 0.35, 0.7); // a hammer-on
        }
        if (step > phrase.start + Math.max(...phrase.map((p) => p.at))) phrase = [];
      }
      next += eighth;
      step++;
      if (step % 8 === 0) bar++;
    }
  }
  function level() {
    if (!master) return;
    master.gain.setTargetAtTime(on ? (ducked ? DUCK : VOL) : 0, c.currentTime, ducked ? 0.12 : 0.6);
  }

  return {
    start() {
      c = c || getContext();
      if (!c || on) return;
      if (!input) input = build();
      on = true;
      next = c.currentTime + 0.1; step = 0; bar = 0; phrase = [];
      level();
      clearInterval(timer);
      timer = setInterval(schedule, 90);
      schedule();
    },
    stop() { on = false; level(); clearInterval(timer); },
    duck(d) { ducked = d; level(); },
    mood(name) { if (MOODS[name]) want = name; },
    /** Little guitar sounds for the game's moments, in the same voice as the music. */
    sfx(name) {
      c = c || getContext();
      if (!c) return;
      if (!input) input = build();
      if (!on) master.gain.setTargetAtTime(VOL, c.currentTime, 0.05);
      const t = c.currentTime + 0.01;
      if (name === "tick") note(79, t, 0.25, 0.3, 0.8);
      else if (name === "join") { note(74, t, 0.35, 0.2, 0.7); note(79, t + 0.09, 0.35, 0.3, 0.7); }
      else if (name === "found") { note(71, t, 0.4, 0, 0.7); note(74, t + 0.08, 0.4, 0, 0.7); note(79, t + 0.16, 0.45, 0, 0.7); }
      else if (name === "right") { note(67, t, 0.45, 0, 0.7); note(71, t + 0.07, 0.45, 0, 0.7); note(74, t + 0.14, 0.5, 0, 0.7); note(79, t + 0.21, 0.55, 0, 0.7); }
      else if (name === "wrong") { note(47, t, 0.5, 0, 0.3); note(46, t + 0.18, 0.45, 0, 0.3); }
      else if (name === "reveal") strum(CH.Dsus4, t, 0.5, false);
      else if (name === "big") { strum(CH.G, t, 0.65, false); strum(CH.G, t + 0.22, 0.45, true); strum(CH.G, t + 0.42, 0.7, false); }
      else if (name === "go") { strum(CH.D, t, 0.55, false); strum(CH.G, t + 0.35, 0.75, false); }
    },
  };
};
