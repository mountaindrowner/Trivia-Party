/* NINETY-NINE · main.js
   Boot, input, the frame loop, drawing the world, and saving to this device. */
(() => {
'use strict';
const NN = window.NN;
const { rand, clamp, dist, pick } = NN.U;
const W = NN.WORLD, G = NN.G, GM = NN.GAME, UI = NN.UI, ST = NN.STORY;
const SW = NN.W, SH = NN.H, TAU = NN.TAU;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const dark = NN.U.mk(SW, SH), dctx = dark.getContext('2d');
NN.debug = /debug/.test(location.hash) || !!window.__nnDebug;
// If the synth failed to load, play on in silence rather than break.
if (!NN.audio) NN.audio = { init() {}, track() {}, toggleMute() { return true; }, muted: true, paused: false, ctx: null };

// ---------------------------------------------------------------- helpers shared with ui.js
NN.GAME_MODS = s => {
  if (s.kind === 'lamb') return s.hurt ? 'bandage' : '';
  const m = [s.look];
  if (s.hurt) m.push('bandage');
  if (s.job && NN.DEFS.JOBS[s.job.type]) m.push(NN.DEFS.JOBS[s.job.type].mod);
  if (s.special === 'guard' && !(s.job && s.job.type === 'guard')) m.push('collar');
  if (s.blanket && (G.cold || G.chapter === 5)) m.push('blanket');
  return m.filter(Boolean).join(',');
};
let camX = 0, camY = 0;
NN.onScreen = (x, y, m = 40) => x > camX - m && x < camX + SW + m && y > camY - m && y < camY + SH + m + 20;
const safeProp = name => { try { return NN.prop(name); } catch (e) { return null; } };
const safeSpr = (...a) => { try { return NN.spr(...a); } catch (e) { return null; } };

// ---------------------------------------------------------------- save and load
const SAVE_KEY = 'ninety-nine-save-v2';
const store = { get: () => { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } }, set: v => { try { localStorage.setItem(SAVE_KEY, v); return true; } catch (e) { return false; } }, del: () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } } };
NN.save = () => {
  if (G.phase === 'night' || G.form === 'sheep' || G.prowler) return false;
  const skip = new Set(['wolves', 'frights', 'fx', 'hearts', 'shots', 'interact', 'prowler', 'report', 'spawns']);
  const data = {};
  for (const [k, v] of Object.entries(G)) if (!skip.has(k)) data[k] = v;
  data.sheep = G.sheep.map(s => Object.assign({}, s, { leader: null, from: null }));
  data.npcs = G.npcs.map(n => Object.assign({}, n));
  data.doors = W.doors; data.revealed = [...W.revealed];
  data.v = 2;
  return store.set(JSON.stringify(data));
};
NN.clearSave = () => store.del();
NN.hasSave = () => !!store.get();
function loadSave() {
  const raw = store.get(); if (!raw) return false;
  let d; try { d = JSON.parse(raw); } catch (e) { return false; }
  if (!d || d.v !== 2 || !Array.isArray(d.sheep) || !d.res || !Number.isFinite(d.day)) { console.warn('save looked damaged; starting fresh'); return false; }
  W.build(); GM.newGame();
  for (const [k, v] of Object.entries(d)) if (!['doors', 'revealed', 'v'].includes(k)) G[k] = v;
  G.wolves = []; G.frights = []; G.fx = []; G.hearts = []; G.shots = []; G.interact = []; G.prowler = null; G.spawns = [];
  W.revealed = new Set(d.revealed || ['meadow']);
  for (const [k, open] of Object.entries(d.doors || {})) if (open) W.openDoor(k);
  GM.setUid(Math.max(0, ...G.sheep.map(s => s.id), ...G.buildings.map(b => b.id)) + 1);
  return true;
}

// ---------------------------------------------------------------- game flow
function startPlay() {
  $('title').hidden = true; $('end').hidden = true; $('credits').hidden = true; $('hud').hidden = false;
  NN.mode = 'play';
}
const loading = fn => { $('loading').hidden = false; setTimeout(() => { try { fn(); } finally { $('loading').hidden = true; NN.FX.snap(); } }, 40); };
NN.newGame = () => {
  NN.audio.init();
  loading(() => { W.build(); GM.newGame(); startPlay(); ST.start(); });
};
NN.continueGame = () => {
  NN.audio.init();
  loading(() => {
    if (!loadSave()) { W.build(); GM.newGame(); startPlay(); ST.start(); return; }
    startPlay(); ST.load(); UI.banner('Day ' + G.day, 'Welcome back.');
  });
};
NN.toTitle = () => {
  $('hud').hidden = true; $('dialog').hidden = true; $('levelup').hidden = true; $('chapter').hidden = true; $('chend').hidden = true;
  UI.closePanel && UI.closePanel();
  titleWorld();
  UI.title(NN.hasSave());
  NN.audio.track('title');
};
function titleWorld() {
  W.build(); GM.newGame();
  const names = [['woolsworth', 'Woolsworth', 'shades'], ['baabara', 'Baabara', 'bow'], ['ramsey', 'Ramsey', 'beanie']];
  names.forEach(([key, name, look], i) => GM.addSheep({ key, name, look, x: W.GX - 30 + i * 22, y: W.FOLD.y + 100 + (i % 2) * 14, state: 'home' }));
  for (let i = 0; i < 8; i++) GM.addSheep({ x: W.GX + rand(-120, 120), y: W.FOLD.y + rand(30, 150), state: 'home' });
  G.sh.x = W.GX + 6; G.sh.y = W.FOLD.y + W.FOLD.h + 18;
}

