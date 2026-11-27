/* NINETY-NINE · guard.js
   A quiet watchdog that runs during play and repairs things before a player ever notices: lost or stuck animals,
   people and pickups in bad places, menus or scenes that got out of step, story nights that can't move on, and
   any error inside the frame loop. Every repair is logged to NN.GUARD.log (and the console with #debug). */
(() => {
'use strict';
const NN = window.NN;
const { dist, rand, clamp } = NN.U;
const G = NN.G, W = NN.WORLD, GM = NN.GAME;
const GD = NN.GUARD = { log: [], errors: 0, fixes: 0 };
const fin = e => Number.isFinite(e.x) && Number.isFinite(e.y);
const note = msg => { GD.fixes++; GD.log.push(`day ${G.day} ${G.phase} ${Math.round(G.t || 0)}s: ${msg}`); if (GD.log.length > 200) GD.log.shift(); if (NN.debug) console.info('[guard]', msg); };
const offscreen = (x, y) => !NN.onScreen(x, y, 30);
const foldSpot = () => ({ x: W.GX + rand(-90, 90), y: W.FOLD.y + rand(30, W.FOLD.h - 30) });
const nearShepherd = () => { const t = G.sh.trail, p = t[Math.max(0, t.length - 12)] || G.sh; return { x: p.x + rand(-8, 8), y: p.y + rand(-6, 6) }; };
// is this spot walkable? (a probe dropped here doesn't get pushed out)
const free = (x, y, r = 5) => { const e = { x, y }; W.collide(e, r, x, y); return Math.hypot(e.x - x, e.y - y) < 1; };
const place = (e, p) => { e.x = p.x; e.y = p.y; e.vx = e.vy = 0; e.kx = e.ky = 0; };

let acc = 0;
GD.tick = dt => {
  acc += dt;
  if (acc < 0.5) return;
  const step = acc; acc = 0;
  try { checkWorld(step); } catch (e) { GD.error(e, 'guard'); }
  try { checkUI(); } catch (e) { GD.error(e, 'guard-ui'); }
};

function checkWorld(step) {
  const sh = G.sh;
  if (!sh) return;
  // the Shepherd
  if (!fin(sh)) { place(sh, { x: W.GX, y: W.FOLD.y + W.FOLD.h + 24 }); note('Shepherd position was invalid; moved to the gate'); }
  else if (!free(sh.x, sh.y, 4)) { const e = { x: sh.x, y: sh.y }; W.collide(e, 4, sh.x, sh.y); sh.x = e.x; sh.y = e.y; }
  // sheep
  for (const s of G.sheep) {
    if (s.hidden) continue;
    if (!fin(s)) { place(s, s.state === 'home' ? foldSpot() : nearShepherd()); note(`${s.name} had an invalid position`); continue; }
    if (!free(s.x, s.y, 4)) { const e = { x: s.x, y: s.y }; W.collide(e, 5, s.x, s.y); if (Math.hypot(e.x - s.x, e.y - s.y) > 3) { s.x = e.x; s.y = e.y; note(`${s.name} was inside something; pushed clear`); } }
    // track progress to catch sheep that are stuck against a wall
    const moved = Math.hypot(s.x - (s._gx ?? s.x), s.y - (s._gy ?? s.y));
    s._gx = s.x; s._gy = s.y;
    if (s._gst !== s.state + G.phase) { s._gst = s.state + G.phase; s._still = 0; }
    s._still = moved < 2 ? (s._still || 0) + step : 0;
    if (s.state === 'follow' && dist(s, sh) > 110 && s._still > 4 && offscreen(s.x, s.y)) { place(s, nearShepherd()); s._still = 0; note(`${s.name} got stuck following; caught up`); }
    if (s.state === 'home' && !W.insideFold(s) && !s.job && G.phase === 'night' && s._still > 6 && offscreen(s.x, s.y)) { place(s, foldSpot()); s._still = 0; note(`${s.name} couldn't find the gate; walked home`); }
    if (s.state === 'home' && !W.insideFold(s) && s.job && s._still > 20 && offscreen(s.x, s.y) && dist(s, s.job.station) > 40) { place(s, { x: s.job.station.x + rand(-6, 6), y: s.job.station.y + rand(-4, 4) }); s._still = 0; note(`${s.name} got stuck on the way to work`); }
    if (s.state === 'stolen' && (!s.leader || !G.npcs.includes(s.leader))) { s.state = 'follow'; s.leader = null; note(`${s.name} was left without a leader`); }
  }
  // wolves that can't get anywhere quietly leave; anything broken goes too
  for (const w of G.wolves) {
    if (!fin(w)) { w.gone = true; continue; }
    if (w.peace || w.flee || w.gnawing) { w._still = 0; continue; }
    const moved = Math.hypot(w.x - (w._gx ?? w.x), w.y - (w._gy ?? w.y));
    w._gx = w.x; w._gy = w.y;
    w._still = moved < 3 && !(w.root > 0) && !(w.rest > 0) ? (w._still || 0) + step : 0;
    if (w._still > 8) { w.flee = 2; note('a wolf was stuck; it slunk off'); }
  }
  for (const f of G.frights) if (!fin(f)) f.gone = true;
  // people
  for (const n of G.npcs) {
    if (n.hidden) continue;
    if (!fin(n)) { place(n, n.home && fin(n.home) ? n.home : nearShepherd()); note(`${n.id} had an invalid position`); }
  }
  // dogs that fell behind
  for (const g of G.dogs) if (!fin(g) || (dist(g, sh) > 400 && offscreen(g.x, g.y))) { place(g, nearShepherd()); }
  // pickups dropped somewhere unreachable
  const before = G.pickups.length;
  G.pickups = G.pickups.filter(p => fin(p) && free(p.x, p.y, 3));
  if (G.pickups.length !== before) note('removed an unreachable pickup');
  // story nights that must wait for something: make sure they can always finish
  if (G.phase === 'night' && G.holdNight) {
    G._held = (G._held || 0) + step;
    const pip = GM.sheepByKey('pip');
    if (G.flags.pipOut && pip && G._held > 150 && pip.state === 'wild') {
      // after a long search, Pip hears the Shepherd and comes toward him
      const k = Math.min(1, 60 / Math.max(60, dist(pip, sh)));
      pip.ax = pip.x + (sh.x - pip.x) * k; pip.ay = pip.y + (sh.y - pip.y) * k;
      if (G._held > 260 && offscreen(pip.x, pip.y)) { place(pip, nearShepherd()); note('Pip came running to the Shepherd'); NN.UI.toast('A small, shaky BAA, very close by. Pip heard you.', 5); G._held = 150; }
    }
    if (G.prowler && !G.prowler.done && G._held > 240) { G.prowler.x += (sh.x - G.prowler.x) * 0.2; G.prowler.y += (sh.y - G.prowler.y) * 0.2; }
    if (G._held > 600) { G.holdNight = false; note('released a night that could not finish'); }
  } else G._held = 0;
  if (G.phase === 'night' && !G.holdNight && G.t > G.len + 8 && NN.mode === 'play') { note('night overran; starting the day'); GM.startDay(); }
}

function checkUI() {
  if (NN.UI.health) NN.UI.health(note);
}

// ---------------------------------------------------------------- errors never freeze the game
let lastToast = -1e9;
GD.error = (e, where) => {
  GD.errors++;
  GD.log.push(`ERROR in ${where}: ${e && e.message}`);
  console.error('[guard]', where, e);
  const now = performance.now();
  if (now - lastToast > 60000 && NN.UI && NN.UI.toast) { lastToast = now; NN.UI.toast('Something hiccuped, but the flock is fine. Carry on.', 4); }
};
window.addEventListener('error', e => GD.error(e.error || e, 'window'));
window.addEventListener('unhandledrejection', e => GD.error(e.reason, 'promise'));
})();
