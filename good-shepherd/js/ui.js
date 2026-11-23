/* NINETY-NINE · ui.js
   Everything in the DOM layer: HUD, dialogue, toasts, the morning report, level-up cards, chapter cards, menus
   (build, flock, goals, map, codex, pause), the title screen and the credits. The game's mode lives in NN.mode. */
(() => {
'use strict';
const NN = window.NN;
const { pick, clamp, rand } = NN.U;
const $ = id => document.getElementById(id);
const G = NN.G, W = NN.WORLD, GM = NN.GAME;
const UI = NN.UI = {};
NN.mode = 'title';
const SCR = () => NN.SCRIPT || {};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- small messages
let toastT = 0, tipT = 0, repT = 0;
UI.toast = (msg, secs = 3.4) => { const el = $('toast'); el.textContent = msg; el.classList.add('on'); toastT = secs; };
UI.tip = (msg, secs = 6) => { const el = $('tip'); el.textContent = msg; el.classList.add('on'); tipT = secs; };
UI.banner = (big, small = '') => {
  const el = $('banner'); el.classList.remove('on'); void el.offsetWidth;
  el.textContent = big; if (small) { const s = document.createElement('small'); s.textContent = small; el.append(s); }
  el.classList.add('on');
};
UI.objectiveDone = text => UI.toast('✓ ' + text.replace(/\s*\(\d+\/\d+\)$/, ''), 3.6);
UI.codexToast = id => {
  const e = (SCR().codex || []).find(c => c.id === id);
  if (e && NN.mode !== 'title') UI.tip(`New in the Shepherd's Notes (C): ${e.title}`, 4);
};
UI.report = (r, sabbath) => {
  if (!r) return;
  const el = $('report'), N = NN.DEFS.RES_NAME;
  const made = Object.entries(r.made || {}).map(([k, v]) => `+${v} ${N[k]}`).join(', ');
  let h = `<b>${sabbath ? 'Sabbath morning' : 'Morning report'}</b>`;
  if (made) h += `<div>${esc(made)}</div>`;
  h += `<div>${r.fed} fed${r.hungry ? `, <span class="bad">${r.hungry} hungry</span>` : ''} · ${r.watered} watered${r.thirsty ? `, <span class="bad">${r.thirsty} thirsty</span>` : ''}</div>`;
  if (r.cramped) h += `<div class="bad">${r.cramped} had no bed. Build a Shelter.</div>`;
  if (r.happy) h += `<div>${r.happy} happy sheep left hearts by the fire.</div>`;
  if (sabbath && r.wool) h += `<div>Shearing day: +${r.wool} wool. Everyone feels lighter.</div>`;
  if (sabbath && r.born && r.born.length) h += `<div>New lambs: ${esc(r.born.join(', '))}!</div>`;
  el.innerHTML = h; el.classList.add('on'); repT = 9;
};

// ---------------------------------------------------------------- portraits
const LOOK_OF = { jory: () => (G.helpers.includes('jory') ? 'joryWatch' : 'jory'), zeb: 'zeb', nell: 'nell', abe: 'abe', tobi: 'tobi', hank: 'hank', lou: 'ludo', ludo: 'ludoPlain', bram: () => (G.helpers.includes('bram') ? 'bramKind' : 'bram') };
const ROLE = { '@lookout': 'lookout', '@doc': 'doc', '@lamp': 'lamp', '@hauler': 'hauler', '@wrangler': 'wrangler', '@gardener': 'gardener', '@knitter': 'knitter', '@gatherer': 'gatherer', '@runner': 'runner', '@singer': 'singer' };
const anySheep = () => { const f = G.sheep.filter(s => !s.key && !s.owner && ['home', 'follow', 'feast', 'nap'].includes(s.state)); return pick(f.length ? f : G.sheep.filter(s => !s.owner)) || null; };
function resolve(sp) {
  if (sp && typeof sp === 'object') return { name: sp.sheep ? sp.sheep.name : sp.name, sheep: sp.sheep, human: sp.human };
  if (sp === 'narrator') return { narr: true };
  if (sp === 'shepherd') return { name: 'The Shepherd', human: G.shepLook || 'shepherd' };
  if (sp === '@sheep' || ROLE[sp]) {
    let s = ROLE[sp] ? G.sheep.find(q => q.job && q.job.type === ROLE[sp]) : null;
    s = s || anySheep();
    return s ? { name: s.name, sheep: s } : { name: 'A sheep', sheep: null };
  }
  const info = (SCR().speakers || {})[sp] || {};
  const name = info.name || (sp ? sp[0].toUpperCase() + sp.slice(1) : '?');
  if (info.kind === 'dog' || sp === 'goodness' || sp === 'mercy') return { name, dog: sp };
  if (LOOK_OF[sp] || info.kind === 'human') { const l = LOOK_OF[sp]; return { name, human: typeof l === 'function' ? l() : (l || sp) }; }
  const s = GM.sheepByKey(sp);
  return { name, sheep: s || null, sheepKey: sp };
}
function drawPortrait(who) {
  const p = $('portrait').getContext('2d');
  p.imageSmoothingEnabled = false;
  p.fillStyle = G.phase === 'night' ? '#9ab0c8' : '#cfe3c4'; p.fillRect(0, 0, 34, 34);
  p.fillStyle = G.phase === 'night' ? '#7c94ae' : '#b5d6a6'; p.fillRect(0, 24, 34, 10);
  try {
    if (who.human) p.drawImage(NN.human(who.human, 'down', 0, 0, false), 3, 1, 15, 17, 2, 2, 30, 34);
    else if (who.dog) { const c = NN.spr('dog', 0, false, '', who.dog === 'mercy' ? 'mercy' : null); p.drawImage(c, 0, 0, c.width, c.height, 17 - c.width, 26 - c.height * 2, c.width * 2, c.height * 2); }
    else { const s = who.sheep; const c = NN.spr(s && s.kind === 'lamb' ? 'lamb' : 'sheep', 0, false, s ? NN.GAME_MODS(s) : (who.sheepKey === 'thistle' ? 'horns' : ''), s ? s.swap : null); p.drawImage(c, 0, 0, c.width, c.height, 17 - c.width, 29 - c.height * 2, c.width * 2, c.height * 2); }
  } catch (e) { /* missing art: plain frame */ }
}

// ---------------------------------------------------------------- scenes
let queue = [], dlg = null, prevMode = 'play';
UI.scene = (src, opts = {}) => {
  let lines = Array.isArray(src) ? src : (SCR().scenes || {})[src];
  if (!lines || !lines.length) {
    if (opts.fallback) lines = opts.fallback;
    else { if (typeof src === 'string') console.warn('Missing scene', src); if (opts.done) setTimeout(opts.done, 0); return; }
  }
  queue.push({ lines, opts, key: typeof src === 'string' ? src : null });
  pump();
};
UI.busy = () => !!dlg || queue.length > 0;
function pump() {
  if (dlg || !queue.length) return;
  if (!['play', 'build', 'dialog'].includes(NN.mode)) return;
  dlg = queue.shift();
  if (NN.mode !== 'dialog') prevMode = NN.mode === 'build' ? 'play' : NN.mode;
  if (NN.mode === 'build') UI.placing = null;
  NN.mode = 'dialog';
  dlg.i = -1; dlg.after = false;
  $('dialog').hidden = false;
  nextLine();
}
UI.pump = pump;
function nextLine() {
  dlg.i++;
  let e = dlg.lines[dlg.i];
  if (e && !Array.isArray(e) && e.choice) { dlg.i++; e = dlg.lines[dlg.i]; }
  if (dlg.i >= dlg.lines.length) {
    const d = dlg; dlg = null;
    $('dialog').hidden = true;
    NN.mode = prevMode === 'dialog' ? 'play' : prevMode;
    if (d.opts.done) d.opts.done();
    pump();
    return;
  }
  const [sp, text] = e;
  const who = resolve(sp);
  $('pframe').hidden = !!who.narr;
  $('dline').className = who.narr ? 'narr' : '';
  if (!who.narr) { $('dname').textContent = who.name; drawPortrait(who); }
  dlg.text = String(text); dlg.shown = 0;
  $('dline').textContent = '';
  $('dchoices').innerHTML = '';
  $('dnext').hidden = true;
  if (NN.sfx && NN.sfx.page && dlg.i > 0) { /* quiet */ }
}
const choiceNext = () => { const n = dlg.lines[dlg.i + 1]; return n && !Array.isArray(n) && n.choice ? n.choice : null; };
function finishLine() {
  dlg.shown = dlg.text.length; $('dline').textContent = dlg.text;
  const ch = choiceNext();
  if (ch && !$('dchoices').firstChild) {
    const b = document.createElement('button');
    b.className = 'btn forgive'; b.type = 'button'; b.textContent = ch;
    b.addEventListener('pointerdown', e => { e.stopPropagation(); UI.advance(); });
    $('dchoices').append(b); b.focus({ preventScroll: true });
  } else $('dnext').hidden = false;
}
UI.advance = () => {
  if (!dlg) return;
  if (dlg.shown < dlg.text.length) { finishLine(); return; }
  if (choiceNext()) { if (dlg.opts.onChoice) dlg.opts.onChoice(); }
  nextLine();
};
UI.tickDialog = dt => {
  if (!dlg || dlg.shown >= dlg.text.length) return;
  dlg.shown = Math.min(dlg.text.length, dlg.shown + dt * 60);
  $('dline').textContent = dlg.text.slice(0, Math.floor(dlg.shown));
  if (dlg.shown >= dlg.text.length) finishLine();
};
UI.sheepTalk = (s, line) => UI.scene([[{ sheep: s }, line]]);

// ---------------------------------------------------------------- level up
UI.levelUp = () => {
  const choices = GM.knackChoices();
  G.lvPending--;
  if (!choices.length) return;
  prevMode = 'play'; NN.mode = 'levelup'; GM.sfx('level');
  const box = $('cards'); box.innerHTML = '';
  choices.forEach((k, i) => {
    const b = document.createElement('button');
    b.className = 'card wood' + (k.evo ? ' evo' : ''); b.type = 'button';
    const lvl = (G.S.taken[k.id] || 0) + 1;
    b.innerHTML = `<b></b><span></span><em>${k.evo ? 'Evolution' : k.max > 1 ? 'Lv ' + lvl + '/' + k.max : 'New friend'} · key ${i + 1}</em>`;
    b.querySelector('b').textContent = k.name; b.querySelector('span').textContent = k.desc;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', () => UI.chooseKnack(k));
    box.append(b);
  });
  $('levelup').choices = choices;
  $('levelup').hidden = false;
  box.firstChild.focus({ preventScroll: true });
};
UI.chooseKnack = k => {
  if (NN.mode !== 'levelup') return;
  $('levelup').hidden = true; NN.mode = 'play';
  GM.takeKnack(k);
  UI.toast(k.name + '!');
  pump();
};
UI.chooseCardN = n => { const c = $('levelup').choices; if (c && c[n - 1]) UI.chooseKnack(c[n - 1]); };

// ---------------------------------------------------------------- chapter cards
UI.chapterCard = (n, done) => {
  const c = (SCR().chapters || [])[n - 1] || { title: 'Chapter ' + n, verse: '', ref: '' };
  const el = $('chapter');
  el.innerHTML = `<div class="card2 wood"><div class="no">CHAPTER ${n} · ${esc((c.region || W.REGIONS[NN.STORY.CH[n].reveal[0] || 'meadow'].name || '').toUpperCase())}</div><h2>${esc(c.title)}</h2>
    ${c.verse ? `<p>${esc(c.verse)}<cite>${esc(c.ref || '')}</cite></p>` : ''}${c.blurb ? `<div class="blurb">${esc(c.blurb)}</div>` : ''}
    <button class="btn" type="button" id="ch-go">Begin</button></div>`;
  el.hidden = false; NN.mode = 'chapter';
  const go = () => { if (el.hidden) return; el.hidden = true; NN.mode = 'play'; done && done(); pump(); };
  UI._chapterGo = go;
  $('ch-go').addEventListener('click', go);
  $('ch-go').focus({ preventScroll: true });
};
UI.chapterEnd = (n, objs, done) => {
  const c = (SCR().chapters || [])[n - 1] || { title: 'Chapter ' + n };
  const el = $('chend');
  const st = G.stats;
  el.innerHTML = `<div class="card2 wood"><div class="no">END OF CHAPTER ${n}</div><h2>${esc(c.title)}</h2>
    <ul>${objs.map(o => `<li class="${o.done ? 'done' : 'miss'}">${esc(o.text)}</li>`).join('')}</ul>
    <div class="stats"><span>Sheep in the fold</span><b>${GM.homeCount()}</b><span>Lost sheep found again</span><b>${st.found}</b><span>Wolves turned away</span><b>${st.turned}</b><span>Forgiveness offered</span><b>${st.forgiven}</b></div>
    <button class="btn" type="button" id="che-go">Continue</button></div>`;
  el.hidden = false; NN.mode = 'chend';
  const go = () => { if (el.hidden) return; el.hidden = true; NN.mode = 'play'; NN.save && NN.save(); done && done(); };
  UI._chapterGo = go;
  $('che-go').addEventListener('click', go);
  $('che-go').focus({ preventScroll: true });
};
UI.fade = (on, secs, cb) => { const f = $('fade'); f.style.transitionDuration = secs + 's'; f.classList.toggle('on', on); if (cb) setTimeout(cb, secs * 1000); };

// ---------------------------------------------------------------- HUD
let hudKey = '', resKey = '';
const icon = name => {
  const c = document.createElement('canvas'); c.width = 9; c.height = 9;
  try { if (NN.ICONS && NN.ICONS[name]) { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const s = NN.ICONS[name](); x.drawImage(s, Math.floor((9 - s.width) / 2), Math.floor((9 - s.height) / 2)); } } catch (e) { /* no icon */ }
  return c;
};
const clockText = () => {
  const mins = G.phase === 'day' ? 360 + (840 * G.t / G.len) : 1200 + (600 * Math.min(1, G.t / G.len));
  const m = Math.floor(mins / 10) * 10 % 1440, h = Math.floor(m / 60), mm = m % 60;
  return `${(h + 11) % 12 + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
UI.hud = () => {
  const night = G.phase === 'night';
  const time = clockText(), part = G.sabbath ? 'Sabbath' : night ? 'Night' : G.len - G.t < 15 ? 'Dusk' : G.t < G.len * 0.35 ? 'Morning' : 'Afternoon';
  const home = GM.homeCount(), total = G.sheep.filter(s => !s.owner && !s.hidden).length;
  const key = [G.day, time, part, home, total, G.lv, G.chapter].join('|');
  if (key !== hudKey) {
    hudKey = key;
    $('hud-day').textContent = 'Day ' + G.day; $('hud-time').textContent = time; $('hud-phase').textContent = part;
    $('hud-sun').className = night ? 'sunmoon moon' : 'sunmoon';
    $('hud-count').textContent = `Fold ${home}/${total}`;
    $('hud-ch').textContent = 'Ch ' + G.chapter;
    $('hud-lv').textContent = (G.form === 'sheep' ? 'Woolsworth' : 'Lv ' + G.lv);
    $('hud-bar').className = night ? 'night' : '';
    // goals
    const objs = NN.STORY.objectives().map(o => NN.STORY.objState(o)).filter(o => !o.done).slice(0, 3);
    $('hud-goals').innerHTML = objs.length ? `<b>GOALS (Q)</b>${objs.map(o => `<div>· ${esc(o.text)}</div>`).join('')}` : '<b>GOALS (Q)</b><div>All done. Rest easy.</div>';
  }
  const rk = NN.DEFS.RES.map(k => G.res[k]).join(',');
  if (rk !== resKey) {
    resKey = rk;
    const box = $('hud-res'); box.innerHTML = '';
    for (const k of NN.DEFS.RES) {
      const sp = document.createElement('span'); sp.title = NN.DEFS.RES_NAME[k];
      sp.append(icon(k));
      const t = document.createElement('em'); t.style.fontStyle = 'normal'; t.textContent = G.res[k];
      if ((k === 'hay' || k === 'water') && G.res[k] < GM.homeCount()) t.className = 'low';
      sp.append(t); box.append(sp);
    }
  }
  $('hud-bar').style.width = (100 * (1 - Math.min(1, G.t / G.len))) + '%';
  $('hud-xpbar').style.width = (100 * G.xp / GM.needXP(G.lv)) + '%';
  // interact prompt
  const it = NN.mode === 'play' ? GM.nearestInteract() : null;
  UI.current = it;
  if (it) {
    $('prompt').hidden = false; $('prompt-text').innerHTML = `<kbd>E</kbd>${esc(it.label)}`;
    $('hold').hidden = !it.hold; if (it.hold) $('hold-bar').style.width = (100 * (it.prog || 0) / it.hold) + '%';
  } else $('prompt').hidden = true;
};
UI.tick = dt => {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (tipT > 0) { tipT -= dt; if (tipT <= 0) $('tip').classList.remove('on'); }
  if (repT > 0) { repT -= dt; if (repT <= 0) $('report').classList.remove('on'); }
  if (NN.mode === 'dialog') UI.tickDialog(dt);
};

// ---------------------------------------------------------------- panels
let panel = null, sel = null;
UI.panelName = () => panel;
UI.openPanel = name => {
  if (!['play', 'panel', 'build'].includes(NN.mode)) return;
  if (panel === name) { UI.closePanel(); return; }
  UI.placing = null;
  panel = name; NN.mode = 'panel'; GM.sfx('menu');
  NN.audio && (NN.audio.paused = name === 'pause');
  renderPanel();
};
UI.closePanel = () => {
  panel = null; $('panel').hidden = true; $('panel').innerHTML = '';
  if (NN.mode === 'panel') NN.mode = 'play';
  NN.audio && (NN.audio.paused = false);
  pump();
};
function frame(title, sub, body) {
  const el = $('panel');
  el.innerHTML = `<div class="panel wood"><header><h2>${esc(title)}</h2><small>${esc(sub || '')}</small><button class="btn x" type="button" data-close>Close</button></header>${body}</div>`;
  el.hidden = false;
  el.querySelector('[data-close]').addEventListener('click', UI.closePanel);
  return el.firstChild;
}
function renderPanel() {
  ({ build: renderBuild, flock: renderFlock, goals: renderGoals, map: renderMap, codex: renderCodex, pause: renderPause }[panel] || (() => {}))();
}
const PROP_FOR = { feeder: 'feeder', trough: 'trough', lean: 'lean', workshop: 'workshop', hayBarn: 'hayBarn', well: 'well', watchtower: 'watchtower', lampPost: 'lampPostLit', herbGarden: 'herbGarden', infirmary: 'infirmary', loom: 'loom', treadmill: 'treadmill0', choirStage: 'choirStage', olivePress: 'olivePress' };
NN.PROP_FOR = PROP_FOR;
function renderBuild() {
  const B = NN.DEFS.BUILD, types = Object.keys(B).filter(k => B[k].ch <= G.chapter);
  const p = frame('Build', 'Pick something, then place it with the mouse or in front of you. Enter or click to place.', `<div class="scroll"><div class="grid" id="bgrid"></div></div>`);
  const grid = p.querySelector('#bgrid');
  types.forEach((t, i) => {
    const d = B[t], ok = GM.has(d.cost);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bcard' + (ok ? '' : ' no');
    const c = document.createElement('canvas'); c.width = 70; c.height = 30;
    try {
      const pr = NN.prop(PROP_FOR[t]), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      const s = Math.min(1, 66 / pr.img.width, 28 / pr.img.height), w = pr.img.width * s, h = pr.img.height * s;
      x.drawImage(pr.img, (70 - w) / 2, 30 - h - 1, w, h);
    } catch (e) { /* placeholder */ }
    b.append(c);
    b.insertAdjacentHTML('beforeend', `<b>${esc(d.name)}</b><em>${esc(GM.costText(d.cost))}</em><span>${esc(d.desc)}</span>`);
    b.addEventListener('click', () => {
      if (!GM.has(d.cost)) { UI.toast(`Not enough for a ${d.name}: needs ${GM.costText(d.cost)}.`); GM.sfx('cancel'); return; }
      UI.closePanel(); UI.placing = { type: t }; NN.mode = 'build'; GM.sfx('select');
      UI.tip(`Placing a ${d.name}. Enter or click to place, Esc to cancel.`, 5);
    });
    grid.append(b);
    if (i === 0) setTimeout(() => b.focus({ preventScroll: true }), 0);
  });
}
const STATUS = s => {
  const c = [];
  if (s.state === 'nap') c.push(['napping', '']);
  if (s.hurt) c.push(['hurt', 'bad']);
  if (!s.fed) c.push(['hungry', 'bad']);
  if (!s.watered) c.push(['thirsty', 'bad']);
  if (s.cold) c.push(['cold', 'bad']);
  if (s.energy < 0.35) c.push(['tired', 'bad']);
  if (s.blanket) c.push(['blanket', 'good']);
  if (s.state === 'follow') c.push(['with you', 'good']);
  if (s.kind === 'lamb') c.push(['lamb', 'good']);
  return c;
};
function renderFlock() {
  const flock = G.sheep.filter(s => !s.owner && !s.hidden && ['home', 'follow', 'nap', 'feast'].includes(s.state)).sort((a, b) => a.name.localeCompare(b.name));
  const cap = GM.capacity(), home = GM.homeCount();
  const lost = G.sheep.filter(s => s.lost && s.state === 'wild').length;
  const p = frame('Your flock', `${flock.length} with you or home${lost ? ` · ${lost} lost out there` : ''}`,
    `<div class="summary"><span>Beds <b>${home}/${cap.beds}</b></span><span>Feeders <b>${cap.food}</b> sheep/day</span><span>Troughs <b>${cap.drink}</b> sheep/day</span><span>Hay <b>${G.res.hay}</b> · Water <b>${G.res.water}</b></span></div>
     <div class="scroll"><div class="rows" id="frows"></div></div><div class="detail" id="fdetail"><span>Pick a sheep to see how they're doing and ask them about a job.</span></div>`);
  const rows = p.querySelector('#frows');
  for (const s of flock) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'srow' + (sel === s.id ? ' sel' : '');
    const c = document.createElement('canvas'); c.width = 18; c.height = 14;
    try { const x = c.getContext('2d'); const im = NN.spr(s.kind === 'lamb' ? 'lamb' : 'sheep', 0, false, NN.GAME_MODS(s), s.swap); x.drawImage(im, Math.floor((18 - im.width) / 2), 14 - im.height); } catch (e) { /* */ }
    b.append(c);
    const job = s.job ? NN.DEFS.JOBS[s.job.type].name : s.state === 'follow' ? 'Following' : s.kind === 'lamb' ? 'Being a lamb' : 'Grazing';
    b.insertAdjacentHTML('beforeend', `<span><b>${esc(s.name)}</b> <span class="kind">${esc(s.trait)}</span></span><span>${esc(job)}</span><span class="chips">${STATUS(s).map(([t, k]) => `<span class="chip ${k}">${t}</span>`).join('')}</span><span class="minijoy" title="Joy"><i style="width:${Math.round(s.joy * 100)}%"></i></span>`);
    b.addEventListener('click', () => { sel = s.id; renderFlock(); });
    rows.append(b);
  }
  const s = sel && GM.sheepById(sel);
  if (s && flock.includes(s)) {
    const det = p.querySelector('#fdetail'); det.innerHTML = '';
    const open = [...new Set(GM.freeSlots().map(sl => sl[0]).filter(j => j !== 'guard'))];
    det.insertAdjacentHTML('beforeend', `<span><b>${esc(s.name)}</b>: ${s.job ? 'working as ' + esc(NN.DEFS.JOBS[s.job.type].name) : 'no job'}. Energy ${Math.round(s.energy * 100)}%.</span>`);
    for (const j of open) { const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = 'Ask: ' + NN.DEFS.JOBS[j].name; b.title = NN.DEFS.JOBS[j].desc; b.addEventListener('click', () => { const r = GM.ask(s, j); UI.closePanel(); UI.sheepTalk(s, r.line); }); det.append(b); }
    const rb = document.createElement('button'); rb.className = 'btn'; rb.type = 'button'; rb.textContent = s.job ? 'Ask to rest' : 'Let them rest'; rb.addEventListener('click', () => { const r = GM.ask(s, 'rest'); UI.closePanel(); UI.sheepTalk(s, r.line); }); det.append(rb);
  }
}
function renderGoals() {
  const n = G.chapter, c = (SCR().chapters || [])[n - 1] || { title: 'Chapter ' + n };
  const objs = NN.STORY.objectives();
  const p = frame(`Chapter ${n}: ${c.title}`, `Day ${G.day}`, `<div class="scroll">${c.verse ? `<div class="verse">${esc(c.verse)} (${esc(c.ref || '')})</div>` : ''}<div id="olist"></div></div>`);
  p.querySelector('#olist').innerHTML = objs.map(o => { const s = NN.STORY.objState(o); return `<div class="obj${s.done ? ' done' : ''}${o.key ? ' key' : ''}"><i>${s.done ? '✓' : '·'}</i><span>${esc(s.text)}</span></div>`; }).join('') +
    `<div class="obj"><i></i><span style="color:var(--muted)">Bold goals move the story along. The rest make the farm stronger.</span></div>`;
}
function renderMap() {
  const p = frame('Map', 'You are the blinking dot. Gold dots are lost sheep.', `<canvas id="mapc" width="320" height="142"></canvas>`);
  const c = p.querySelector('#mapc'), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const s = Math.min(320 / W.WW, 142 / W.WH), ox = Math.floor((320 - W.WW * s) / 2), oy = Math.floor((142 - W.WH * s) / 2);
  x.drawImage(W.ground, 0, 0, W.WW, W.WH, ox, oy, W.WW * s, W.WH * s);
  for (const id of Object.keys(W.REGIONS)) {
    const R = W.REGIONS[id];
    if (!W.isRevealed(id)) { x.fillStyle = 'rgba(30,40,30,.82)'; x.fillRect(ox + R.col * W.RW * s, oy + R.row * W.RH * s, W.RW * s, W.RH * s); }
    else if (!R.alias) { x.fillStyle = '#fff7e0'; x.font = '6px "Pixelify Sans", sans-serif'; x.fillText(R.name, ox + R.col * W.RW * s + 3, oy + R.row * W.RH * s + 8); }
  }
  x.fillStyle = '#c9a352'; x.fillRect(ox + W.FOLD.x * s, oy + W.FOLD.y * s, W.FOLD.w * s, W.FOLD.h * s);
  for (const q of G.sheep) { if (q.hidden || q.owner) continue; x.fillStyle = q.lost && q.state === 'wild' ? '#f5c542' : q.state === 'wild' ? '#fff7e0' : '#ffffff'; if (q.state === 'wild' && !q.lost && !W.isRevealed(W.regionAt(q.x, q.y))) continue; x.fillRect(Math.round(ox + q.x * s), Math.round(oy + q.y * s), 2, 2); }
  for (const b of G.buildings) { x.fillStyle = '#7a4a24'; x.fillRect(ox + b.x * s, oy + b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s)); }
  const blink = Math.floor(performance.now() / 300) % 2;
  x.fillStyle = '#3e2416'; x.fillRect(Math.round(ox + G.sh.x * s) - 3, Math.round(oy + G.sh.y * s) - 3, 7, 7); x.fillStyle = blink ? '#3f8f93' : '#ffffff'; x.fillRect(Math.round(ox + G.sh.x * s) - 2, Math.round(oy + G.sh.y * s) - 2, 5, 5);
  if (panel === 'map') requestAnimationFrame(() => { if (panel === 'map') { const keep = $('panel').scrollTop; renderMap(); $('panel').scrollTop = keep; } });
}
function renderCodex(id) {
  const all = (SCR().codex || []).filter(e => G.codex.includes(e.id));
  const p = frame("The Shepherd's Notes", `${all.length} pages`, `<div class="codex"><div class="list" id="clist"></div><div class="page" id="cpage"><span style="color:var(--muted)">Pick a page.</span></div></div>`);
  const list = p.querySelector('#clist'), page = p.querySelector('#cpage');
  const show = e => { page.innerHTML = `<div class="kind">${esc(e.kind)}</div><h3>${esc(e.title)}</h3><div>${esc(e.text)}</div>${e.ref ? `<cite>${esc(e.ref)}</cite>` : ''}`; list.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.id === e.id)); };
  for (const e of all) { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = e.id; b.textContent = e.title; b.addEventListener('click', () => show(e)); list.append(b); }
  const first = all.find(e => e.id === id) || all[all.length - 1];
  if (first) show(first);
}
function renderPause() {
  const el = $('panel');
  el.innerHTML = `<div class="panel wood menu"><h2>Paused</h2></div>`;
  el.hidden = false;
  const m = el.firstChild;
  const add = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); m.append(b); return b; };
  add('Resume', UI.closePanel).focus({ preventScroll: true });
  add('Goals (Q)', () => { UI.closePanel(); UI.openPanel('goals'); });
  add('Map (M)', () => { UI.closePanel(); UI.openPanel('map'); });
  add("Shepherd's Notes (C)", () => { UI.closePanel(); UI.openPanel('codex'); });
  add(NN.audio && NN.audio.muted ? 'Sound: off' : 'Sound: on', e => { const m2 = NN.audio.toggleMute(); e.target.textContent = m2 ? 'Sound: off' : 'Sound: on'; });
  add('Save game', () => { NN.save(); UI.toast('Saved on this device.'); });
  add('Save and quit to title', () => { NN.save(); UI.closePanel(); NN.toTitle(); });
}