// ---------------------------------------------------------------- input
const keys = {};
const joy = { on: false, ox: 0, oy: 0, x: 0, y: 0, id: null };
let mouse = { x: 0, y: 0, t: -1e9 }, holdTouch = false;
const input = () => ({
  x: (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0) + joy.x + padMove.x + (NN.botInput ? NN.botInput.x : 0),
  y: (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0) + joy.y + padMove.y + (NN.botInput ? NN.botInput.y : 0),
});
const PANEL_KEYS = { b: 'build', f: 'flock', q: 'goals', m: 'map', c: 'codex', h: 'help' };
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
  const repeat = e.repeat;
  keys[k] = true;
  NN.audio.init();
  const mode = NN.mode;
  if (mode === 'title') { if ((k === 'enter' || k === ' ') && !repeat) { if (document.activeElement && document.activeElement.tagName === 'BUTTON') return; NN.hasSave() ? NN.continueGame() : NN.newGame(); } return; }
  if (mode === 'chapter' || mode === 'chend') { if ((k === 'enter' || k === ' ') && !repeat) { e.preventDefault(); UI._chapterGo && UI._chapterGo(); } return; }
  if (mode === 'dialog') { if ((k === 'enter' || k === ' ' || k === 'e') && !repeat) { e.preventDefault(); UI.advance(); } return; }
  if (mode === 'lesson') { if ((k === 'enter' || k === ' ' || k === 'e' || k === 'escape') && !repeat) { e.preventDefault(); UI._lessonOk && UI._lessonOk(); } return; }
  if (mode === 'levelup') { const n = +k; if (n >= 1 && n <= 3) UI.chooseCardN(n); return; }
  if (mode === 'credits') { if (k === 'enter' || k === 'escape') { clearTimeout(UI._creditsEnd); UI.endScreen(); } return; }
  if (mode === 'panel') {
    if (k === 'escape' || k === 'p') { UI.closePanel(); return; }
    if (PANEL_KEYS[k] && !repeat) { const want = PANEL_KEYS[k]; const cur = UI.panelName(); UI.closePanel(); if (cur !== want) UI.openPanel(want); }
    return;
  }
  if (mode === 'build') {
    if (k === 'escape' || k === 'b') { UI.placing = null; NN.mode = 'play'; GM.sfx('cancel'); return; }
    if (k === 'enter' && !repeat) { tryPlace(); return; }
    return;
  }
  if (mode !== 'play') return;
  if (repeat) return;
  if (k === ' ') GM.whistle();
  else if (k === 'e') useInteract();
  else if (k === 'escape' || k === 'p') UI.openPanel('pause');
  else if (PANEL_KEYS[k]) {
    if (k === 'b' && G.form === 'sheep') { UI.toast('Woolsworth can\'t build. He tried. It went badly.'); return; }
    UI.openPanel(PANEL_KEYS[k]);
  } else if (k === 'n' && NN.debug) { G.t = G.len; G.holdNight = false; }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.on = false; joy.x = joy.y = 0; holdTouch = false; });
function useInteract() {
  const it = UI.current;
  if (!it) return;
  if (it.hold) return; // held: handled in the loop
  GM.useInteract(it);
}
const stage = $('stage');
const toWorld = (cx, cy) => { const r = stage.getBoundingClientRect(), s = r.width / SW; return { x: (cx - r.left) / s + camX, y: (cy - r.top) / s + camY }; };
stage.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { const p = toWorld(e.clientX, e.clientY); mouse = { x: p.x, y: p.y, t: performance.now() }; }
  if (!joy.on || e.pointerId !== joy.id) return;
  const s = stage.getBoundingClientRect().width / SW;
  const dx = (e.clientX - joy.ox) / (s * 14), dy = (e.clientY - joy.oy) / (s * 14), l = Math.hypot(dx, dy);
  joy.x = l > 1 ? dx / l : dx; joy.y = l > 1 ? dy / l : dy;
});
stage.addEventListener('pointerdown', e => {
  NN.audio.init();
  if (e.target.closest('button') || e.target.closest('.panel')) return;
  const mode = NN.mode;
  if (mode === 'title' || mode === 'lesson') return;
  if (mode === 'chapter') { UI._chapterGo && UI._chapterGo(); return; }
  if (mode === 'dialog') { UI.advance(); return; }
  if (mode === 'panel') { if (e.target.id === 'panel') UI.closePanel(); return; }
  if (mode === 'build' && e.pointerType === 'mouse') { const p = toWorld(e.clientX, e.clientY); mouse = { x: p.x, y: p.y, t: performance.now() }; tryPlace(); return; }
  if (mode !== 'play' && mode !== 'build') return;
  joy.on = true; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; joy.id = e.pointerId;
  try { stage.setPointerCapture(e.pointerId); } catch (_) { /* */ }
});
const endJoy = e => { if (e.pointerId === joy.id) { joy.on = false; joy.x = joy.y = 0; } };
stage.addEventListener('pointerup', endJoy);
stage.addEventListener('pointercancel', endJoy);
$('tbar').addEventListener('pointerdown', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.stopPropagation(); NN.audio.init();
  const act = b.dataset.act;
  if (NN.mode === 'build') { if (act === 'use' || act === 'build') { if (act === 'use') tryPlace(); else { UI.placing = null; NN.mode = 'play'; } } return; }
  if (NN.mode === 'panel') { UI.closePanel(); return; }
  if (NN.mode !== 'play') return;
  if (act === 'whistle') GM.whistle();
  else if (act === 'use') { holdTouch = true; useInteract(); }
  else if (act === 'build') { if (G.form !== 'sheep') UI.openPanel('build'); }
  else if (act === 'flock') UI.openPanel('flock');
  else if (act === 'menu') UI.openPanel('pause');
});
addEventListener('pointerup', () => { holdTouch = false; });
const showTouch = () => { $('tbar').hidden = false; };
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) showTouch();
addEventListener('touchstart', showTouch, { once: true, passive: true });
$('hud-goal').addEventListener('click', e => { e.stopPropagation(); if (NN.mode === 'play') UI.openPanel('goals'); });
$('hud-goal').addEventListener('pointerdown', e => e.stopPropagation());

