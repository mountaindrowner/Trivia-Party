// Spark Wars' Lightning Round: a TV, 1 real phone and 22 bot phones, on a curriculum lesson, optionally at tables.
//   node tests/e2e/lightning.cjs <base> <screenshot dir> [lesson number] [tables]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
global.window = global; global.THP = {};
for (const f of ['data', 'data-modes', 'more/l2', 'more/l3']) require(path.join(ROOT, 'js', f + '.js'));
for (const f of fs.existsSync(ROOT + '/spark/data/lessons') ? fs.readdirSync(ROOT + '/spark/data/lessons') : []) require(ROOT + '/spark/data/lessons/' + f);
const RIGHT = new Map(THP.QUESTIONS.map((q) => [q.q, q.a[0]]));
for (const l of (global.SPARK_DATA && SPARK_DATA.LESSONS) || []) for (const q of l.q) RIGHT.set(q.q, q.a[0]);
(async () => {
  const BASE = process.argv[2], OUT = process.argv[3], LESSON = Number(process.argv[4] || 1), TABLES = Number(process.argv[5] || 0);
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const tv = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; tv.on('pageerror', (e) => errs.push(e.message));
  await tv.addInitScript((n) => localStorage.setItem('sparkwars-prefs', JSON.stringify({ game: 'lightning', teams: 2, muted: true, lesson: n[0], lessonMix: 'week', lqCount: 3, lqTime: 15, lqTables: n[1] })), [LESSON, TABLES]);
  await tv.goto(BASE + '/tv'); await tv.click('text=Open a room', { force: true }); await tv.waitForSelector('.lobby .code span');
  const code = await tv.$$eval('.lobby .code span', (s) => s.map((x) => x.textContent).join(''));
  const phone = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await phone.goto(`${BASE}/?room=${code}`); await phone.fill('#name', 'Joy'); await phone.click('button[type=submit]'); await phone.waitForSelector('.avatars'); await phone.click("text=I'm ready!"); await phone.waitForSelector("text=You're in!");
  const N = ['Ava', 'Ben', 'Cal', 'Dee', 'Ezra', 'Finn', 'Gabe', 'Hope', 'Ivy', 'Jude', 'Kai', 'Liam', 'Mia', 'Noah', 'Owen', 'Pip', 'Quinn', 'Rae', 'Silas', 'Tess', 'Uma', 'Vince'];
  const bots = [];
  for (const name of N) await new Promise((res) => { const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/ws/${code}?role=player`); bots.push(ws);
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'hello') ws.send(JSON.stringify({ t: 'join', name, avatar: 'bolt' })); if (m.t === 'joined') res();
      if (m.t === 'msg' && m.data.screen === 'choices') { const s = m.data; setTimeout(() => { const r = s.options.indexOf(RIGHT.get(s.prompt)); ws.send(JSON.stringify({ t: 'input', data: { type: 'pick', round: s.round, pick: r >= 0 && Math.random() < 0.65 ? r : Math.floor(Math.random() * 4) } })); }, 800 + Math.random() * 6000); } }; });
  await tv.waitForTimeout(800);
  await tv.screenshot({ path: `${OUT}/1-lobby.png` });
  await phone.click("text=Everybody's in!");
  if (TABLES) {
    await tv.waitForSelector('.scramble'); await tv.waitForTimeout(1400); await tv.screenshot({ path: `${OUT}/2a-scrambling.png` });
    await tv.waitForSelector('.seated', { timeout: 20000 }); await tv.waitForTimeout(1200); await tv.screenshot({ path: `${OUT}/2b-tables.png` });
    await phone.screenshot({ path: `${OUT}/p-table.png` });
    await phone.click("text=We're all seated", { force: true });
  }
  await tv.waitForSelector('.intro'); await tv.waitForTimeout(3500); await tv.screenshot({ path: `${OUT}/2-rules.png` });
  await phone.click('text=Skip the rules', { force: true });
  const shots = new Set(); const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    const core = await tv.evaluate(() => SPARK.core), ph = await tv.evaluate(() => SPARK.phase);
    if (core === 'results') break;
    if (ph === 'ask' && !shots.has('ask')) { shots.add('ask'); await tv.waitForTimeout(3000); await tv.screenshot({ path: `${OUT}/3-ask.png` }); await phone.screenshot({ path: `${OUT}/p-ask.png` }); }
    if (ph === 'reveal' && !shots.has('reveal')) { shots.add('reveal'); await tv.waitForTimeout(900); await tv.screenshot({ path: `${OUT}/4-reveal.png` }); await phone.screenshot({ path: `${OUT}/p-reveal.png` }); }
    if (ph === 'scores' && !shots.has('scores')) { shots.add('scores'); await tv.waitForTimeout(1500); await tv.screenshot({ path: `${OUT}/5-scores.png` }); }
    if (ph === 'ask') { const c = await phone.$('.choices:not(.done) button'); if (c) await c.click().catch(() => {}); }
    await tv.waitForTimeout(400);
  }
  await tv.waitForSelector('.results', { timeout: 15000 }); await tv.waitForTimeout(3500); await tv.screenshot({ path: `${OUT}/6-results.png` });
  const st = await tv.evaluate(() => ({ war: SPARK.night.war, scores: Object.values(SPARK.game.scores), tables: (SPARK.game.tables || []).map((t) => t.name + ':' + t.ids.length + ':' + Math.round(t.total)) }));
  console.log('war', JSON.stringify(st.war), 'tables', st.tables.join(' '));
  console.log(errs.length ? 'PAGE ERRORS: ' + errs.join(' | ') : 'no page errors');
  for (const w of bots) w.close(); await b.close(); process.exit(errs.length ? 1 : 0);
})();