// ---------------------------------------------------------------- title, credits, end
UI.title = hasSave => {
  const el = $('title'), btns = $('title-btns');
  el.hidden = false; $('hud').hidden = true; NN.mode = 'title';
  btns.innerHTML = '';
  const add = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = label; b.addEventListener('click', e => { e.stopPropagation(); NN.audio.init(); fn(); }); btns.append(b); return b; };
  if (hasSave) add('Continue', () => NN.continueGame()).focus({ preventScroll: true });
  const ng = add('New game', () => NN.newGame());
  if (!hasSave) ng.focus({ preventScroll: true });
};
UI.credits = () => {
  NN.mode = 'credits'; $('hud').hidden = true;
  NN.audio.track('credits');
  const el = $('credits'), roll = $('roll');
  const names = G.sheep.filter(s => !s.hidden || s.key === 'woolsworth').map(s => s.name).sort();
  const lines = (SCR().credits || ['Ninety-Nine', 'Made with love for the Church of the Crossroads']);
  roll.innerHTML = `<h3>Ninety-Nine</h3>${lines.map(l => `<p>${esc(l)}</p>`).join('')}<h3>The flock</h3><div class="names">${names.map(n => `<span>${esc(n)}</span>`).join('')}</div>
    <h3>And the Shepherd's friends</h3><p>${esc(['Goodness', 'Mercy'].concat(G.helpers.map(h => ({ jory: 'Jory', zeb: 'Zeb', hank: 'Hank', ludo: 'Ludo', bram: 'Bram' }[h] || h))).join(' · '))}</p>
    <p style="margin-top:24px">"I am the good shepherd. The good shepherd lays down his life for the sheep."</p><p style="color:#a89878">John 10:11</p>`;
  el.hidden = false;
  roll.style.transition = 'none'; roll.style.top = '216px'; void roll.offsetHeight;
  const h = roll.scrollHeight + 240, secs = Math.max(30, h / 14);
  roll.style.transition = `top ${secs}s linear`; roll.style.top = (-roll.scrollHeight) + 'px';
  UI._creditsEnd = setTimeout(UI.endScreen, secs * 1000);
  el.onclick = () => { clearTimeout(UI._creditsEnd); UI.endScreen(); };
};
UI.endScreen = () => {
  $('credits').hidden = true;
  NN.mode = 'end';
  const st = G.stats, n = G.sheep.filter(s => !s.owner).length;
  const el = $('end');
  el.innerHTML = `<div class="card2 wood"><div class="no">THE END</div><h2>${n} in the fold</h2>
    <div class="stats"><span>Days</span><b>${G.day}</b><span>Lost sheep found again</span><b>${st.found}</b><span>Wolves turned away</span><b>${st.turned}</b><span>Frights faded</span><b>${st.faded}</b><span>Lambs born</span><b>${st.lambs}</b><span>Buildings raised</span><b>${st.built}</b><span>Forgiveness offered</span><b>${st.forgiven}</b><span>Times it was refused</span><b>0</b></div>
    <p>"Rejoice with me, for I have found my sheep which was lost!"<cite>Luke 15:6</cite></p>
    <button class="btn" type="button" id="end-title">Back to the title</button></div>`;
  el.hidden = false;
  NN.clearSave && NN.clearSave();
  $('end-title').addEventListener('click', () => { el.hidden = true; NN.toTitle(); });
};
})();