// ---------------------------------------------------------------- controller
let padPrev = {}, padMove = { x: 0, y: 0 }, padSeen = false, navT = 0;
function pollPad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = [...pads].find(p => p && p.connected);
  if (!gp) { padMove.x = padMove.y = 0; return; }
  if (!padSeen) { padSeen = true; UI.toast('Controller ready: A use · X whistle · Y build · B back · Start menu', 5); }
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = i => gp.axes[i] || 0;
  let x = ax(0), y = ax(1);
  if (Math.hypot(x, y) < 0.22) x = y = 0;
  if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
  padMove.x = x; padMove.y = y;
  const now = {}; for (let i = 0; i < 17; i++) now[i] = b(i);
  const down = i => now[i] && !padPrev[i];
  const mode = NN.mode;
  const key = k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
  // menus: move focus with the stick or d-pad, A presses, B goes back
  if (['panel', 'title', 'levelup', 'chend', 'chapter', 'lesson', 'end'].includes(mode)) {
    navT -= dt;
    if (navT <= 0 && (Math.abs(x) > 0.5 || Math.abs(y) > 0.5)) { navT = 0.18; moveFocus(Math.abs(y) > Math.abs(x) ? (y > 0 ? 1 : -1) : (x > 0 ? 1 : -1)); }
    if (Math.abs(x) < 0.3 && Math.abs(y) < 0.3) navT = 0;
    if (down(0)) { const f = document.activeElement; if (f && f.tagName === 'BUTTON') f.click(); else key('Enter'); }
    if (down(1)) key('Escape');
  } else if (mode === 'dialog') { if (down(0) || down(1)) UI.advance(); }
  else if (mode === 'play' || mode === 'build') {
    if (down(0)) { if (mode === 'build') key('Enter'); else key('e'); }
    if (now[0] !== !!padPrev[0]) keys.e = mode === 'play' && now[0];
    if (down(1)) key('Escape');
    if (down(2)) key(' ');
    if (down(3)) key('b');
    if (down(4)) key('f');
    if (down(5)) key('m');
    if (down(9)) key('Escape');
    if (down(8)) key('h');
  }
  padPrev = now;
}
function moveFocus(dir) {
  const root = [...document.querySelectorAll('#panel:not([hidden]), #levelup:not([hidden]), #lesson:not([hidden]), #chapter:not([hidden]), #chend:not([hidden]), #title:not([hidden]), #end:not([hidden])')].pop();
  if (!root) return;
  const els = [...root.querySelectorAll('button, input')].filter(e => !e.disabled && e.offsetParent !== null);
  if (!els.length) return;
  const i = els.indexOf(document.activeElement);
  const n = els[(i + dir + els.length) % els.length] || els[0];
  n.focus({ preventScroll: false }); if (n.scrollIntoView) n.scrollIntoView({ block: 'nearest' });
  if (NN.sfx && NN.sfx.hover) NN.sfx.hover();
}

// ---------------------------------------------------------------- build placement
function ghostTile() {
  const t = UI.placing && NN.DEFS.BUILD[UI.placing.type]; if (!t) return null;
  let px, py;
  if (performance.now() - mouse.t < 3000) { px = mouse.x; py = mouse.y; }
  else {
    const sh = G.sh, dx = sh.dir === 'side' ? sh.face : 0, dy = sh.dir === 'up' ? -1 : sh.dir === 'down' ? 1 : 0;
    px = sh.x + dx * (t.w * 8 + 18); py = sh.y + dy * (t.h * 8 + 18) - (dy === 0 ? t.h * 8 : dy < 0 ? t.h * 8 : 0);
  }
  const tx = Math.round(px / 16 - t.w / 2), ty = Math.round(py / 16 - t.h / 2);
  return { tx, ty, t, ok: GM.canPlace(UI.placing.type, tx, ty) && GM.has(t.cost) };
}
function tryPlace() {
  const g = ghostTile(); if (!g) return;
  if (!GM.has(g.t.cost)) { UI.toast(`Not enough for a ${g.t.name}.`); GM.sfx('cancel'); UI.placing = null; NN.mode = 'play'; return; }
  if (!g.ok) { UI.toast("Can't build there. Try open ground (not on paths, water or trees)."); GM.sfx('cancel'); return; }
  GM.placeBuilding(UI.placing.type, g.tx, g.ty);
  UI.toast(`${g.t.name} built!`);
  if (!GM.has(g.t.cost)) { UI.placing = null; NN.mode = 'play'; }
}

