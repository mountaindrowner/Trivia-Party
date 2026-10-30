/* Background music: five jazz-funk tracks, synthesized live with WebAudio (no audio files).
   A small band (drums, bass, Rhodes, clav, organ, brass, lead) plays patterns on a swung 16th-note grid.
   Each screen picks a track (see SCENES); switching screens crossfades to the new one. */
window.THP = window.THP || {};

THP.Music = (function () {
  const KEY = "thp-music";
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== "0"; } catch (e) {}

  /* ---------- Notes and chords ---------- */
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  /** "Bb4" → MIDI number. */
  const n = (name) => {
    const m = /^([A-G])([b#]?)(-?\d)$/.exec(name);
    return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  };
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Chord shapes: intervals for the third, fifth, seventh, and a rootless voicing for the keys.
  const SHAPES = {
    m7: { t: 3, f: 7, s: 10, v: [3, 7, 10, 14] },
    m9: { t: 3, f: 7, s: 10, v: [3, 7, 10, 14] },
    m11: { t: 3, f: 7, s: 10, v: [3, 10, 14, 17] },
    7: { t: 4, f: 7, s: 10, v: [4, 7, 10, 14] },
    9: { t: 4, f: 7, s: 10, v: [4, 10, 14, 19] },
    13: { t: 4, f: 7, s: 10, v: [4, 10, 14, 21] },
    "7#9": { t: 4, f: 7, s: 10, v: [4, 10, 15, 19] },
    maj7: { t: 4, f: 7, s: 11, v: [4, 7, 11, 14] },
  };
  /** "Dm9" → { root (bass octave), shape }. */
  function chord(sym) {
    const m = /^([A-G][b#]?)(.*)$/.exec(sym);
    let root = n(m[1] + "2");
    if (root > n("F#2")) root -= 12; // keep the bass low
    return { root, shape: SHAPES[m[2]] };
  }
  /** Keys voicing: rootless chord tones placed around middle C. */
  function voicing(ch) {
    let base = ch.root + 24;
    while (base + ch.shape.v[0] > n("G4")) base -= 12;
    while (base + ch.shape.v[0] < n("C4")) base += 12;
    return ch.shape.v.map((i) => base + i);
  }

  /* ---------- The tracks ----------
     Drum lanes are one bar of 16 steps: k kick, s snare, g ghost snare, h closed hat, o open hat, r ride, c clap.
     "x" is a hit, "X" an accent.
     Bass is 16 tokens per bar, relative to the bar's chord: r root, 8 octave, 3 third, 5 fifth, 6 sixth, 7 seventh,
     b approach note a half step under the next bar's root, x dead note, "." rest. A list of patterns cycles bar by bar.
     Hooks are lists of bars, each a list of [step, note, length in steps]. */
  const TRACKS = [
    {
      id: "manna", name: "Manna Groove", vibe: "Laid-back Dorian funk", plays: "Title & menus",
      bpm: 98, swing: 0.12, chords: ["Dm9", "Dm9", "G13", "G13", "Dm9", "Dm9", "Em7", "A7#9"],
      drums: { k: "x.....x...x..x..", s: "....X.......X...", g: ".......x.x....x.", h: "xxxxxxxxxxxxxx.x", o: "..............x." },
      bass: ["r..x..r.8.r.7.5b", "r..x..r.8.5.r.7b"],
      keys: { inst: "rhodes", hits: ".x....x..x......", len: 3 },
      comp: { inst: "clav", hits: "x.x..x.x.x..x.x.", len: 1, vol: 0.5 },
      hook: { inst: "lead", bars: [
        [[0, "A4", 2], [3, "C5", 1], [4, "D5", 3], [8, "F5", 2], [10, "E5", 1], [11, "D5", 2], [14, "C5", 2]],
        [[0, "D5", 6], [8, "A4", 2], [11, "B4", 2], [14, "C5", 2]],
        [[0, "B4", 2], [2, "D5", 2], [4, "E5", 2], [6, "G5", 2], [8, "E5", 1], [9, "D5", 1], [10, "B4", 2], [12, "A4", 4]],
        [[0, "G4", 4], [6, "A4", 1], [7, "B4", 1], [8, "D5", 8]],
      ] },
    },
    {
      id: "jericho", name: "Jericho Jump", vibe: "Fast swing with a walking bass", plays: "Questions",
      bpm: 152, swing8: 1 / 3, chords: ["Gm7", "C9", "Fmaj7", "Dm7", "Gm7", "C9", "Am7", "7#9:D"],
      drums: { k: "x.......x.....x.", s: "....x.......x...", g: "..x.......x....x", r: "x...x.x.x...x.x.", h: "....x.......x..." },
      bass: ["r...3...5...b...", "r...5...8...b...", "8...7...5...b..."],
      keys: { inst: "rhodes", hits: "x.....x.........", len: 4 },
      hook: { inst: "brass", bars: [
        [[0, "D5", 2], [2, "F5", 2], [4, "A5", 2], [6, "G5", 2], [8, "F5", 2], [10, "E5", 2], [12, "D5", 2], [14, "C#5", 2]],
        [[0, "C5", 2], [2, "E5", 2], [4, "G5", 2], [6, "Bb5", 2], [8, "A5", 4], [14, "G5", 2]],
        [[0, "A5", 6], [8, "F5", 2], [10, "C5", 2], [12, "E5", 4]],
        [[0, "D5", 4], [6, "F5", 2], [8, "A5", 2], [10, "C6", 6]],
      ] },
    },
    {
      id: "redsea", name: "Red Sea Shuffle", vibe: "Minor blues shuffle on the organ", plays: "Trial Room & minigames",
      bpm: 126, swing8: 1 / 3, chords: ["Am7", "Dm7", "Am7", "Am7", "Dm7", "Dm7", "Am7", "Am7", "7#9:E", "Dm7", "Am7", "7#9:E"],
      drums: { k: "x.....x.x.......", s: "....X.......X...", g: "..........x....x", h: "x.x.x.x.x.x.x.x.", o: "..............x." },
      bass: ["r...8.r.5...7.b.", "r...8.r.5.r.7.b."],
      keys: { inst: "organ", hits: "x.......x.....x.", len: 5, vol: 0.8 },
      hook: { inst: "lead", bars: [
        [[0, "A4", 2], [2, "C5", 2], [4, "D5", 1], [5, "D#5", 1], [6, "E5", 4], [12, "G5", 2], [14, "E5", 2]],
        [[0, "A5", 4], [6, "G5", 2], [8, "E5", 2], [10, "D5", 2], [12, "C5", 2], [14, "A4", 2]],
      ] },
    },
    {
      id: "gate", name: "Narrow Gate Breakdown", vibe: "Tight E-minor funk with horn hits", plays: "The final race",
      bpm: 116, swing: 0.06, chords: ["Em9", "Em9", "13:A", "13:A", "Em9", "Em9", "Cmaj7", "7#9:B"],
      drums: { k: "x..x....x.x.....", s: "....X.......X...", g: "..x....x.x....x.", h: "xXxxxXxxxXxxxXxx", c: "....x.......x..." },
      bass: ["r.8.x.r..r8.5.7b", "r.8.x.r.r.8.x.7b"],
      comp: { inst: "clav", hits: "x.xx.x.xx.x.x.xx", len: 1, vol: 0.7 },
      keys: { inst: "rhodes", hits: "........x.......", len: 6, vol: 0.6 },
      hook: { inst: "brass", bars: [
        [[0, "E5", 1], [2, "G5", 1], [3, "A5", 2], [6, "B5", 2], [10, "D6", 1], [11, "B5", 1], [12, "A5", 2]],
        [[0, "G5", 1], [1, "A5", 1], [2, "G5", 1], [3, "E5", 3], [8, "D5", 1], [10, "E5", 4]],
      ] },
    },
    {
      id: "strut", name: "Hallelujah Strut", vibe: "Victory strut with a big horn section", plays: "Results & scoreboards",
      bpm: 104, swing: 0.18, chords: ["Bbmaj7", "Gm7", "Cm7", "F9", "Bbmaj7", "7#9:G", "Cm7", "13:F"],
      drums: { k: "x.....x...x.x...", s: "....X.......X...", g: ".......x......x.", h: "x.x.x.x.x.x.x.x.", o: "..............x.", c: "............x..." },
      bass: ["r..r..5.8..7.5.b", "r..r..5.8.r.3.5b"],
      keys: { inst: "rhodes", hits: "..x...x...x...x.", len: 2 },
      hook: { inst: "brass", bars: [
        [[0, "D5", 2], [2, "F5", 2], [4, "Bb5", 4], [10, "A5", 1], [11, "Bb5", 1], [12, "C6", 4]],
        [[0, "D6", 3], [4, "Bb5", 2], [6, "G5", 2], [8, "F5", 4], [14, "D5", 2]],
        [[0, "Eb5", 2], [2, "G5", 2], [4, "C6", 2], [6, "Bb5", 2], [8, "G5", 2], [10, "Eb5", 2], [12, "D5", 2], [14, "C5", 2]],
        [[0, "C5", 2], [2, "D5", 1], [3, "Eb5", 1], [4, "F5", 2], [6, "A5", 2], [8, "C6", 6]],
      ] },
    },
  ];
  // "7#9:D" is shorthand for "D7#9" (keeps the chord row easy to read when the quality comes first).
  TRACKS.forEach((t) => { t.parsed = t.chords.map((c) => chord(c.includes(":") ? c.split(":")[1] + c.split(":")[0] : c)); });
  const byId = (id) => TRACKS.find((t) => t.id === id);

  /** Which track each screen plays. Screens not listed keep whatever is already playing. */
  const SCENES = [
    ["title-screen", "manna"], ["modes-screen", "manna"], ["howto", "manna"], ["vs-setup", "manna"], ["review-screen", "manna"],
    ["question-screen", "jericho"], ["vs-pass", "jericho"],
    ["trial-intro", "redsea"], ["countdown", "redsea"], ["minigame", "redsea"],
    ["final-intro", "gate"], ["final-screen", "gate"],
    ["results", "strut"], ["vs-board", "strut"],
  ];

  /* ---------- Audio graph ---------- */
  let ctx = null, master = null, verb = null, noiseBuf = null;
  let unlocked = false, wanted = null, voice = null, timer = null;

  function graph() {
    if (ctx) return true;
    ctx = THP.Sound.context && THP.Sound.context();
    if (!ctx) return false;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 0.3; // sits under the sound effects
    master.connect(comp).connect(ctx.destination);
    // A generated room: decaying stereo noise as the impulse response.
    verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    verb.connect(wet).connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  const audible = () => enabled && !(THP.Sound.isMuted && THP.Sound.isMuted());

  /* ---------- Instruments ---------- */
  // Each takes (v, t, ...) where v is the playing voice ({ dry, wet } inputs) and t the start time.
  function env(g, t, peak, attack, decay, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (end || attack + decay));
  }
  function osc(type, f, t, stop) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t);
    o.start(t); o.stop(stop);
    return o;
  }
  function noiseSrc(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.start(t, Math.random() * 0.5); s.stop(t + dur);
    return s;
  }
  function filter(type, f, q) {
    const b = ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f; if (q) b.Q.value = q;
    return b;
  }
  function out(v, node, wet) {
    node.connect(v.dry);
    if (wet) { const s = ctx.createGain(); s.gain.value = wet; node.connect(s).connect(v.wet); }
  }

  const DRUMS = {
    k(v, t, vel) {
      const o = osc("sine", 160, t, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
      const g = ctx.createGain(); env(g, t, 0.9 * vel, 0.004, 0.32);
      out(v, o.connect(g));
    },
    s(v, t, vel) {
      const g = ctx.createGain(); env(g, t, 0.32 * vel, 0.002, 0.16);
      out(v, noiseSrc(t, 0.2).connect(filter("highpass", 1100)).connect(g), 0.25);
      const b = ctx.createGain(); env(b, t, 0.22 * vel, 0.002, 0.07);
      out(v, osc("triangle", 190, t, t + 0.1).connect(b));
    },
    g(v, t, vel) { DRUMS.s(v, t, vel * 0.22); },
    h(v, t, vel) {
      const g = ctx.createGain(); env(g, t, 0.09 * vel, 0.001, 0.035);
      out(v, noiseSrc(t, 0.06).connect(filter("highpass", 8000)).connect(g));
    },
    o(v, t, vel) {
      const g = ctx.createGain(); env(g, t, 0.08 * vel, 0.002, 0.22);
      out(v, noiseSrc(t, 0.26).connect(filter("highpass", 7000)).connect(g), 0.2);
    },
    r(v, t, vel) {
      const g = ctx.createGain(); env(g, t, 0.06 * vel, 0.001, 0.45);
      out(v, noiseSrc(t, 0.5).connect(filter("bandpass", 6200, 1.4)).connect(g), 0.3);
      const p = ctx.createGain(); env(p, t, 0.012 * vel, 0.001, 0.3);
      out(v, osc("square", 3150, t, t + 0.32).connect(filter("bandpass", 3150, 6)).connect(p));
    },
    c(v, t, vel) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach((d) => { g.gain.setValueAtTime(0.28 * vel, t + d); g.gain.exponentialRampToValueAtTime(0.03, t + d + 0.009); });
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      out(v, noiseSrc(t, 0.2).connect(filter("bandpass", 1400, 1.8)).connect(g), 0.35);
    },
  };

  const INSTS = {
    bass(v, t, midi, dur, vel) {
      const f = hz(midi);
      const lp = filter("lowpass", 1700, 7);
      lp.frequency.setValueAtTime(1700 * vel, t);
      lp.frequency.exponentialRampToValueAtTime(320, t + 0.18);
      const g = ctx.createGain(); env(g, t, 0.34 * vel, 0.006, 0, t + dur);
      const mix = ctx.createGain();
      osc("sawtooth", f, t, t + dur + 0.05).connect(mix);
      const sub = ctx.createGain(); sub.gain.value = 0.6;
      osc("sine", f, t, t + dur + 0.05).connect(sub).connect(mix);
      out(v, mix.connect(lp).connect(g));
    },
    rhodes(v, t, midi, dur, vel) {
      // Two-operator FM: the bright "tine" fades quickly, the warm body rings on.
      const f = hz(midi);
      const car = osc("sine", f, t, t + dur + 0.6);
      const mod = osc("sine", f, t, t + dur + 0.6);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(f * 1.6 * vel, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.5);
      mod.connect(mg).connect(car.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.075 * vel, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.03 * vel, t + 0.35);
      g.gain.setValueAtTime(0.03 * vel, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
      out(v, car.connect(g), 0.45);
    },
    clav(v, t, midi, dur, vel) {
      const f = hz(midi);
      const bp = filter("lowpass", 3200, 9);
      bp.frequency.setValueAtTime(3200, t);
      bp.frequency.exponentialRampToValueAtTime(700, t + 0.09);
      const g = ctx.createGain(); env(g, t, 0.05 * vel, 0.002, Math.min(0.14, dur));
      out(v, osc("sawtooth", f, t, t + 0.2).connect(filter("highpass", 500)).connect(bp).connect(g), 0.15);
    },
    organ(v, t, midi, dur, vel) {
      const f = hz(midi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03 * vel, t + 0.012);
      g.gain.setValueAtTime(0.03 * vel, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
      const trem = osc("sine", 6.2, t, t + dur + 0.2);
      const tg = ctx.createGain(); tg.gain.value = 0.006 * vel;
      trem.connect(tg).connect(g.gain);
      [[1, 1], [2, 0.7], [3, 0.4]].forEach(([h, a]) => {
        const ga = ctx.createGain(); ga.gain.value = a;
        osc("sine", f * h, t, t + dur + 0.2).connect(ga).connect(g);
      });
      // The key-click "percussion" that makes it sound like a tonewheel organ.
      const pc = ctx.createGain(); env(pc, t, 0.02 * vel, 0.002, 0.12);
      osc("sine", f * 4, t, t + 0.15).connect(pc).connect(g);
      out(v, g, 0.4);
    },
    brass(v, t, midi, dur, vel) {
      const f = hz(midi);
      const lp = filter("lowpass", 400, 2);
      lp.frequency.setValueAtTime(400, t);
      lp.frequency.exponentialRampToValueAtTime(2800 * vel, t + 0.05);
      lp.frequency.exponentialRampToValueAtTime(1500, t + 0.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.025);
      g.gain.setValueAtTime(0.05 * vel, t + Math.max(0.03, dur - 0.04));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
      [-7, 7, 0].forEach((c) => { const o = osc("sawtooth", f, t, t + dur + 0.1); o.detune.value = c; o.connect(lp); });
      out(v, lp.connect(g), 0.35);
    },
    lead(v, t, midi, dur, vel) {
      const f = hz(midi);
      const o = osc("square", f, t, t + dur + 0.15);
      const vib = osc("sine", 5.5, t, t + dur + 0.15);
      const vg = ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.4, dur));
      vib.connect(vg).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04 * vel, t + 0.02);
      g.gain.setValueAtTime(0.035 * vel, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
      out(v, o.connect(filter("lowpass", 2200, 1)).connect(g), 0.45);
    },
  };

  /* ---------- Sequencer ---------- */
  const LOOKAHEAD = 0.15;
  const stepLen = (tr) => 60 / tr.bpm / 4;
  function swingDelay(tr, step) {
    const sd = stepLen(tr);
    if (tr.swing8 && step % 4 === 2) return sd * 2 * tr.swing8;
    if (tr.swing && step % 2 === 1) return sd * tr.swing;
    return 0;
  }
  const FILL = "....x...x.xxXxXX";

  function bassNote(tok, ch, next) {
    const s = ch.shape;
    switch (tok) {
      case "r": case "x": return ch.root;
      case "8": return ch.root + 12;
      case "3": return ch.root + s.t;
      case "5": return ch.root + s.f;
      case "6": return ch.root + 9;
      case "7": return ch.root + s.s;
      case "b": { let r = next.root - 1; while (r < ch.root - 5) r += 12; return r; }
      default: return null;
    }
  }

  /** Schedule one 16th-note step of the current track. */
  function playStep(v, t) {
    const tr = v.track, bars = tr.parsed.length;
    const bar = v.bar, step = v.step, cycle = Math.floor(v.barCount / bars);
    const at = t + swingDelay(tr, step);
    const sd = stepLen(tr);
    const ch = tr.parsed[bar], next = tr.parsed[(bar + 1) % bars];
    const lastBar = bar === bars - 1;
    const breakdown = cycle % 4 === 3; // every fourth time through: drums and bass only
    // Drums (with a snare fill at the end of every other pass).
    for (const lane in tr.drums) {
      let pat = tr.drums[lane];
      if (lastBar && cycle % 2 === 1) {
        if (lane === "s") pat = FILL;
        else if (lane === "g" || lane === "o") continue;
        else if (lane === "h" && step >= 8) continue;
      }
      const c = pat[step];
      if (c === "x" || c === "X") DRUMS[lane](v, at, c === "X" ? 1 : step % 4 === 0 ? 0.85 : step % 2 === 0 ? 0.7 : 0.5);
    }
    // Bass.
    const bp = tr.bass[v.barCount % tr.bass.length];
    const tok = bp[step];
    const midi = bassNote(tok, ch, next);
    if (midi != null) {
      let len = 1;
      while (step + len < 16 && bp[step + len] === ".") len++;
      const dur = tok === "x" ? sd * 0.4 : Math.min(len, 4) * sd * 0.92;
      INSTS.bass(v, at, midi, dur, tok === "x" ? 0.45 : 1);
    }
    // Keys and comping.
    if (!breakdown) {
      for (const part of [tr.keys, tr.comp]) {
        if (!part || part.hits[step] !== "x") continue;
        const notes = voicing(ch);
        (part.inst === "clav" ? notes.slice(1) : notes).forEach((m) => INSTS[part.inst](v, at, m, part.len * sd, part.vol || 1));
      }
    }
    // The hook rests on the first pass and during breakdowns.
    if (tr.hook && cycle > 0 && !breakdown) {
      const hb = tr.hook.bars[v.barCount % tr.hook.bars.length];
      for (const [s, note, len] of hb) if (s === step) INSTS[tr.hook.inst](v, at, n(note), len * sd * 0.95, 1);
    }
  }

  function tick() {
    if (!voice || !ctx) return;
    const sd = stepLen(voice.track);
    while (voice.next < ctx.currentTime + LOOKAHEAD) {
      // If the page stalled (a background tab), skip ahead instead of playing a burst of late notes.
      if (voice.next < ctx.currentTime - 0.2) voice.next = ctx.currentTime + 0.05;
      try { playStep(voice, voice.next); } catch (e) {}
      voice.next += sd;
      if (++voice.step === 16) {
        voice.step = 0; voice.barCount++;
        voice.bar = voice.barCount % voice.track.parsed.length;
      }
    }
  }

  function fadeOut(v) {
    if (!v) return;
    const t = ctx.currentTime;
    v.out.gain.cancelScheduledValues(t);
    v.out.gain.setValueAtTime(v.out.gain.value, t);
    v.out.gain.linearRampToValueAtTime(0, t + 0.7);
    v.wetIn.gain.setValueAtTime(v.wetIn.gain.value, t);
    v.wetIn.gain.linearRampToValueAtTime(0, t + 0.7);
    setTimeout(() => { try { v.out.disconnect(); v.wetIn.disconnect(); } catch (e) {} }, 2500);
  }

  function start(id) {
    const tr = byId(id);
    if (!tr || !graph()) return;
    if (voice && voice.track === tr) return;
    fadeOut(voice);
    const outG = ctx.createGain();
    const t = ctx.currentTime + 0.05;
    outG.gain.setValueAtTime(0, t);
    outG.gain.linearRampToValueAtTime(1, t + 0.6);
    outG.connect(master);
    const dry = ctx.createGain(); dry.connect(outG);
    const wetIn = ctx.createGain(); wetIn.connect(verb);
    voice = { track: tr, dry, wet: wetIn, wetIn, out: outG, next: t, step: 0, bar: 0, barCount: 0 };
    if (!timer) timer = setInterval(tick, 25);
    tick();
  }

  function stop() {
    if (voice) fadeOut(voice);
    voice = null;
    if (timer) { clearInterval(timer); timer = null; }
  }

  /** Start, switch or stop the music to match what's wanted and allowed right now. */
  function refresh() {
    if (!unlocked || !audible() || !wanted) return stop();
    start(wanted);
  }

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (unlocked) ctx.resume();
  });

  return {
    TRACKS,
    /** Called on the first tap or key press: browsers only allow sound after the player interacts. */
    unlock() { unlocked = true; refresh(); },
    /** Pick the track for a screen that was just shown. */
    forNode(node) {
      for (const [cls, id] of SCENES) if (node.classList.contains(cls)) { wanted = id; break; }
      refresh();
    },
    play(id) { wanted = id; refresh(); },
    /** Lower the music while a recorded voice is speaking. */
    duck(on) { if (master && ctx) master.gain.setTargetAtTime(on ? 0.09 : 0.3, ctx.currentTime, 0.12); },
    playing: () => (voice ? voice.track.id : null),
    isOn: () => enabled,
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? "1" : "0"); } catch (e) {}
      refresh();
      return enabled;
    },
    refresh,
  };
})();
