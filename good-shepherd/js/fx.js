/* NINETY-NINE · fx.js
   Game feel: settings, the camera, hit-stop and hit flashes, particles (dust, puffs, hearts, sparkles, embers, petals),
   ambient life (butterflies, birds, fireflies), time-of-day color grading and a soft vignette. Listens to the same
   events the story does, so the simulation stays simple. */
(() => {
'use strict';
const NN = window.NN;
const { rand, clamp, pick, mk } = NN.U;
const G = NN.G, W = NN.WORLD;
const V = NN.view, TAU = NN.TAU;
const FX = NN.FX = { parts: [], life: [], hitstop: 0 };

// ---------------------------------------------------------------- settings (saved on this device)
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEF = { shake: !reduce, flashes: !reduce, vignette: true, textSpeed: 'normal', particles: true };
let SET = Object.assign({}, DEF);
try { Object.assign(SET, JSON.parse(localStorage.getItem('nn-settings') || '{}')); } catch (e) { /* defaults */ }
NN.SET = SET;
NN.saveSettings = () => { try { localStorage.setItem('nn-settings', JSON.stringify(SET)); } catch (e) { /* */ } };
NN.textCps = () => ({ slow: 34, normal: 60, fast: 120, instant: 9999 }[SET.textSpeed] || 60);

// ---------------------------------------------------------------- camera: eases after the Shepherd and looks a little ahead
const cam = FX.cam = { x: 0, y: 0, ready: false };
FX.camera = dt => {
  const sh = G.sh;
  let tx = sh.x + (sh.vx || 0) * 0.32 - V.w / 2, ty = sh.y - 16 + (sh.vy || 0) * 0.22 - V.h / 2;
  if (!cam.ready || Math.hypot(tx - cam.x, ty - cam.y) > 260) { cam.x = tx; cam.y = ty; cam.ready = true; }
  const k = Math.min(1, dt * 5.5);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  cam.x = clamp(cam.x, 0, W.WW - V.w); cam.y = clamp(cam.y, 0, W.WH - V.h);
  let sx = 0, sy = 0;
  if (G.shake > 0 && SET.shake) { sx = (Math.random() - 0.5) * 4 * Math.min(1, G.shake * 4); sy = (Math.random() - 0.5) * 3 * Math.min(1, G.shake * 4); }
  return [Math.round(cam.x + sx), Math.round(cam.y + sy)];
};
FX.snap = () => { cam.ready = false; };

// ---------------------------------------------------------------- white flash silhouettes
const white = new WeakMap();
FX.whiteOf = img => {
  let c = white.get(img);
  if (c) return c;
  c = mk(img.width, img.height);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff7e8'; x.fillRect(0, 0, c.width, c.height);
  white.set(img, c);
  return c;
};

// ---------------------------------------------------------------- particles
// kind: dust | puff | heart | spark | ember | petal | chip | splash | star
FX.emit = (kind, x, y, n = 1, o = {}) => {
  if (!SET.particles && kind !== 'heart') return;
  for (let i = 0; i < n; i++) {
    if (FX.parts.length > 420) FX.parts.shift();
    const p = { kind, x: x + rand(-2, 2), y: y + rand(-2, 2), z: o.z || 0, vx: 0, vy: 0, vz: 0, t: 0, life: 0.6, size: 1, col: o.col || null };
    switch (kind) {
      case 'dust': p.vx = rand(-12, 12) + (o.vx || 0); p.vy = rand(-4, 2); p.vz = rand(4, 10); p.life = rand(0.35, 0.6); p.size = 2; p.col = p.col || 'rgba(220,200,160,.75)'; break;
      case 'puff': { const a = rand(0, TAU), s = rand(12, 34); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.5; p.vz = rand(6, 20); p.life = rand(0.45, 0.8); p.size = Math.floor(rand(2, 4)); p.col = p.col || '#f3ead8'; break; }
      case 'heart': p.vx = rand(-18, 18); p.vy = rand(-6, 6); p.vz = rand(18, 36); p.life = rand(0.7, 1.1); break;
      case 'spark': { const a = rand(0, TAU), s = rand(10, 40); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.6; p.vz = rand(5, 25); p.life = rand(0.3, 0.6); p.col = p.col || pick(['#fff2a8', '#f5c542', '#ffffff']); break; }
      case 'ember': p.vx = rand(-6, 6); p.vz = rand(14, 26); p.life = rand(0.8, 1.6); p.col = pick(['#ffb347', '#f5c542', '#ff7a3a']); break;
      case 'petal': p.vx = rand(4, 12); p.vy = rand(2, 6); p.vz = -rand(4, 8); p.z = o.z || rand(12, 30); p.life = rand(2.5, 4); p.col = pick(['#f6b3c8', '#ffffff', '#f6b3c8']); break;
      case 'chip': { const a = rand(0, TAU), s = rand(20, 46); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.5; p.vz = rand(30, 50); p.life = rand(0.5, 0.8); p.col = p.col || pick(['#c58d55', '#8a5a33', '#d39a5c']); p.grav = 140; break; }
      case 'splash': { const a = rand(0, TAU); p.vx = Math.cos(a) * 18; p.vy = Math.sin(a) * 8; p.vz = rand(14, 26); p.life = 0.35; p.col = '#a8dcf5'; p.grav = 120; break; }
      case 'star': p.vx = rand(-8, 8); p.vz = rand(10, 22); p.life = rand(0.8, 1.3); p.col = pick(['#fff7e0', '#f5c542']); break;
    }
    FX.parts.push(p);
  }
};
function updParts(dt) {
  for (const p of FX.parts) {
    p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.grav) { p.vz -= p.grav * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; } }
    else if (p.kind === 'petal') { p.vx += Math.sin(p.t * 3) * 6 * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx *= 0.9; } }
    else { p.vx *= 1 - dt * 2.5; p.vy *= 1 - dt * 2.5; p.vz *= 1 - dt * 1.8; }
  }
  FX.parts = FX.parts.filter(p => p.t < p.life);
}
FX.drawParts = (ctx, X, Y, glow) => {
  const heart = (() => { try { return NN.spr('heart', 0); } catch (e) { return null; } })();
  for (const p of FX.parts) {
    const isGlow = p.kind === 'ember' || p.kind === 'star';
    if (isGlow !== !!glow) continue;
    const k = p.t / p.life, px = X(p.x), py = Y(p.y - p.z);
    if (px < -8 || py < -8 || px > V.w + 8 || py > V.h + 8) continue;
    ctx.globalAlpha = p.kind === 'petal' ? Math.min(1, (1 - k) * 3) : 1 - k * k;
    if (p.kind === 'heart' && heart) ctx.drawImage(heart, px - 4, py - 4);
    else { ctx.fillStyle = p.col; const s = p.kind === 'puff' || p.kind === 'dust' ? Math.max(1, Math.round(p.size * (1 + k))) : p.size; ctx.fillRect(px - (s >> 1), py - (s >> 1), s, s); }
  }
  ctx.globalAlpha = 1;
};

