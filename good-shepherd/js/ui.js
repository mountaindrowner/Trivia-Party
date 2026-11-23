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

const play = (name, alt) => { const f = NN.sfx && (NN.sfx[name] || (alt && NN.sfx[alt])); if (f) try { f(); } catch (e) { /* */ } };
const duck = on => { if (NN.audio && NN.audio.duck) try { NN.audio.duck(on); } catch (e) { /* */ } };

// ---------------------------------------------------------------- small messages
let toastT = 0, tipT = 0, repT = 0;
UI.toast = (msg, secs = 3.4) => { const el = $('toast'); el.textContent = msg; el.classList.add('on'); toastT = secs; };
UI.tip = (msg, secs = 6) => { const el = $('tip'); el.textContent = msg; el.classList.add('on'); tipT = secs; };
UI.banner = (big, small = '') => {
  const el = $('banner'); el.classList.remove('on'); void el.offsetWidth;
  el.textContent = big; if (small) { const s = document.createElement('small'); s.textContent = small; el.append(s); }
  el.classList.add('on');
};
let ribbonT = 0, savedT = 0;
UI.saved = () => { const el = $('saved'); el.classList.add('on'); savedT = 1.8; };
UI.objectiveDone = text => {
  const el = $('ribbon');
  el.innerHTML = `<small>GOAL COMPLETE</small><span>✓ ${esc(text.replace(/\s*\(\d+\/\d+\)$/, ''))}</span>`;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); ribbonT = 3.6;
  const g = $('hud-goal'); g.classList.remove('pulse'); void g.offsetWidth; g.classList.add('pulse');
  play('goal', 'level');
};
UI.codexToast = id => {
  const e = (SCR().codex || []).find(c => c.id === id);
  if (e && e.kind === 'verse' && NN.mode !== 'title' && G.day > 1) UI.toast(`New page in the Shepherd's Notes (C): ${e.title}`, 3);
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

// Lesson text: [Key] shows as a key cap.
const keyed = t => esc(t).replace(/\[([^\]]+)\]/g, '<kbd>$1</kbd>');
UI.keyed = keyed;
// Draw a small picture for lessons, menus and chapter cards: { spr, mods, swap } | { prop } | { human } | { icon } | { box }
UI.drawArt = (c, art) => {
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
  let img = null;
  try {
    if (!art) return;
    if (art.box) { const s = Math.floor(c.height / 4); x.fillStyle = '#3e2416'; x.fillRect(c.width / 2 - s - 1, c.height / 2 - s - 1, s * 2 + 2, s * 2 + 2); x.fillStyle = art.box; x.fillRect(c.width / 2 - s, c.height / 2 - s, s * 2, s * 2); return; }
    if (art.spr) img = NN.spr(art.spr, art.frame || 0, false, art.mods || '', art.swap || null);
    else if (art.prop) img = NN.prop(art.prop).img;
    else if (art.human) img = NN.human(art.human, 'down', 0, 0, false);
    else if (art.icon) img = NN.ICONS[art.icon]();
  } catch (e) { return; }
  if (!img) return;
  const sc = Math.max(1, Math.min(Math.floor((c.width - 4) / img.width), Math.floor((c.height - 2) / img.height))) || 1;
  const fit = Math.min(1, (c.width - 2) / (img.width * sc), (c.height - 2) / (img.height * sc));
  const w = img.width * sc * fit, h = img.height * sc * fit;
  x.drawImage(img, Math.round((c.width - w) / 2), Math.round(c.height - h - 1), w, h);
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
UI.busy = () => !!dlg || queue.length > 0 || NN.mode === 'lesson';
// Lessons wait in the same line as scenes, so a card never covers someone talking.
UI.lesson = l => { queue.push({ lesson: l }); pump(); };
// Run something (a chapter card, say) only after everything already waiting has been shown.
UI.then = fn => { queue.push({ action: fn }); pump(); };
function pump() {
  if (dlg || !queue.length) return;
  if (!['play', 'build', 'dialog'].includes(NN.mode)) return;
  if (queue[0].action) { if (NN.mode === 'dialog') return; queue.shift().action(); pump(); return; }
  if (queue[0].lesson) { if (NN.mode === 'dialog') return; showLesson(queue.shift().lesson); return; }
  dlg = queue.shift();
  if (NN.mode !== 'dialog') prevMode = NN.mode === 'build' ? 'play' : NN.mode;
  if (NN.mode === 'build') UI.placing = null;
  NN.mode = 'dialog';
  dlg.i = -1; dlg.after = false;
  $('dialog').hidden = false;
  // the big story moments get letterbox bars
  const k = dlg.key || '';
  const cine = dlg.lines.some(l => l && l.choice) || /^c\d_(intro|end)$/.test(k) || ['c5_ninetynine', 'c6_table', 'c7_gate', 'c7_prowler', 'c7_fall', 'c7_return', 'c7_feedMySheep', 'c7_wolves', 'c7_flockMorning'].includes(k);
  document.getElementById('ui').classList.toggle('cine', cine);
  nextLine();
}
function showLesson(l) {
  const back = NN.mode === 'build' ? 'play' : NN.mode;
  NN.mode = 'lesson';
  const el = $('lesson');
  el.innerHTML = `<div class="lesson wood"><div class="kind">HOW TO PLAY</div><h3>${esc(l.title)}</h3><canvas width="96" height="48"></canvas><p>${keyed(l.text)}</p><button class="btn" type="button">Got it</button><small>Read these again any time: press H</small></div>`;
  UI.drawArt(el.querySelector('canvas'), l.art);
  el.hidden = false;
  const ok = () => { if (el.hidden) return; el.hidden = true; NN.mode = back === 'lesson' ? 'play' : back; UI._lessonOk = null; pump(); };
  UI._lessonOk = ok;
  el.querySelector('button').addEventListener('click', ok);
  el.querySelector('button').focus({ preventScroll: true });
  play('lessonPop', 'page');
}
UI.pump = pump;
function nextLine() {
  dlg.i++;
  let e = dlg.lines[dlg.i];
  if (e && !Array.isArray(e) && e.choice) { dlg.i++; e = dlg.lines[dlg.i]; }
  if (dlg.i >= dlg.lines.length) {
    const d = dlg; dlg = null;
    $('dialog').hidden = true; duck(false);
    if (!queue.length || !queue[0].lines) document.getElementById('ui').classList.remove('cine');
    NN.mode = prevMode === 'dialog' ? 'play' : prevMode;
    if (d.opts.done) d.opts.done();
    pump();
    return;
  }
  const [sp, text] = e;
  const who = resolve(sp);
  dlg.voice = who.narr ? 'narrator' : sp === 'shepherd' ? 'shepherd' : (sp === 'bram' || sp === 'chomp' || sp === 'thistle' || sp === 'hank') ? 'gruff'
    : who.human || who.dog ? 'human' : (who.sheep && who.sheep.kind === 'lamb') || ['pip', 'burr', 'minnow', 'dot', 'crumb'].includes(sp) ? 'lamb' : 'sheep';
  if (dlg.i === 0 || $('dialog').hidden) { const el = $('dialog'); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); duck(true); }
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
  const before = Math.floor(dlg.shown);
  dlg.shown = Math.min(dlg.text.length, dlg.shown + dt * (NN.textCps ? NN.textCps() : 60));
  const now = Math.floor(dlg.shown);
  if (Math.floor(now / 2) !== Math.floor(before / 2) && /\w/.test(dlg.text[now - 1] || '') && NN.sfx && NN.sfx.voice) try { NN.sfx.voice(dlg.voice, now); } catch (e) { /* */ }
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
  $('levelup').querySelector('h2').innerHTML = 'Level up! <small style="display:block;font-size:6.5px;font-weight:500;color:var(--muted)">Pick one with the mouse or keys 1–3. Knacks last until the chapter ends. Friends stay for good.</small>';
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
  const region = c.region || W.REGIONS[NN.STORY.CH[n].reveal[0] || 'meadow'].name || '';
  const news = (NN.HELP && NN.HELP.CHAPTERS[n]) || [];
  let step = 0;
  const show = () => {
    if (step === 0) {
      el.innerHTML = `<div class="card2 wood enter"><canvas class="vignette" width="128" height="64" hidden></canvas><div class="no">CHAPTER ${n} · ${esc(region.toUpperCase())}</div><h2>${esc(c.title)}</h2>
        ${c.verse ? `<p>${esc(c.verse)}<cite>${esc(c.ref || '')}</cite></p>` : ''}${c.blurb ? `<div class="blurb">${esc(c.blurb)}</div>` : ''}
        <button class="btn" type="button" id="ch-go">${news.length ? 'Next' : 'Begin'}</button></div>`;
    } else {
      el.innerHTML = `<div class="card2 wood enter"><div class="no">WHAT'S NEW IN CHAPTER ${n}</div><div class="news">${news.map(() => '<div><canvas width="34" height="24"></canvas><span></span></div>').join('')}</div>
        <button class="btn" type="button" id="ch-go">Begin</button></div>`;
      el.querySelectorAll('.news > div').forEach((row, i) => { UI.drawArt(row.querySelector('canvas'), news[i][0]); row.querySelector('span').innerHTML = keyed(news[i][1]); });
    }
    const vc = el.querySelector('canvas.vignette');
    if (vc) { try { const pr = NN.prop('vignette' + n); const x = vc.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(pr.img, 0, 0, 128, 64); vc.hidden = false; } catch (e) { /* no painting yet */ } }
    $('ch-go').addEventListener('click', go);
    $('ch-go').focus({ preventScroll: true });
  };
  play('chapter', 'bell');
  const go = () => {
    if (el.hidden) return;
    if (step === 0 && news.length) { step = 1; GM.sfx('page'); show(); return; }
    el.hidden = true; NN.mode = 'play'; done && done(); pump();
  };
  UI._chapterGo = go;
  el.hidden = false; NN.mode = 'chapter';
  show();
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
const prevRes = {};
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
  const time = clockText();
  const home = GM.homeCount(), total = G.sheep.filter(s => !s.owner && !s.hidden).length;
  const objs = NN.STORY.objectives().map(o => [o, NN.STORY.objState(o)]).filter(([, st]) => !st.done);
  const next = (objs[0] || [null, { text: NN.STORY.hiddenGoals() ? 'Keep caring for the flock. More will come.' : 'All done. Rest easy.' }])[1].text;
  const key = [G.day, time, home, total, G.lv, G.form, next].join('|');
  if (key !== hudKey) {
    hudKey = key;
    $('hud-day').textContent = (G.sabbath ? 'Sabbath · ' : '') + 'Day ' + G.day; $('hud-time').textContent = time;
    $('hud-sun').className = night ? 'sunmoon moon' : 'sunmoon';
    $('hud-lv').textContent = G.form === 'sheep' ? 'Woolsworth' : 'Lv ' + G.lv;
    $('hud-goal-text').textContent = next;
    $('hud-bar').className = night ? 'night' : '';
    resKey = '';
  }
  // supplies: hay and water always; everything else once you have some
  const rk = NN.DEFS.RES.map(k => G.res[k]).join(',') + '|' + home + '/' + total;
  if (rk !== resKey) {
    resKey = rk;
    const box = $('hud-res'); box.innerHTML = '';
    const sp = document.createElement('span'); sp.title = 'Sheep home / in your flock';
    const sc = document.createElement('canvas'); sc.width = 9; sc.height = 9;
    try { const x = sc.getContext('2d'); const im = NN.spr('sheep', 0, false, '', null); x.drawImage(im, 0, 0, im.width, im.height, 0, 1, 9, 7); } catch (e) { /* */ }
    sp.append(sc, document.createTextNode(`${home}/${total}`)); box.append(sp);
    const sep = document.createElement('span'); sep.className = 'sep'; box.append(sep);
    for (const k of NN.DEFS.RES) {
      if (!G.res[k] && k !== 'hay' && k !== 'water') continue;
      const s2 = document.createElement('span'); s2.title = NN.DEFS.RES_NAME[k];
      s2.append(icon(k));
      const t = document.createElement('em'); t.style.fontStyle = 'normal'; t.textContent = G.res[k];
      if ((k === 'hay' || k === 'water') && G.res[k] < home / 2) t.className = 'low';
      if (prevRes[k] !== undefined && prevRes[k] !== G.res[k]) s2.className = G.res[k] > prevRes[k] ? 'bump' : 'dip';
      prevRes[k] = G.res[k];
      s2.append(t); box.append(s2);
    }
  }
  $('hud-bar').style.width = (100 * (1 - Math.min(1, G.t / G.len))) + '%';
  $('hud-xpbar').style.width = (100 * G.xp / GM.needXP(G.lv)) + '%';
  const it = NN.mode === 'play' ? GM.nearestInteract() : null;
  UI.current = it;
  if (it) {
    $('prompt').hidden = false; $('prompt-text').innerHTML = `<kbd>E</kbd> ${esc(it.label)}`;
    $('hold').hidden = !it.hold; if (it.hold) $('hold-bar').style.width = (100 * (it.prog || 0) / it.hold) + '%';
  } else $('prompt').hidden = true;
};
UI.tick = dt => {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (tipT > 0) { tipT -= dt; if (tipT <= 0) $('tip').classList.remove('on'); }
  if (ribbonT > 0) { ribbonT -= dt; if (ribbonT <= 0) $('ribbon').classList.remove('on'); }
  if (savedT > 0) { savedT -= dt; if (savedT <= 0) $('saved').classList.remove('on'); }
  if (repT > 0) { repT -= dt; if (repT <= 0) $('report').classList.remove('on'); }
  if (NN.mode === 'dialog') UI.tickDialog(dt);
};