// ---------------------------------------------------------------- drawing
const X = x => Math.round(x - camX), Y = y => Math.round(y - camY);
function walkFrame(e) { if (Math.hypot(e.vx, e.vy) < 6) return [0, 0]; const k = Math.floor(e.anim / 5) % 4; return [[1, 0, -1, 0][k], k % 2]; }
function drawProp(name, x, y, alpha) {
  const p = safeProp(name);
  if (!p) { ctx.fillStyle = '#f0f'; ctx.fillRect(X(x) - 4, Y(y) - 8, 8, 8); return; }
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.drawImage(p.img, X(x) - p.ox, Y(y) - p.oy);
  ctx.globalAlpha = 1;
}
function drawFire(x, y) {
  const Xx = X(x), Yy = Y(y), R = NN.U.rect;
  R(ctx, '#5a3418', Xx - 6, Yy - 3, 12, 2); R(ctx, '#7a4a24', Xx - 5, Yy - 4, 10, 2); R(ctx, '#3e2416', Xx - 6, Yy - 1, 12, 1);
  const fr = Math.floor(performance.now() / 110) % 3, big = GM.fireR() > 70 ? 1.3 : 1;
  const shapes = [[[-3, 5], [-2, 8], [-1, 10], [0, 9], [1, 11], [2, 8], [3, 5]], [[-3, 6], [-2, 9], [-1, 8], [0, 11], [1, 9], [2, 10], [3, 5]], [[-3, 5], [-2, 7], [-1, 10], [0, 12], [1, 9], [2, 7], [3, 6]]][fr];
  for (const [dx, h] of shapes) R(ctx, '#e8602c', Xx + dx, Yy - 3 - Math.round(h * big), 1, Math.round(h * big));
  for (const [dx, h] of shapes) if (Math.abs(dx) < 3) R(ctx, '#f5a23c', Xx + dx, Yy - 3 - Math.round(h * 0.7 * big), 1, Math.round(h * 0.7 * big));
  R(ctx, '#ffe680', Xx - 1, Yy - 7, 2, 4); R(ctx, '#fffbe0', Xx, Yy - 5, 1, 2);
}
function fencePost(px, py) { const R = NN.U.rect; R(ctx, '#3e2416', px - 2, py - 13, 5, 14); R(ctx, '#a8703f', px - 1, py - 12, 3, 12); R(ctx, '#7a4a24', px + 1, py - 11, 1, 11); R(ctx, '#d39a5c', px - 1, py - 12, 3, 1); }
function fenceRails(x0, x1, py) { const R = NN.U.rect; for (const h of [9, 5]) { R(ctx, '#3e2416', x0, py - h - 1, x1 - x0, 4); R(ctx, '#c58d55', x0, py - h, x1 - x0, 2); R(ctx, '#8a5a33', x0, py - h + 1, x1 - x0, 1); } }
function drawPerson(x, y, p, look) {
  const [st, bob] = walkFrame(p), dir = p.dir || 'down', flip = dir === 'side' && p.face < 0;
  NN.U.shadow(ctx, x, y, 12);
  const ox = x - 10, oy = y - 33, R = NN.U.rect;
  const staff = () => {
    const col = dir === 'up' ? 5 : dir === 'down' ? 15 : 14;
    const cx = c => ox + (flip ? 19 - c : c), lean = p.swing > 0 ? 1 : 0;
    R(ctx, '#3e2416', cx(col) - 1, oy - 4, 3, 37); R(ctx, '#b07a45', cx(col), oy - 3, 1, 35);
    const hook = (dir === 'up') !== flip ? -1 : 1, hx = c => cx(col) + c * hook;
    for (const [dx, dy] of [[0, -5], [1, -6], [2, -6], [3, -5], [3, -4]]) R(ctx, '#3e2416', hx(dx) - 1, oy + dy - 1 - lean, 3, 3);
    for (const [dx, dy] of [[0, -4], [0, -5], [1, -6], [2, -6], [3, -5], [3, -4]]) R(ctx, '#b07a45', hx(dx), oy + dy - lean, 1, 1);
    const lx = hx(3) - 1, ly = oy - 3 - lean;
    R(ctx, '#3e2416', lx - 1, ly - 1, 5, 7); R(ctx, '#7a4a24', lx, ly, 3, 1); R(ctx, '#f5c542', lx, ly + 1, 3, 3); R(ctx, '#fff2a8', lx + 1, ly + 2, 1, 1); R(ctx, '#7a4a24', lx, ly + 4, 3, 1);
  };
  const withStaff = look.startsWith('shepherd');
  if (withStaff && dir === 'up') staff();
  try { ctx.drawImage(NN.human(look, dir, st, bob, flip), ox, oy); } catch (e) { ctx.fillStyle = '#f0f'; ctx.fillRect(x - 3, y - 30, 6, 30); }
  if (withStaff && dir !== 'up') staff();
}
function drawSheep(s, x, y) {
  const moving = Math.hypot(s.vx, s.vy) > 4, fr = moving ? Math.floor(s.anim / 5) % 2 : 0;
  const lamb = s.kind === 'lamb', base = lamb ? 'lamb' : 'sheep', mods = NN.GAME_MODS(s);
  NN.U.shadow(ctx, X(x), Y(y), lamb ? 9 : 12);
  const hop = s.state === 'scared' ? -Math.abs(Math.round(Math.sin(s.anim / 3) * 2)) : (moving && fr ? -1 : 0);
  let img = null;
  const t = performance.now() / 1000;
  const sleepy = s.state === 'nap' || (G.phase === 'night' && s.state === 'home' && !s.job && W.insideFold(s) && G.t > 6);
  if (!moving && sleepy) img = safeSpr(base + 'Sleep', 0, s.face < 0, mods, s.swap);
  else if (!moving && ['home', 'wild', 'penned', 'feast'].includes(s.state) && Math.sin(t * 0.45 + s.id * 1.7) > 0.2) img = safeSpr(base + 'Graze', Math.floor(t * 3 + s.id) % 2, s.face < 0, mods, s.swap);
  if (!img) img = safeSpr(base, fr, s.face < 0, mods, s.swap) || safeSpr('sheep', fr, s.face < 0, mods, s.swap);
  if (!img) return;
  if (sleepy && !moving && Math.random() < 0.004) GM.pop(s.x + 4, s.y - 14, 'Z', '#cfe3ff', 1.4);
  if (s.popT > 0) { // a happy bounce when someone new joins
    s.popT -= 1 / 60;
    const k = 1 + Math.sin((1 - s.popT / 0.4) * Math.PI) * 0.3, w = Math.round(img.width * (2 - k)), h = Math.round(img.height * k);
    ctx.drawImage(img, X(x) - Math.floor(w / 2), Y(y) - h, w, h); return;
  }
  ctx.drawImage(img, X(x) - Math.floor(img.width / 2), Y(y) - img.height + hop);
}
function darkness() {
  let dk = 0;
  if (G.phase === 'night') dk = Math.min(0.8, 0.42 + G.t / 3 * 0.38);
  else if (G.day > 1 && G.t < 4) dk = 0.8 * (1 - G.t / 4);
  else { const left = G.len - G.t; if (left < 14) dk = 0.42 * (1 - left / 14); }
  const reg = W.darkAt(G.sh.x, G.sh.y);
  G.dkReg = (G.dkReg || 0) + (reg - (G.dkReg || 0)) * 0.03;
  dk = Math.max(dk, G.dkReg);
  if (G.storm) dk = Math.min(0.88, dk + 0.08);
  if (G.form === 'sheep' && G.phase === 'day') dk = Math.max(dk, 0.12);
  return dk;
}
let rain = [];
function draw(now) {
  [camX, camY] = NN.FX.camera(lastDt);
  ctx.drawImage(W.ground, camX, camY, SW, SH, 0, 0, SW, SH);
  const R = NN.U.rect;
  // water sparkle
  for (let i = 0; i < 14; i++) {
    const ph = (now / 900 + i * 1.7) % 3; if (ph > 1) continue;
    const wx = camX + ((i * 97 + Math.floor(now / 2700) * 31) % SW), wy = camY + ((i * 53 + Math.floor(now / 2700) * 17) % SH);
    if (W.riverDist(wx, wy) < 14 || Math.hypot(wx - W.POND.x, wy - W.POND.y) < W.POND.r - 6 || (Math.hypot(wx - W.LAKE.x, wy - W.LAKE.y) < W.LAKE.r - 6 && Math.hypot(wx - W.LAKE.x, wy - W.LAKE.y) > W.LAKE.islet + 6)) R(ctx, '#ffffff', X(wx), Y(wy), ph < 0.5 ? 1 : 2, 1);
  }
  for (const h of G.hearts) if (NN.onScreen(h.x, h.y)) { NN.U.shadow(ctx, X(h.x), Y(h.y) + 1, 6); const im = safeSpr('heart', 0); if (im) ctx.drawImage(im, X(h.x) - 4, Y(h.y) - 9 + Math.round(Math.sin(h.t * 6))); }
  const dk = darkness();
  const list = [];
  // scenery
  for (const o of W.query(camX - 60, camY - 20, camX + SW + 60, camY + SH + 90)) {
    if (o.prop === 'fire') { list.push({ y: o.y, d: () => drawFire(o.x, o.y) }); continue; }
    const name = o.prop === 'hut' ? (dk > 0.3 ? 'hutNight' : 'hutDay') : o.prop;
    list.push({ y: o.y, d: () => { if (o.tree) NN.U.shadow(ctx, X(o.x), Y(o.y), 18); drawProp(name, o.x, o.y); } });
  }
  // buildings
  for (const b of G.buildings) {
    if (!NN.onScreen(b.fx, b.fy, 90)) continue;
    let name = NN.PROP_FOR[b.type];
    if (b.type === 'feeder' && G.res.hay <= 0) name = 'feederEmpty';
    if (b.type === 'trough' && G.res.water <= 0) name = 'troughEmpty';
    if (b.type === 'lampPost' && dk > 0.2) name = 'lampPostLit'; else if (b.type === 'lampPost') name = 'lampPost';
    if (b.type === 'treadmill') name = 'treadmill' + (G.sheep.some(s => s.job && s.job.type === 'runner' && s.workT > 0 && s.state === 'home') ? Math.floor(b.anim * 6) % 2 : 0);
    list.push({ y: b.fy, d: () => {
      if (b.bornT !== undefined && b.bornT < 0.45) {
        b.bornT += 1 / 60;
        const k = Math.min(1, b.bornT / 0.3), drop = Math.round((1 - k) * (1 - k) * 18), p = safeProp(name);
        if (p) { const sq = k < 1 ? 1 : 1 + Math.sin((b.bornT - 0.3) / 0.15 * Math.PI) * 0.08; const w = Math.round(p.img.width * sq), h = Math.round(p.img.height / sq); ctx.drawImage(p.img, X(b.fx) - Math.round(p.ox * sq), Y(b.fy) - h - drop, w, h); return; }
      }
      drawProp(name, b.fx, b.fy);
    } });
  }
  if (G.tableOut && NN.onScreen(W.SITES.table.x, W.SITES.table.y, 90)) list.push({ y: W.SITES.table.y, d: () => drawProp('feastTable', W.SITES.table.x, W.SITES.table.y) });
  for (const p of G.pickups) if (NN.onScreen(p.x, p.y)) list.push({ y: p.y, d: () => drawProp(p.kind, p.x, p.y) });
  // the fold fence
  const F = W.FOLD;
  if (NN.onScreen(F.x + F.w / 2, F.y + F.h / 2, F.w)) {
    list.push({ y: F.y + 2, d: () => { fenceRails(X(F.x), X(F.x + F.w), Y(F.y + 2)); for (let px = F.x + 2; px <= F.x + F.w - 2; px += 16) fencePost(X(px), Y(F.y + 2)); } });
    const by = F.y + F.h - 1, gl = W.GX - W.GATE / 2, gr = W.GX + W.GATE / 2;
    list.push({ y: by, d: () => {
      fenceRails(X(F.x), X(gl), Y(by)); fenceRails(X(gr), X(F.x + F.w), Y(by));
      for (let px = F.x + 2; px < gl; px += 16) fencePost(X(px), Y(by));
      for (let px = F.x + F.w - 2; px > gr; px -= 16) fencePost(X(px), Y(by));
      fencePost(X(gl), Y(by)); fencePost(X(gr), Y(by));
      for (const gx of [gl, gr]) { R(ctx, '#3e2416', X(gx) - 2, Y(by) - 17, 5, 5); R(ctx, '#d39a5c', X(gx) - 1, Y(by) - 16, 3, 3); }
    } });
    for (const sx of [F.x + 2, F.x + F.w - 2]) for (let py = F.y + 14; py < F.y + F.h - 4; py += 14) list.push({ y: py, d: () => { R(ctx, '#3e2416', X(sx) - 1, Y(py) - 23, 3, 15); R(ctx, '#c58d55', X(sx), Y(py) - 22, 1, 13); fencePost(X(sx), Y(py)); } });
  }
  for (const s of G.sheep) if (!s.hidden && NN.onScreen(s.x, s.y)) list.push({ y: s.y, d: () => drawSheep(s, s.x, s.y) });
  for (const w of G.wolves) if (NN.onScreen(w.x, w.y)) list.push({ y: w.y, d: () => {
    NN.U.shadow(ctx, X(w.x), Y(w.y), 16);
    let im = (w.peace && safeSpr('wolfLie', Math.floor(performance.now() / 900) % 2, w.face < 0, '', w.alpha ? 'alpha' : null)) || safeSpr('wolf', w.peace ? 0 : Math.floor(w.anim / 6) % 2, w.face < 0, '', w.alpha ? 'alpha' : null);
    if (im && w.flashT > 0) { w.flashT -= 1 / 60; if (NN.SET.flashes) im = NN.FX.whiteOf(im); }
    if (im) ctx.drawImage(im, X(w.x) - Math.floor(im.width / 2), Y(w.y) - im.height + 1);
  } });
  for (const g of G.dogs) list.push({ y: g.y, d: () => { NN.U.shadow(ctx, X(g.x), Y(g.y), 10); const im = safeSpr('dog', Math.hypot(g.vx, g.vy) > 4 ? Math.floor(g.anim / 5) % 2 : 0, g.face < 0, '', g.kind === 'mercy' ? 'mercy' : null); if (im) ctx.drawImage(im, X(g.x) - Math.floor(im.width / 2), Y(g.y) - im.height + 1); } });
  for (const n of G.npcs) {
    if (n.hidden || !NN.onScreen(n.x, n.y)) continue;
    if (n.inTree) { list.push({ y: W.SITES.sycamore.y + 1, d: () => drawPerson(X(W.SITES.sycamore.x - 14), Y(W.SITES.sycamore.y - 44), n, n.look) }); continue; }
    list.push({ y: n.y, d: () => drawPerson(X(n.x), Y(n.y), n, n.look) });
  }
  if (G.form === 'sheep') { const w = G.playerSheep && GM.sheepById(G.playerSheep); list.push({ y: G.sh.y, d: () => drawSheep(Object.assign({}, w || { look: 'shades', kind: 'sheep' }, { vx: G.sh.vx, vy: G.sh.vy, anim: G.sh.anim, face: G.sh.face, state: 'follow', hurt: false, job: null }), G.sh.x, G.sh.y) }); }
  else if (NN.mode !== 'title') list.push({ y: G.sh.y, d: () => drawPerson(X(G.sh.x), Y(G.sh.y), G.sh, G.shepLook || 'shepherd') });
  if (G.prowler) list.push({ y: G.prowler.y, d: () => {
    const p = G.prowler, im = safeSpr('prowler', Math.floor(p.anim / 4) % 2, p.face < 0);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#0a0614'; NN.U.oval(ctx, X(p.x), Y(p.y), 34, 8); ctx.globalAlpha = 1;
    if (im) ctx.drawImage(im, X(p.x) - Math.floor(im.width / 2), Y(p.y) - im.height + 2);
  } });
  list.sort((a, b) => a.y - b.y).forEach(o => o.d());
  NN.FX.drawParts(ctx, X, Y, false);
  NN.FX.drawLife(ctx, X, Y, false);
  for (const f of G.frights) if (NN.onScreen(f.x, f.y)) {
    const im = safeSpr('fright', Math.floor(f.anim) % 3, f.face < 0);
    ctx.globalAlpha = clamp(0.25 + f.hp * 0.6, 0, 0.85);
    if (im) ctx.drawImage(im, X(f.x) - Math.floor(im.width / 2), Y(f.y) - im.height - 6 + Math.round(Math.sin(f.t * 3) * 2));
    ctx.globalAlpha = 1;
  }
  for (const p of G.shots) if (!(p.delay > 0)) { R(ctx, '#3e2416', X(p.x) - 2, Y(p.y) - 2, 4, 4); R(ctx, '#d4d5e0', X(p.x) - 1, Y(p.y) - 1, 2, 2); }
  for (const e of G.fx) {
    const k = e.t / e.life;
    if (e.kind === 'ring') { const r = Math.round(e.r * (0.3 + 0.7 * k)); ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.col; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X(e.x) + 0.5, Y(e.y) + 0.5, r, Math.max(1, Math.round(r * 0.7)), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (e.kind === 'arc') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff7e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(e.x), Y(e.y), e.r * 0.8, e.a - 1.2 + k * 0.8, e.a + 0.4 + k * 0.8); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (e.kind === 'smoke' && NN.onScreen(e.x, e.y, 30)) { ctx.globalAlpha = 0.4 * (1 - k); NN.U.disc(ctx, X(e.x + e.dx * k * 2), Y(e.y - k * 26), Math.round(1 + k * 4), dk > 0.3 ? '#7a7a98' : '#d8d6e4'); ctx.globalAlpha = 1; }
    else if (e.kind === 'spark') { R(ctx, '#fff2a8', X(e.x), Y(e.y - k * 8), 1, 1); }
  }
  // build ghost
  if (NN.mode === 'build') {
    const g = ghostTile();
    if (g) {
      ctx.globalAlpha = 0.35; ctx.fillStyle = g.ok ? '#7cc256' : '#d8574f';
      ctx.fillRect(X(g.tx * 16), Y(g.ty * 16), g.t.w * 16, g.t.h * 16);
      ctx.globalAlpha = 1;
      drawProp(NN.PROP_FOR[UI.placing.type], g.tx * 16 + g.t.w * 8, g.ty * 16 + g.t.h * 16, 0.7);
    }
  }
  // fog over places you haven't reached yet
  for (const id of Object.keys(W.REGIONS)) {
    if (W.isRevealed(id)) continue;
    const Rg = W.REGIONS[id], rx = Rg.col * W.RW, ry = Rg.row * W.RH;
    if (rx > camX + SW || rx + W.RW < camX || ry > camY + SH || ry + W.RH < camY) continue;
    ctx.fillStyle = 'rgba(52,66,56,.78)'; ctx.fillRect(X(rx), Y(ry), W.RW, W.RH);
    ctx.fillStyle = 'rgba(200,210,200,.12)';
    for (let i = 0; i < 18; i++) { const fx = rx + ((i * 211 + now / 60) % W.RW), fy = ry + ((i * 137) % W.RH); NN.U.disc(ctx, X(fx), Y(fy), 18 + (i % 4) * 6); }
  }
  NN.FX.grade(ctx, dk);
  // night: stepped pools of light cut from a blue dark, then a little warm glow added back
  if (dk > 0) {
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, SW, SH);
    dctx.fillStyle = `rgba(18,22,58,${dk})`; dctx.fillRect(0, 0, SW, SH);
    const left = G.phase === 'day' ? G.len - G.t : 99;
    if (left < 14) { dctx.fillStyle = `rgba(255,120,50,${0.18 * (1 - left / 14)})`; dctx.fillRect(0, 0, SW, SH); }
    dctx.globalCompositeOperation = 'destination-out';
    const lights = GM.lights().filter(([lx, ly, r]) => lx + r > camX && lx - r < camX + SW && ly + r > camY && ly - r < camY + SH);
    for (const [lx, ly, r] of lights) for (const [m, a] of [[1, 0.18], [0.84, 0.2], [0.68, 0.24], [0.52, 0.3], [0.36, 0.5]]) { dctx.fillStyle = `rgba(0,0,0,${a})`; NN.U.disc(dctx, X(lx), Y(ly), Math.round(r * m)); }
    ctx.drawImage(dark, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly, r] of lights) { ctx.fillStyle = 'rgba(255,140,50,.05)'; NN.U.disc(ctx, X(lx), Y(ly), Math.round(r * 0.7)); ctx.fillStyle = 'rgba(255,170,80,.05)'; NN.U.disc(ctx, X(lx), Y(ly), Math.round(r * 0.4)); }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (G.storm) {
    if (rain.length < 90) for (let i = 0; i < 90; i++) rain.push({ x: rand(0, SW), y: rand(0, SH), v: rand(180, 260) });
    ctx.strokeStyle = 'rgba(180,200,255,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const r of rain) { r.y += r.v / 60; r.x -= r.v / 240; if (r.y > SH) { r.y = -6; r.x = rand(0, SW + 40); } ctx.moveTo(Math.round(r.x) + 0.5, Math.round(r.y)); ctx.lineTo(Math.round(r.x - 2) + 0.5, Math.round(r.y + 5)); }
    ctx.stroke();
  }
  NN.FX.drawParts(ctx, X, Y, true);
  NN.FX.drawLife(ctx, X, Y, true);
  if (G.flash > 0 && NN.SET.flashes) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 2})`; ctx.fillRect(0, 0, SW, SH); }
  NN.FX.vignette(ctx);
  lastDark = dk;
  // labels above the dark
  for (const s of G.sheep) {
    if (s.hidden || !NN.onScreen(s.x, s.y)) continue;
    if (s.state === 'wild' && s.trust > 0.02) {
      R(ctx, '#3e2416', X(s.x) - 8, Y(s.y) - 21, 16, 4); R(ctx, '#f7e7c4', X(s.x) - 7, Y(s.y) - 20, 14, 2);
      R(ctx, s.bites ? '#d8574f' : '#ef9aa0', X(s.x) - 7, Y(s.y) - 20, Math.round(14 * Math.min(1, s.trust)), 2);
    } else if (s.lost && s.state === 'wild' && Math.floor(now / 400) % 2) NN.ptext(ctx, '?', X(s.x), Y(s.y) - 23, '#f5c542');
    if (s.key && s.state === 'wild' && dist(s, G.sh) > 64) NN.ptext(ctx, s.name, X(s.x), Y(s.y) - 23, s.bites ? '#d8574f' : '#f5dd8a');
    if (s.state === 'wild' && s.trustMode === 'gift' && dist(s, G.sh) < 80) NN.ptext(ctx, s.gift ? s.gift.res : 'GIFT', X(s.x), Y(s.y) - 30, '#cfe3c4');
  }
  for (const n of G.npcs) if ((n.aiKey === 'thief') && n.mode !== 'scene' && NN.onScreen(n.x, n.y)) {
    R(ctx, '#3e2416', X(n.x) - 10, Y(n.y) - 42, 20, 4); R(ctx, '#f7e7c4', X(n.x) - 9, Y(n.y) - 41, 18, 2); R(ctx, '#f5c542', X(n.x) - 9, Y(n.y) - 41, Math.round(18 * n.nerve), 2);
  }
  for (const e of G.fx) if (e.kind === 'text') NN.ptext(ctx, e.text, X(e.x), Y(e.y) - (e.t / e.life) * 8, e.col);
  // edge markers
  const marks = [];
  for (const s of G.sheep.filter(q => q.state === 'wild' && !q.lost && !q.key && W.isRevealed(W.regionAt(q.x, q.y))).sort((a, b) => dist(a, G.sh) - dist(b, G.sh)).slice(0, 3)) marks.push([s.x, s.y, '#fff7e0']);
  for (const s of G.sheep) { if (s.state === 'wild' && s.lost) marks.push([s.x, s.y, '#f5c542']); else if (s.state === 'wild' && s.key && W.isRevealed(W.regionAt(s.x, s.y))) marks.push([s.x, s.y, '#d8574f']); }
  if (G.sheep.some(s => s.job && s.job.type === 'lookout')) for (const w of G.wolves) if (!w.flee && !w.peace) marks.push([w.x, w.y, '#d8574f', true]);
  for (const n of G.npcs) if (n.aiKey === 'thief') marks.push([n.x, n.y, '#b98ad8']);
  for (const [x, y, col, wolf] of marks) {
    const sx = x - camX, sy = y - 8 - camY;
    if (sx >= 0 && sx < SW && sy >= 0 && sy < SH) continue;
    const cx = Math.round(clamp(sx, 5, SW - 6));
    let cy = Math.round(clamp(sy, 8, SH - 8));
    if (cx > SW - 98 && cy < 104) cy = 104;
    if (cx < 140 && cy < 60) cy = 60;
    R(ctx, '#3e2416', cx - 3, cy - 3, 7, 7); R(ctx, col, cx - 2, cy - 2, 5, 5);
    if (wolf) R(ctx, '#3e2416', cx, cy, 1, 1);
  }
  if (joy.on) {
    const r = stage.getBoundingClientRect(), s = r.width / SW;
    const ox = (joy.ox - r.left) / s, oy = (joy.oy - r.top) / s;
    ctx.globalAlpha = 0.4; ctx.strokeStyle = '#fff7e0'; ctx.beginPath(); ctx.arc(ox, oy, 16, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff7e0'; NN.U.disc(ctx, ox + joy.x * 13, oy + joy.y * 13, 6); ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- loop
let last = performance.now(), lastDay = 0, lastDt = 1 / 60, lastDark = 0, titleT = 0, lastAmb = '';
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 1 / 30); last = now; lastDt = dt;
  pollPad(dt);
  UI.tick(dt);
  const mode = NN.mode;
  if (mode === 'title' && G.sh) { titleT += dt; G.sh.x = W.GX + Math.sin(titleT / 11) * 170; G.sh.y = W.FOLD.y + W.FOLD.h + 30 + Math.sin(titleT / 7) * 40; G.sh.vx = Math.cos(titleT / 11) * 15; G.sh.vy = 0; }
  if (G.sh) NN.FX.update(mode === 'play' || mode === 'build' || mode === 'title' ? dt : 0, camX, camY, lastDark);
  // the soundscape follows where you are and the time of day
  if (G.sh && NN.audio && NN.audio.ambience) {
    const reg = W.regionId(W.regionAt(G.sh.x, G.sh.y));
    const amb = mode === 'credits' || mode === 'end' ? 'none' : G.storm ? 'storm' : G.phase === 'night' ? 'night' : reg === 'canyon' ? 'canyon' : W.riverDist(G.sh.x, G.sh.y) < 140 || reg === 'marsh' ? 'river' : 'meadow';
    if (amb !== lastAmb) { lastAmb = amb; try { NN.audio.ambience(amb); } catch (e) { /* */ } }
  }
  if ((mode === 'play' || mode === 'build') && NN.FX.hitstop > 0) { /* a beat of hit-stop: the world holds still for a moment */ }
  else if (mode === 'play' || mode === 'build') {
    // testing only: NN.timeScale runs extra simulation steps per frame (the playtest bot uses it)
    const steps = NN.debug && NN.timeScale > 1 ? Math.min(8, NN.timeScale | 0) : 1;
    for (let i = 0; i < steps && (NN.mode === 'play' || NN.mode === 'build'); i++) { try { GM.update(dt, input()); } catch (e) { NN.GUARD.error(e, 'update'); } if (i) NN.GUARD.tick(dt); }
    // held interactions (cutting thorns, clearing rocks)
    const it = UI.current;
    if (it && it.hold && (keys.e || holdTouch) && NN.mode === 'play') { it.prog = (it.prog || 0) + dt; if (it.prog >= it.hold) { it.prog = 0; GM.useInteract(it); } }
    else if (it && it.hold) it.prog = Math.max(0, (it.prog || 0) - dt * 2);
    if (G.lvPending > 0 && NN.mode === 'play' && !UI.busy()) UI.levelUp();
    if (G.day !== lastDay && G.phase === 'day' && NN.mode === 'play') { lastDay = G.day; if (G.day > 1 && NN.save()) UI.saved(); }
  } else if (mode === 'title' || mode === 'dialog' || mode === 'chapter' || mode === 'chend') GM.updateIdle(dt);
  if (NN.GUARD && (mode === 'play' || mode === 'build' || mode === 'dialog' || mode === 'lesson' || mode === 'levelup' || mode === 'panel')) NN.GUARD.tick(dt);
  if (G.sh) { try { draw(now); } catch (e) { NN.GUARD.error(e, 'draw'); } }
  if (!$('hud').hidden && G.sh) UI.hud();
  requestAnimationFrame(frame);
}
function resize() {
  const aw = Math.max(100, document.documentElement.clientWidth - 40), ah = Math.max(60, window.innerHeight - 20);
  let s = Math.min(aw / SW, ah / SH);
  if (s >= 2) s = Math.floor(s);
  stage.style.width = SW * s + 'px'; stage.style.height = SH * s + 'px';
  $('ui').style.transform = `scale(${s})`;
}
addEventListener('resize', resize);
// switching away mid-game pauses it
document.addEventListener('visibilitychange', () => { if (document.hidden && (NN.mode === 'play' || NN.mode === 'build')) { UI.placing = null; NN.mode = 'play'; UI.openPanel('pause'); } });
if (NN.SET && NN.SET.bigText) document.getElementById('ui').classList.add('big');

// Debug hook for automated tests and tuning in the console.
window.__nn = { NN, G, GM, W, ST, UI, keys, save: NN.save, load: loadSave };

// ---------------------------------------------------------------- boot
resize();
titleWorld();
UI.title(NN.hasSave());
requestAnimationFrame(frame);
})();