// ---------------------------------------------------------------- ambient life
const lifeSpr = (name, fr, flip) => { try { return NN.spr(name, fr, flip); } catch (e) { return null; } };
function updLife(dt, camX, camY, dark) {
  const day = dark < 0.25, region = W.regionId(W.regionAt(G.sh.x, G.sh.y));
  const near = l => l.x > camX - 60 && l.x < camX + V.w + 60 && l.y > camY - 60 && l.y < camY + V.h + 60;
  FX.life = FX.life.filter(l => near(l) && l.t < l.life);
  const count = k => FX.life.filter(l => l.kind === k).length;
  if (!SET.particles) return;
  if (day && region !== 'canyon' && count('butterfly') < 4 && Math.random() < dt * 0.8) FX.life.push({ kind: 'butterfly', x: camX + rand(20, V.w - 20), y: camY + rand(30, V.h - 20), t: 0, life: rand(10, 20), ph: rand(0, TAU), hue: pick(['', 'blue']) });
  if (day && count('bird') < 2 && Math.random() < dt * 0.06) { const dir = Math.random() < 0.5 ? 1 : -1; FX.life.push({ kind: 'bird', x: dir > 0 ? camX - 20 : camX + V.w + 20, y: camY + rand(20, V.h * 0.5), vx: dir * rand(46, 70), t: 0, life: 12, ph: rand(0, TAU) }); }
  if (!day && count('firefly') < 14 && Math.random() < dt * 3) FX.life.push({ kind: 'firefly', x: camX + rand(0, V.w), y: camY + rand(0, V.h), t: 0, life: rand(4, 8), ph: rand(0, TAU) });
  for (const l of FX.life) {
    l.t += dt;
    if (l.kind === 'butterfly') { l.x += Math.sin(l.t * 1.3 + l.ph) * 18 * dt + 6 * dt; l.y += Math.cos(l.t * 1.9 + l.ph) * 12 * dt; }
    if (l.kind === 'bird') { l.x += l.vx * dt; l.y += Math.sin(l.t * 2 + l.ph) * 6 * dt; }
    if (l.kind === 'firefly') { l.x += Math.sin(l.t * 0.9 + l.ph) * 8 * dt; l.y += Math.cos(l.t * 1.3 + l.ph) * 6 * dt; }
  }
  // petals from blossom trees on screen, embers from the fire
  if (day && Math.random() < dt * 3) {
    const trees = W.query(camX, camY, camX + V.w, camY + V.h).filter(o => o.prop === 'blossom');
    if (trees.length) { const t = pick(trees); FX.emit('petal', t.x + rand(-12, 12), t.y + rand(-4, 4), 1, { z: rand(22, 34) }); }
  }
  if (Math.random() < dt * (dark > 0.3 ? 9 : 3) && Math.abs(W.FIRE.x - G.sh.x) < 260 && Math.abs(W.FIRE.y - G.sh.y) < 160) FX.emit('ember', W.FIRE.x + rand(-3, 3), W.FIRE.y, 1, { z: 8 });
}
FX.drawLife = (ctx, X, Y, glowPass) => {
  for (const l of FX.life) {
    const px = X(l.x), py = Y(l.y);
    if (glowPass) {
      if (l.kind !== 'firefly') continue;
      const a = 0.5 + 0.5 * Math.sin(l.t * 4 + l.ph), fade = Math.min(1, l.t, l.life - l.t);
      ctx.globalAlpha = a * fade; ctx.fillStyle = '#e8ff8a'; ctx.fillRect(px, py, 1, 1);
      ctx.globalAlpha = a * fade * 0.35; ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3);
      ctx.globalAlpha = 1; continue;
    }
    if (l.kind === 'butterfly') {
      const im = lifeSpr('butterfly', Math.floor(l.t * 8) % 2, false);
      const fade = Math.min(1, l.t, l.life - l.t);
      ctx.globalAlpha = fade;
      if (im) ctx.drawImage(im, px - 2, py - 2); else { ctx.fillStyle = '#ffffff'; ctx.fillRect(px, py, 2, 1); }
      ctx.globalAlpha = 1;
    } else if (l.kind === 'bird') {
      const im = lifeSpr('bird', Math.floor(l.t * 6) % 2, l.vx < 0);
      if (im) ctx.drawImage(im, px - 3, py - 2); else { ctx.fillStyle = '#4a3428'; ctx.fillRect(px - 2, py, 2, 1); ctx.fillRect(px + 1, py, 2, 1); ctx.fillRect(px, py + 1, 1, 1); }
    }
  }
};

