// A whole Spark Wars night with 30 players: Talents (1 minute), Bluff the Bible (4 facts), Timeline (2 sets).
// A TV and 3 real phones in Chromium, 27 bot phones over WebSockets.
//   node tests/e2e/spark-night.cjs <base> <screenshot dir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
if (process.env.HTTPS_PROXY && !(process.argv[2] || '').includes('127.0.0.1')) {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = require(ROOT + '/huddle/server/node_modules/undici');
  setGlobalDispatcher(new EnvHttpProxyAgent());
}
global.window = global; global.THP = {};
for (const f of ['data', 'data-modes', 'more/l2', 'more/l3', 'more/l4', 'more/l5', 'more/l6', 'more/l7']) require(path.join(ROOT, 'js', f + '.js'));
require(ROOT + '/spark/data/bluff.js'); require(ROOT + '/spark/data/timeline.js');
const RIGHT = new Map(THP.QUESTIONS.map((q) => [q.q, q.a[0]]));
const BLUFF = new Map(SPARK_DATA.BLUFF.map((q) => [q.q.replace('___', '_____'), q]));
const SETS = new Map(SPARK_DATA.TIMELINE.map((s) => [s.title, s.items.map((i) => i.t)]));
const FAKES = ['A golden goat', 'Seven jars of honey', 'His left sandal', 'A very old fig', 'Forty pigeons', 'The tax office', 'A broken harp', 'Purple sheep', 'Three loud trumpets', 'A sack of lentils'];