// ---------------------------------------------------------------- panels
let panel = null, sel = null;
UI.panelName = () => panel;
let panelBack = 'play';
UI.openPanel = name => {
  if (!['play', 'panel', 'build', 'title'].includes(NN.mode)) return;
  if (panel === name) { UI.closePanel(); return; }
  if (NN.mode !== 'panel') panelBack = NN.mode === 'title' ? 'title' : 'play';
  if (panelBack === 'title') $('title').hidden = true;
  UI.placing = null;
  panel = name; NN.mode = 'panel'; play('open', 'menu');
  NN.audio && (NN.audio.paused = name === 'pause');
  renderPanel();
};
UI.closePanel = () => {
  if (panel) play('close');
  panel = null; $('panel').hidden = true; $('panel').innerHTML = '';
  if (NN.mode === 'panel') NN.mode = panelBack;
  if (panelBack === 'title' && NN.mode === 'title') { $('title').hidden = false; const b = $('title-btns').querySelector('button'); b && b.focus({ preventScroll: true }); }
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
  ({ build: renderBuild, flock: renderFlock, goals: renderGoals, map: renderMap, codex: renderCodex, pause: renderPause, help: renderHelp, settings: renderSettings }[panel] || (() => {}))();
}
const PROP_FOR = { feeder: 'feeder', trough: 'trough', lean: 'lean', workshop: 'workshop', hayBarn: 'hayBarn', well: 'well', watchtower: 'watchtower', lampPost: 'lampPostLit', herbGarden: 'herbGarden', infirmary: 'infirmary', loom: 'loom', treadmill: 'treadmill0', choirStage: 'choirStage', olivePress: 'olivePress' };
NN.PROP_FOR = PROP_FOR;
let bsel = null;
function renderBuild() {
  const B = NN.DEFS.BUILD, types = Object.keys(B).filter(k => B[k].ch <= G.chapter);
  if (!bsel || !types.includes(bsel)) bsel = types.find(t => GM.has(B[t].cost)) || types[0];
  const p = frame('Build', 'Pick a building to see what it does.', `<div class="split"><div class="list" id="blist"></div><div class="pane" id="bpane"></div></div>`);
  const list = p.querySelector('#blist'), pane = p.querySelector('#bpane');
  const N = NN.DEFS.RES_NAME, JOBS = NN.DEFS.JOBS;
  const show = t => {
    bsel = t;
    list.querySelectorAll('.item').forEach(b => b.classList.toggle('sel', b.dataset.t === t));
    const d = B[t], ok = GM.has(d.cost), have = GM.count(t);
    const jobs = d.jobs ? Object.entries(d.jobs).map(([j, n]) => `${n} ${JOBS[j].name}${n > 1 ? 's' : ''}`).join(', ') : '';
    pane.innerHTML = `<canvas class="pic" width="160" height="56"></canvas><h3>${esc(d.name)}</h3><div>${esc(d.desc)}</div>
      ${jobs ? `<div class="muted">Jobs here: ${esc(jobs)}. Sheep volunteer by themselves.</div>` : ''}
      <div class="cost">Costs: ${Object.entries(d.cost).map(([k, v]) => `<span class="${(G.res[k] || 0) < v ? 'no' : ''}">${v} ${esc(N[k])} (you have ${G.res[k] || 0})</span>`).join('')}</div>
      ${have ? `<div class="muted">You have built ${have}.</div>` : ''}
      <div class="acts"><button class="btn" type="button" id="bgo" ${ok ? '' : 'disabled'}>${ok ? 'Place it' : 'Not enough supplies'}</button></div>`;
    UI.drawArt(pane.querySelector('canvas'), { prop: PROP_FOR[t] });
    pane.querySelector('#bgo').addEventListener('click', () => place(t));
  };
  const place = t => {
    const d = B[t];
    if (!GM.has(d.cost)) { GM.sfx('cancel'); return; }
    UI.closePanel(); UI.placing = { type: t }; NN.mode = 'build'; GM.sfx('select');
    UI.tip(`Place the ${d.name}: point with the mouse, or walk to the spot and press Enter. Esc cancels.`, 6);
  };
  types.forEach(t => {
    const d = B[t], ok = GM.has(d.cost);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'item'; b.dataset.t = t;
    const c = document.createElement('canvas'); c.width = 22; c.height = 16; UI.drawArt(c, { prop: PROP_FOR[t] });
    b.append(c);
    b.insertAdjacentHTML('beforeend', `<span>${esc(d.name)}</span><small class="${ok ? '' : 'no'}">${ok ? 'ready' : 'need more'}</small>`);
    b.addEventListener('click', () => show(t));
    b.addEventListener('dblclick', () => place(t));
    b.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); place(t); } });
    b.addEventListener('focus', () => show(t));
    list.append(b);
  });
  show(bsel);
  setTimeout(() => { const b = list.querySelector('.item.sel'); b && b.focus({ preventScroll: true }); }, 0);
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
  const p = frame('Your flock', `${flock.length} sheep${lost ? ` · ${lost} lost out there` : ''} · beds ${home}/${cap.beds} · feeders for ${cap.food} · troughs for ${cap.drink}`,
    `<div class="split"><div class="list" id="flist"></div><div class="pane" id="fpane"><div class="muted">Pick a sheep to see how they're doing.</div></div></div>`);
  const list = p.querySelector('#flist'), pane = p.querySelector('#fpane');
  const health = s => (s.hurt || !s.fed || !s.watered) ? 'bad' : (s.energy < 0.35 || s.cold) ? 'warn' : '';
  const show = s => {
    sel = s.id;
    list.querySelectorAll('.item').forEach(b => b.classList.toggle('sel', +b.dataset.id === s.id));
    const job = s.job ? NN.DEFS.JOBS[s.job.type].name : s.state === 'follow' ? 'Following you' : s.state === 'nap' ? 'Napping' : s.kind === 'lamb' ? 'Being a lamb' : 'Grazing';
    const need = (ok, good, bad) => `<div class="need"><i class="${ok ? '' : 'x'}">${ok ? '✓' : '✗'}</i><span>${esc(ok ? good : bad)}</span></div>`;
    pane.innerHTML = `<canvas class="pic" width="160" height="56"></canvas><h3>${esc(s.name)} <span class="muted">${esc(s.trait)}${s.kind === 'lamb' ? ' lamb' : ''}</span></h3>
      <div>Doing: ${esc(job)}</div>
      ${need(s.fed, 'Fed this morning', 'Hungry. Needs hay and room at a feeder.')}
      ${need(s.watered, 'Had water this morning', 'Thirsty. Needs water and room at a trough.')}
      ${need(!s.hurt, 'Healthy', 'Hurt. A Doc in the fold will patch them up.')}
      ${G.chapter >= 5 ? need(s.blanket, 'Has a blanket', 'No blanket for cold nights. Knitters make them at a Loom.') : ''}
      <div class="bars"><span>Energy</span><div class="bar"><i style="width:${Math.round(s.energy * 100)}%"></i></div><span>Joy</span><div class="bar"><i style="width:${Math.round(s.joy * 100)}%;background:var(--rose)"></i></div></div>
      <div class="muted">Ask, don't order. Tired, hungry or hurt sheep will say no.</div><div class="acts" id="facts"></div>`;
    UI.drawArt(pane.querySelector('canvas'), { spr: s.kind === 'lamb' ? 'lamb' : 'sheep', mods: NN.GAME_MODS(s), swap: s.swap });
    const acts = pane.querySelector('#facts');
    if (s.kind !== 'lamb') for (const j of [...new Set(GM.freeSlots().map(sl => sl[0]).filter(j => j !== 'guard'))]) {
      const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = 'Ask: ' + NN.DEFS.JOBS[j].name; b.title = NN.DEFS.JOBS[j].desc;
      b.addEventListener('click', () => { const r = GM.ask(s, j); UI.closePanel(); UI.sheepTalk(s, r.line); }); acts.append(b);
    }
    const rb = document.createElement('button'); rb.className = 'btn'; rb.type = 'button'; rb.textContent = s.job ? 'Ask them to rest' : 'Let them rest';
    rb.addEventListener('click', () => { const r = GM.ask(s, 'rest'); UI.closePanel(); UI.sheepTalk(s, r.line); }); acts.append(rb);
  };
  for (const s of flock) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'item'; b.dataset.id = s.id;
    const c = document.createElement('canvas'); c.width = 22; c.height = 16; UI.drawArt(c, { spr: s.kind === 'lamb' ? 'lamb' : 'sheep', mods: NN.GAME_MODS(s), swap: s.swap });
    b.append(c);
    b.insertAdjacentHTML('beforeend', `<span>${esc(s.name)}</span><span class="dot ${health(s)}"></span>`);
    b.addEventListener('click', () => show(s)); b.addEventListener('focus', () => show(s));
    list.append(b);
  }
  const first = (sel && flock.find(s => s.id === sel)) || flock[0];
  if (first) { show(first); setTimeout(() => { const b = list.querySelector('.item.sel'); b && b.focus({ preventScroll: true }); }, 0); }
}
function renderGoals() {
  const n = G.chapter, c = (SCR().chapters || [])[n - 1] || { title: 'Chapter ' + n };
  const objs = NN.STORY.objectives();
  const p = frame(`Chapter ${n}: ${c.title}`, `Day ${G.day}`, `<div class="scroll">${c.verse ? `<div class="verse">${esc(c.verse)} (${esc(c.ref || '')})</div>` : ''}<div id="olist"></div></div>`);
  p.querySelector('#olist').innerHTML = objs.map(o => { const s = NN.STORY.objState(o); return `<div class="obj${s.done ? ' done' : ''}${o.key ? ' key' : ''}"><i>${s.done ? '✓' : '·'}</i><span>${esc(s.text)}</span></div>`; }).join('') +
    (NN.STORY.hiddenGoals() ? `<div class="obj"><i>…</i><span style="color:var(--muted)">More goals will turn up as the chapter goes on.</span></div>` : '') +
    `<div class="obj"><i></i><span style="color:var(--muted)">Bold goals move the story along. The rest make the farm stronger. The one at the top shows in the corner of the screen.</span></div>`;
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
function renderHelp() {
  const all = NN.HELP ? NN.HELP.LESSONS : [];
  const p = frame('How to play', 'Every lesson in the game. They pop up the first time something new happens.', `<div class="split"><div class="list" id="hlist"></div><div class="pane" id="hpane"></div></div>`);
  const list = p.querySelector('#hlist'), pane = p.querySelector('#hpane');
  const show = l => {
    list.querySelectorAll('.item').forEach(b => b.classList.toggle('sel', b.dataset.id === l.id));
    pane.innerHTML = `<canvas class="pic" width="160" height="56"></canvas><h3>${esc(l.title)}</h3><div>${keyed(l.text)}</div>`;
    UI.drawArt(pane.querySelector('canvas'), l.art);
  };
  all.forEach(l => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'item'; b.dataset.id = l.id;
    b.style.gridTemplateColumns = '1fr auto';
    b.innerHTML = `<span>${esc(l.title)}</span><small>${NN.HELP.seen(l.id) ? '' : 'new'}</small>`;
    b.addEventListener('click', () => show(l)); b.addEventListener('focus', () => show(l));
    list.append(b);
  });
  const keys = { id: 'keys', title: 'Keys', art: { human: 'shepherd' }, text: 'Move: [W][A][S][D] or arrows. Use or talk: [E]. Whistle: [Space]. Build: [B]. Flock: [F]. Goals: [Q]. Map: [M]. Notes: [C]. How to play: [H]. Menu: [Esc].' };
  const kb = document.createElement('button'); kb.type = 'button'; kb.className = 'item'; kb.dataset.id = 'keys'; kb.style.gridTemplateColumns = '1fr'; kb.innerHTML = '<span><b>Keys</b></span>';
  kb.addEventListener('click', () => show(keys)); kb.addEventListener('focus', () => show(keys));
  list.prepend(kb);
  show(keys);
}
function renderSettings() {
  const S = NN.SET, A = NN.audio || {};
  const p = frame('Settings', 'Saved on this device.', `<div class="scroll"><div class="settings" id="sets"></div></div>`);
  const box = p.querySelector('#sets');
  const slider = (label, get, set) => {
    const row = document.createElement('label'); row.className = 'set';
    row.innerHTML = `<span>${label}</span><input type="range" min="0" max="100" step="5"><b></b>`;
    const r = row.querySelector('input'), v = row.querySelector('b');
    r.value = Math.round(get() * 100); v.textContent = r.value + '%';
    r.addEventListener('input', () => { set(r.value / 100); v.textContent = r.value + '%'; });
    r.addEventListener('change', () => play('select'));
    box.append(row);
  };
  const toggle = (label, get, set, hint) => {
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = `<span>${label}${hint ? `<small>${hint}</small>` : ''}</span><button class="btn" type="button"></button>`;
    const b = row.querySelector('button'); const paint = () => { b.textContent = get() ? 'On' : 'Off'; b.classList.toggle('off', !get()); };
    paint(); b.addEventListener('click', () => { set(!get()); paint(); NN.saveSettings(); play('select'); });
    box.append(row);
  };
  const choice = (label, opts, get, set) => {
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = `<span>${label}</span><span class="opts"></span>`;
    const o = row.querySelector('.opts');
    opts.forEach(([val, txt]) => { const b = document.createElement('button'); b.className = 'btn' + (get() === val ? '' : ' off'); b.type = 'button'; b.textContent = txt; b.addEventListener('click', () => { set(val); NN.saveSettings(); o.querySelectorAll('button').forEach(x => x.classList.toggle('off', x !== b)); play('select'); }); o.append(b); });
    box.append(row);
  };
  if (A.setMusicVolume) slider('Music', () => A.musicVolume, v => A.setMusicVolume(v));
  if (A.setSfxVolume) slider('Sound effects', () => A.sfxVolume, v => A.setSfxVolume(v));
  toggle('All sound', () => !A.muted, () => A.toggleMute && A.toggleMute());
  choice('Text speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']], () => S.textSpeed, v => { S.textSpeed = v; });
  toggle('Lessons', () => NN.HELP.enabled(), v => NN.HELP.setEnabled(v), 'Tutorial cards the first time things happen');
  toggle('Large text', () => S.bigText, v => { S.bigText = v; document.getElementById('ui').classList.toggle('big', v); }, 'Bigger dialogue, lessons and menus');
  toggle('Screen shake', () => S.shake, v => { S.shake = v; });
  toggle('Flashes', () => S.flashes, v => { S.flashes = v; }, 'Lightning and hit flashes');
  toggle('Vignette', () => S.vignette, v => { S.vignette = v; }, 'Soft darkening at the edges');
  toggle('Particles and wildlife', () => S.particles, v => { S.particles = v; });
  setTimeout(() => { const f = box.querySelector('input, button'); f && f.focus({ preventScroll: true }); }, 0);
}
function renderPause() {
  const el = $('panel');
  el.innerHTML = `<div class="panel wood menu"><h2>Paused</h2></div>`;
  el.hidden = false;
  const m = el.firstChild;
  const add = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); m.append(b); return b; };
  add('Resume', UI.closePanel).focus({ preventScroll: true });
  add('How to play (H)', () => { UI.closePanel(); UI.openPanel('help'); });
  add('Goals (Q)', () => { UI.closePanel(); UI.openPanel('goals'); });
  add('Map (M)', () => { UI.closePanel(); UI.openPanel('map'); });
  add("Shepherd's Notes (C)", () => { UI.closePanel(); UI.openPanel('codex'); });
  add('Settings', () => { UI.closePanel(); UI.openPanel('settings'); });
  add('Save game', () => { if (NN.save()) UI.toast('Saved on this device.'); else UI.toast('You can save in the daytime.'); });
  add('Save and quit to title', () => { NN.save(); UI.closePanel(); NN.toTitle(); });
}