// ---------------------------------------------------------------- footsteps and other little touches
let stepAcc = 0, stepN = 0;
FX.update = (dt, camX, camY, dark) => {
  updParts(dt);
  updLife(dt, camX, camY, dark);
  FX.hitstop = Math.max(0, FX.hitstop - dt);
  const sh = G.sh;
  if (!sh) return;
  const sp = Math.hypot(sh.vx, sh.vy);
  if (sp > 20 && NN.mode !== 'title') {
    stepAcc += sp * dt;
    if (stepAcc > 13) {
      stepAcc = 0; stepN++;
      FX.emit('dust', sh.x - (sh.vx / sp) * 3, sh.y, 1, { vx: -sh.vx * 0.15 });
      if (stepN % 2 === 0 && NN.sfx && NN.sfx.footstep) try { NN.sfx.footstep(); } catch (e) { /* */ }
    }
  }
  // hearts glint as they fly to you
  for (const h of G.hearts) if (h.t > 0.35 && Math.random() < dt * 6) FX.emit('star', h.x, h.y, 1, { z: 4 });
};

// ---------------------------------------------------------------- color grading and vignette
FX.grade = (ctx, dark) => {
  if (!G.sh) return;
  const region = W.regionId(W.regionAt(G.sh.x, G.sh.y));
  const f = G.phase === 'day' ? G.t / G.len : 1;
  const wash = (col, a, op = 'soft-light') => { if (a <= 0.005) return; ctx.globalCompositeOperation = op; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, V.w, V.h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; };
  if (G.form === 'sheep' && G.phase === 'day') wash('#808080', 0.45, 'saturation'); // the world looks greyer without him
  if (G.phase === 'day' && dark < 0.5) {
    if (f < 0.22) wash('#ffc878', 0.38 * (1 - f / 0.22));          // golden morning
    else if (f > 0.6) wash('#ffb070', 0.3 * Math.min(1, (f - 0.6) / 0.25)); // warm afternoon
    if (G.sabbath) wash('#ffe0a0', 0.22);
    if (G.chapter === 7 && (G.shepLook === 'shepherdDawn' || G.shepLook === 'shepherdScarred')) wash('#fff0c8', 0.28);
  }
  if (region === 'canyon') wash('#7884c8', 0.32);
  if (region === 'highlands') wash('#d8f0ff', 0.12);
};
let vig = null;
FX.vignette = ctx => {
  if (!SET.vignette) return;
  if (!vig || vig.width !== V.w) {
    vig = mk(V.w, V.h);
    const x = vig.getContext('2d');
    const g = x.createRadialGradient(V.w / 2, V.h / 2, V.h * 0.42, V.w / 2, V.h / 2, V.w * 0.62);
    g.addColorStop(0, 'rgba(20,12,6,0)'); g.addColorStop(1, 'rgba(20,12,6,.42)');
    x.fillStyle = g; x.fillRect(0, 0, V.w, V.h);
  }
  ctx.drawImage(vig, 0, 0);
};