(async () => {
  const BASE = process.argv[2] || 'http://127.0.0.1:8788';
  const OUT = process.argv[3] || 'night-shots';
  fs.mkdirSync(OUT, { recursive: true });
  const live = !BASE.includes('127.0.0.1');
  const PX = process.env.HTTPS_PROXY;
  const b = await chromium.launch(PX && live ? { proxy: { server: PX } } : {});
  const errs = [];
  let ok = 0, bad = 0;
  const check = (c, what) => { c ? ok++ : bad++; console.log((c ? '  ok   ' : '  FAIL ') + what); };
  const tvCtx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const tv = await tvCtx.newPage();
  tv.on('pageerror', (e) => errs.push('tv: ' + e.message));
  tv.on('console', (m) => { if (m.type() === 'error') errs.push('tv console: ' + m.text()); });
  await tv.addInitScript(() => localStorage.setItem('sparkwars-prefs', JSON.stringify({ game: 'talents', teams: 3, pack: 'mix', minutes: 1, steals: true, muted: true, bluffs: 4, sets: 2, tlvl: 0 })));
  await tv.goto(BASE + '/tv');
  await tv.screenshot({ path: `${OUT}/tv-00-title.png` });
  await tv.click('text=Open a room', { force: true });
  await tv.waitForSelector('.lobby .code span', { timeout: 10000 });
  const code = await tv.$$eval('.lobby .code span', (s) => s.map((x) => x.textContent).join(''));

  const who = ['Joy', 'Sam', 'Eli'];
  const phones = [];
  for (let i = 0; i < who.length; i++) {
    const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`${who[i]}: ` + e.message));
    await p.goto(`${BASE}/?room=${code}`);
    await p.waitForSelector('#name');
    await p.fill('#name', who[i]);
    await p.click('button[type=submit]');
    await p.waitForSelector('.avatars');
    await p.click(`.avatars button:nth-child(${i * 5 + 2})`);
    await p.click("text=I'm ready!");
    await p.waitForSelector("text=You're in!", { timeout: 5000 });
    phones.push(p);
  }

  const NAMES = ['Ava', 'Ben', 'Cal', 'Dee', 'Ezra', 'Finn', 'Gabe', 'Hope', 'Ivy', 'Jude', 'Kai', 'Liam', 'Mia', 'Noah', 'Owen', 'Pip', 'Quinn', 'Rae', 'Silas', 'Tess', 'Uma', 'Vince', 'Wren', 'Xavi', 'Yara', 'Zeke', 'Abby'];
  const AV = ['bolt', 'flame', 'rocket', 'comet', 'fox', 'wolf', 'shark', 'tiger', 'panda', 'owl', 'octopus', 'dino', 'dragon', 'robot', 'alien', 'ghost', 'ball', 'guitar', 'skate', 'pizza', 'crown', 'gem', 'cactus', 'eagle2'];
  const wsBase = BASE.replace(/^http/, 'ws');
  const st = { drops: 0, errors: [], kinds: {}, textRefused: 0, finals: 0, trueTyped: 0 };
  const bots = [];
  for (let i = 0; i < NAMES.length; i++) {
    const skill = 0.4 + Math.random() * 0.5, speed = 700 + Math.random() * 2200;
    const bot = { name: NAMES[i], last: null, swore: i % 5 !== 1 };
    await new Promise((resolve) => { const open = () => {
      const ws = new WebSocket(`${wsBase}/ws/${code}?role=player`);
      bot.ws = ws;
      const sendIn = (data) => { try { ws.send(JSON.stringify({ t: 'input', data })); } catch (e) {} };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.t === 'hello') return ws.send(JSON.stringify(bot.id ? { t: 'rejoin', id: bot.id, key: bot.key } : { t: 'join', name: NAMES[i], avatar: AV[i % AV.length] }));
        if (m.t === 'joined') { if (!m.rejoined) { bot.id = m.id; bot.key = m.key; resolve(); } return; }
        if (m.t === 'error') {
          if (/^text-/.test(m.code)) { st.textRefused++; setTimeout(() => sendIn({ type: 'write', round: m.round, text: 'A clean answer' }), 300); return; }
          st.errors.push(NAMES[i] + ':' + m.code); return;
        }
        if (m.t !== 'msg') return;
        const s = m.data; bot.last = s;
        st.kinds[s.screen + (s.look ? ':' + s.look : '')] = (st.kinds[s.screen + (s.look ? ':' + s.look : '')] || 0) + 1;
        if (s.screen === 'final') st.finals++;
        if (s.note && /actually TRUE/.test(s.note)) st.trueTyped++;
        const later = (ms, fn) => setTimeout(() => { if (bot.last === s) fn(); }, ms);
        if (s.screen === 'choices') {
          later(s.look ? 500 + Math.random() * 800 : speed, () => {
            let pick = Math.floor(Math.random() * s.options.length);
            const known = RIGHT.get(s.prompt) || (BLUFF.get(s.prompt) || {}).a;
            if (!s.look && known) { const r = s.options.indexOf(known); if (r >= 0 && Math.random() < skill) pick = r; }
            sendIn({ type: 'pick', round: s.round, pick });
          });
        } else if (s.screen === 'write') {
          later(speed * 2, () => {
            const Q = BLUFF.get(s.prompt.replace('___', '_____'));
            if (!bot.swore) { bot.swore = true; return sendIn({ type: 'write', round: s.round, text: 'sh1t answer' }); }
            if (i === 5 && Q && !bot.typedTrue) { bot.typedTrue = true; return sendIn({ type: 'write', round: s.round, text: Q.a }); }
            if (Math.random() < 0.25) return sendIn({ type: 'write', round: s.round, auto: true });
            sendIn({ type: 'write', round: s.round, text: FAKES[(i + Math.floor(Math.random() * 3)) % FAKES.length] });
          });
        } else if (s.screen === 'slots') {
          later(speed, () => {
            const items = SETS.get(s.title) || [];
            const k = items.indexOf(s.card);
            const right = s.items.filter((t) => items.indexOf(t) < k).length;
            sendIn({ type: 'slot', round: s.round, at: Math.random() < skill ? right : Math.floor(Math.random() * (s.items.length + 1)) });
          });
        }
      };
      ws.onclose = (e) => {
        if (e.code === 1006 && bot.id && !bot.done) { st.drops++; return setTimeout(open, 800); }
        if (e.code !== 4000 && !bot.done) st.errors.push(NAMES[i] + ' closed ' + e.code); resolve();
      };
    }; open(); });
    bots.push(bot);
  }
  await tv.waitForTimeout(600);
  check((await tv.textContent('.who .count')) === '30 / 30', 'the lobby shows 30 / 30');
  await tv.screenshot({ path: `${OUT}/tv-01-lobby.png` });

  // The real phones: answer whatever they're shown.
  const shots = new Set();
  async function drive(i, game) {
    const p = phones[i];
    const s = await p.evaluate(() => ({
      write: !!document.querySelector('input.write:not([disabled])'), slots: !!document.querySelector('.line:not(.done) .gap'),
      choices: !!document.querySelector('.choices:not(.done)'), prompt: (document.querySelector('.prompt') || {}).textContent || '',
    }));
    const kind = s.write ? 'write' : s.slots ? 'slots' : s.choices ? 'choices' : null;
    const tag = game + '-' + (kind || 'other');
    if (kind && !shots.has(tag)) { shots.add(tag); await p.screenshot({ path: `${OUT}/phone-${tag}-${who[i]}.png` }); }
    if (s.write) { await p.fill('input.write', ['A purple donkey', 'Eleven baskets', 'His brother-in-law'][i]); await p.click('text=Send it!').catch(() => {}); }
    else if (s.slots) { const n = await p.$$eval('.line .gap', (g) => g.length); await p.click(`.line .gap >> nth=${Math.floor(Math.random() * n)}`).catch(() => {}); }
    else if (s.choices) {
      const opts = await p.$$eval('.choices button', (bs) => bs.map((x) => x.textContent.slice(x.querySelector('.k').textContent.length)));
      const known = RIGHT.get(s.prompt) || (BLUFF.get(s.prompt) || {}).a;
      let pick = Math.floor(Math.random() * opts.length);
      if (known && opts.indexOf(known) >= 0 && i === 0) pick = opts.indexOf(known);
      await p.click(`.choices button >> nth=${pick}`).catch(() => {});
    }
  }
  async function playUntilResults(game, shotsAt) {
    const t0 = Date.now(), seen = new Set();
    while (Date.now() - t0 < 300000) {
      const core = await tv.evaluate(() => SPARK.core), sub = await tv.evaluate(() => SPARK.phase);
      if (core === 'results') break;
      const key = core + ':' + sub;
      if (!seen.has(key)) { seen.add(key); await tv.waitForTimeout(500); await tv.screenshot({ path: `${OUT}/tv-${game}-${String(seen.size).padStart(2, '0')}-${key.replace(/:/g, '-')}.png` }); }
      if (core === 'game') await Promise.all(phones.map((_, i) => drive(i, game).catch(() => {})));
      await tv.waitForTimeout(350);
    }
    await tv.waitForSelector('.results', { timeout: 15000 });
    await tv.waitForTimeout(1200);
    await tv.screenshot({ path: `${OUT}/tv-${game}-99-results.png` });
    await phones[0].screenshot({ path: `${OUT}/phone-${game}-final-Joy.png` });
    return Date.now() - t0;
  }

  // 1. Talents, started from the VIP's phone.
  await phones[0].click("text=Everybody's in!");
  await tv.waitForSelector('.intro', { timeout: 5000 });
  await phones[0].click('text=Skip the rules', { force: true });
  let ms = await playUntilResults('talents');
  let war = await tv.evaluate(() => SPARK.night.war);
  console.log('       Talents done in', Math.round(ms / 1000), 's · war', JSON.stringify(war));
  check(Object.values(war).reduce((a, b) => a + b, 0) === 6, 'Talents gave out 3 + 2 + 1 War Points');

  // 2. Bluff the Bible, picked in the lobby.
  await tv.click('text=Pick another game', { force: true });
  await tv.waitForSelector('.lobby');
  await tv.screenshot({ path: `${OUT}/tv-02-lobby-war.png` });
  const teamsBefore = await tv.evaluate(() => JSON.stringify(SPARK.night.teamOf));
  await tv.click('.game:has-text("Bluff the Bible")', { force: true });
  await tv.click('text=Start Bluff the Bible', { force: true });
  await tv.waitForSelector('.intro', { timeout: 5000 });
  await tv.screenshot({ path: `${OUT}/tv-bluff-00-rules.png` });
  await phones[0].click('text=Skip the rules', { force: true });
  // Hide one fake from the TV during the first pick (twice-click), like a leader would.
  const hider = (async () => {
    await tv.waitForSelector('.options .opt', { timeout: 120000 });
    const fake = await tv.$$('.options .opt');
    for (const f of fake) { const t = await f.textContent(); if (/A golden goat|Purple sheep|Forty pigeons/.test(t)) { await f.click(); await f.click(); return t; } }
    return null;
  })();
  ms = await playUntilResults('bluff');
  const hid = await hider;
  war = await tv.evaluate(() => SPARK.night.war);
  const bluffState = await tv.evaluate(() => ({ scores: Object.values(SPARK.game.scores), wrote: Object.values(SPARK.game.wrote) }));
  console.log('       Bluff done in', Math.round(ms / 1000), 's · war', JSON.stringify(war), '· hid', hid);
  check(teamsBefore === await tv.evaluate(() => JSON.stringify(SPARK.night.teamOf)), 'the teams stayed the same between games');
  check(Object.values(war).reduce((a, b) => a + b, 0) === 12, 'Bluff added another 6 War Points');
  check(st.textRefused >= 6, `the server refused the bad word typed by bots (${st.textRefused} times) and they retried`);
  check(st.trueTyped >= 1, 'typing the real answer asks for a fake instead');
  check(bluffState.scores.some((x) => x > 0), 'Bluff scored points');
  check(Math.max(...bluffState.wrote) - Math.min(...bluffState.wrote) <= 1, 'with 30 players, writing turns were shared evenly: ' + bluffState.wrote.join(','));

  // 3. Timeline, from the results screen's "Pick another game".
  await tv.click('text=Pick another game', { force: true });
  await tv.waitForSelector('.lobby');
  await tv.click('.game:has-text("Timeline")', { force: true });
  await tv.click('text=Start Timeline', { force: true });
  await tv.waitForSelector('.intro', { timeout: 5000 });
  await tv.screenshot({ path: `${OUT}/tv-timeline-00-rules.png` });
  await phones[0].click('text=Skip the rules', { force: true });
  ms = await playUntilResults('timeline');
  war = await tv.evaluate(() => SPARK.night.war);
  console.log('       Timeline done in', Math.round(ms / 1000), 's · war', JSON.stringify(war));
  check(Object.values(war).reduce((a, b) => a + b, 0) === 18, 'Timeline added another 6 War Points');
  check(st.finals >= 27 * 3, `every bot got a final screen after each game (${st.finals})`);
  check(st.errors.length === 0, 'no bot errors: ' + st.errors.join(', '));
  console.log('       bot screens:', JSON.stringify(st.kinds), '· drops', st.drops);
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(`${ok} ok, ${bad} failed`);
  for (const bot of bots) try { bot.done = true; bot.ws.close(); } catch (e) {}
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