let lastHover = null;
document.getElementById('ui').addEventListener('pointerover', e => { const b = e.target.closest('button'); if (b && b !== lastHover && !b.disabled) { lastHover = b; play('hover'); } });
document.getElementById('ui').addEventListener('focusin', e => { if (e.target.tagName === 'BUTTON' && e.target !== lastHover) { lastHover = e.target; play('hover'); } });

// ---------------------------------------------------------------- title, credits, end
UI.title = hasSave => {
  const el = $('title'), btns = $('title-btns');
  el.hidden = false; $('hud').hidden = true; NN.mode = 'title';
  btns.innerHTML = '';
  const add = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = label; b.addEventListener('click', e => { e.stopPropagation(); NN.audio.init(); fn(); }); btns.append(b); return b; };
  if (hasSave) add('Continue', () => NN.continueGame()).focus({ preventScroll: true });
  const ng = add('New game', () => NN.newGame());
  if (!hasSave) ng.focus({ preventScroll: true });
  add('Settings', () => UI.openPanel('settings'));
  add('How to play', () => UI.openPanel('help'));
  const lc = $('logo');
  if (lc && !lc.dataset.done) { try { const pr = NN.prop('logo'), x = lc.getContext('2d'); lc.width = pr.img.width; lc.height = pr.img.height; x.imageSmoothingEnabled = false; x.drawImage(pr.img, 0, 0); lc.hidden = false; lc.dataset.done = 1; $('title-h1').hidden = true; } catch (e) { /* text title stays */ } }
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