// ---------------------------------------------------------------- reacting to the game
const origEmit = NN.STORY.emit;
NN.STORY.emit = (ev, d) => {
  origEmit(ev, d);
  try {
    switch (ev) {
      case 'joined': case 'found': FX.emit('heart', d.x, d.y - 8, 4); FX.emit('spark', d.x, d.y - 6, 8); d.popT = 0.4; break;
      case 'built': FX.emit('puff', d.fx, d.fy - 4, 18); FX.emit('chip', d.fx, d.fy - 6, 10); d.bornT = 0; if (G.shake < 0.12) G.shake = 0.12; if (NN.sfx.poof) NN.sfx.poof(); break;
      case 'pickup': { FX.emit('spark', d.x, d.y - 4, 7); const f = NN.sfx[d.kind === 'rockPile' ? 'pickupStone' : d.kind === 'branchPile' ? 'pickupWood' : 'sparkle']; if (f) f(); break; }
      case 'wolfTurned': FX.emit('dust', d.x, d.y, 6); break;
      case 'frightFaded': FX.emit('spark', d.x, d.y - 10, 12, { col: '#cfe3ff' }); if (NN.sfx.poof) NN.sfx.poof(); break;
      case 'healed': FX.emit('star', d.x, d.y - 8, 6); break;
      case 'staffHit': d.flashT = 0.12; FX.hitstop = Math.max(FX.hitstop, 0.045); FX.emit('dust', d.x, d.y, 3); if (NN.sfx.hitWolf) NN.sfx.hitWolf(); break;
      case 'bitten': FX.hitstop = 0.08; break;
    }
  } catch (e) { console.warn(e); }
};
})();
