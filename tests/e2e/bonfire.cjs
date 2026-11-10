// A whole Bonfire night with 40 people: everyone answers questions while joining, then all four mini-games and the
// Campfire Report. A TV and 1 real phone in Chromium, 39 bot phones over WebSockets.
//   node tests/e2e/bonfire.cjs <base> <screenshot dir> [players]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
if (process.env.HTTPS_PROXY && !(process.argv[2] || '').includes('127.0.0.1')) {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = require(ROOT + '/huddle/server/node_modules/undici');
  setGlobalDispatcher(new EnvHttpProxyAgent());
}
const TYPED = ['Fries in a milkshake', 'Captain Nachos', 'Iceland', 'A red panda', 'Pickles', 'Rock climbing', 'Corn maze guide', 'Breakfast burritos', 'Dunkaroos', 'It is what it is'];

(async () => {
  const BASE = process.argv[2] || 'http://127.0.0.1:8789';
  const OUT = process.argv[3] || 'bonfire-shots';
  const N = Number(process.argv[4] || 40);
  fs.mkdirSync(OUT, { recursive: true });
  const live = !BASE.includes('127.0.0.1');
  const PX = process.env.HTTPS_PROXY;
  const b = await chromium.launch(PX && live ? { proxy: { server: PX } } : {});
  const errs = [];
  let ok = 0, bad = 0;
  const check = (c, what) => { c ? ok++ : bad++; console.log((c ? '  ok   ' : '  FAIL ') + what); };
  const t0 = Date.now();

  // The TV (the host's voice off, so the show doesn't wait for speech that headless Chromium can't make).
  const tv = await (await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } })).newPage();
  tv.on('pageerror', (e) => errs.push('tv: ' + e.message));
  tv.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy/.test(m.text())) errs.push('tv console: ' + m.text()); });
  await tv.addInitScript(() => localStorage.setItem('bonfire-prefs', JSON.stringify({ voice: false, muted: true, kindle: 10 })));
  await tv.goto(BASE + '/tv');
  await tv.screenshot({ path: `${OUT}/tv-00-title.png` });
  await tv.click('text=Light the fire');
  await tv.waitForSelector('.lobby .code span', { timeout: 10000 });
  const code = await tv.$$eval('.lobby .code span', (s) => s.map((x) => x.textContent).join(''));

  // Everyone's secret number in Kindred Spirits (each phone's own is in its header), so bots can "ask" for it.
  const numbers = new Map();
  const st = { finals: 0, kinds: {}, errors: [], found: 0 };

  // One real phone.
  const pctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await pctx.newPage();
  phone.on('pageerror', (e) => errs.push('phone: ' + e.message));
  phone.on('console', (m) => { if (/Content Security Policy/.test(m.text())) errs.push('phone blocked: ' + m.text()); });
  await phone.goto(`${BASE}/?room=${code}`);
  await phone.waitForSelector('#name');
  await phone.fill('#name', 'Joy');
  await phone.click('button[type=submit]');
  await phone.waitForSelector('.avatars');
  await phone.click('.avatars button:nth-child(3)');
  await phone.click("text=I'm ready!");
  await phone.waitForSelector('.prompt', { timeout: 8000 });
  await phone.screenshot({ path: `${OUT}/phone-01-question.png` });
  check(true, 'a phone gets its first question as soon as it joins');

  // The bots.
  const NAMES = ['Ava', 'Ben', 'Cal', 'Dee', 'Ezra', 'Finn', 'Gabe', 'Hope', 'Ivy', 'Jude', 'Kai', 'Liam', 'Mia', 'Noah', 'Owen', 'Pip', 'Quinn', 'Rae', 'Silas', 'Tess',
    'Uma', 'Vince', 'Wren', 'Xavi', 'Yara', 'Zeke', 'Abby', 'Bo', 'Cora', 'Drew', 'Elle', 'Gus', 'Hal', 'Iris', 'Jax', 'Kit', 'Lou', 'Max', 'Nell'].slice(0, N - 1);
  const AV = ['tent', 'moon', 'star', 'pine', 'mountain', 'canoe', 'lantern', 'bear', 'raccoon', 'deer', 'hedgehog', 'butterfly', 'mushroom', 'coffee', 'dango', 'compass', 'map', 'sparkles', 'snail', 'beaver', 'fox', 'owl', 'wolf', 'guitar'];
  const wsBase = BASE.replace(/^http/, 'ws');
  const bots = [];
  for (let i = 0; i < NAMES.length; i++) {
    const bot = { name: NAMES[i], last: null };
    await new Promise((resolve) => { const open = () => {
      // Like a real phone: a keep-alive every 20 seconds, and rejoin with the saved key if the line drops.
      const ws = new WebSocket(`${wsBase}/ws/${code}?role=player`);
      bot.ws = ws;
      const hb = setInterval(() => { try { ws.send('{"t":"hb"}'); } catch (e) {} }, 20000);
      ws.onclose = () => { clearInterval(hb); if (bot.id && !bot.done) { st.drops = (st.drops || 0) + 1; setTimeout(open, 800); } };
      const sendIn = (data) => { try { ws.send(JSON.stringify({ t: 'input', data })); } catch (e) {} };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.t === 'hello') return ws.send(JSON.stringify(bot.id ? { t: 'rejoin', id: bot.id, key: bot.key } : { t: 'join', name: NAMES[i], avatar: AV[i % AV.length] }));
        if (m.t === 'joined') { if (!m.rejoined) { bot.id = m.id; bot.key = m.key; resolve(); } return; }
        if (m.t === 'error') { st.errors.push(NAMES[i] + ':' + m.code); return; }
        if (m.t !== 'msg') return;
        const s = m.data; bot.last = s;
        st.kinds[s.screen] = (st.kinds[s.screen] || 0) + 1;
        if (s.screen === 'final') st.finals++;
        const later = (ms, fn) => setTimeout(() => { if (bot.last === s) fn(); }, ms);
        const mine = /Your secret number: (\d+)/.exec(s.header || '');
        if (mine) numbers.set(NAMES[i], mine[1]);
        if (s.screen === 'choices') {
          const match = /^Your match: \S+ (\S+)\./.exec(s.prompt || '');
          later(match ? 1500 + Math.random() * 4000 : 300 + Math.random() * 1200, () => {
            let pick = Math.floor(Math.random() * s.options.length);
            if (match && numbers.has(match[1])) pick = s.options.indexOf(numbers.get(match[1]));
            if (s.skip && Math.random() < 0.08) return sendIn({ type: 'skip', round: s.round });
            sendIn({ type: 'pick', round: s.round, pick: Math.max(0, pick) });
          });
        } else if (s.screen === 'write') {
          later(500 + Math.random() * 1500, () => Math.random() < 0.15 ? sendIn({ type: 'write', round: s.round, auto: true }) : sendIn({ type: 'write', round: s.round, text: TYPED[(i + Math.floor(Math.random() * 4)) % TYPED.length] }));
        } else if (s.screen === 'slider') {
          later(400 + Math.random() * 2000, () => sendIn({ type: 'slider', round: s.round, value: Math.floor(Math.random() * 101) }));
        }
      };
    }; open(); });
    bots.push(bot);
    if (i === 5) await tv.screenshot({ path: `${OUT}/tv-01-lobby-filling.png` });
  }
  check(bots.length === N - 1, `${N} people joined (${N - 1} bots and a real phone)`);

  // The leader turns Faith questions off: nobody gets one from now on.
  await tv.click('.pill:has-text("Faith questions")');
  const faithLeft = await tv.evaluate(() => Object.values(BONFIRE_TV.prof).reduce((n, p) => n + p.queue.slice(p.at + 1).filter((qi) => BONFIRE.QUESTIONS[qi].c === 'faith').length, 0));
  check(faithLeft === 0, `turning Faith questions off takes them out of everyone's questions still to come (${faithLeft} left)`);
  // Reload the TV page while people are still answering: their answers come back, and the phones carry on.
  const sum = () => tv.evaluate(() => Object.values(BONFIRE_TV.prof).reduce((n, p) => n + Object.keys(p.answers).length, 0));
  const before = await sum();
  await tv.reload();
  await tv.click('text=Light the fire');
  await tv.waitForSelector('.lobby .code span', { timeout: 10000 });
  const sameCode = await tv.$$eval('.lobby .code span', (x) => x.map((y) => y.textContent).join(''));
  await tv.waitForTimeout(1500);
  const after = await sum();
  check(sameCode === code && after >= before && before > 0, `reloading the TV keeps the room and everyone's answers (${before} before, ${after} after)`);

  // The real phone answers its own questions.
  const phoneTurn = async () => {
    try {
      const head = (await phone.textContent('.header').catch(() => '')) || '';
      const mine = /Your secret number: (\d+)/.exec(head);
      if (mine) numbers.set('Joy', mine[1]);
      if (await phone.$('input.write:not([disabled])')) { await phone.fill('input.write', 'Pancakes at midnight'); await phone.click('text=Send'); return; }
      if (await phone.$('input.slider:not([disabled])')) { await phone.click('text=Lock it in!'); return; }
      const opts = await phone.$$('.choices:not(.done) button');
      if (opts.length) {
        const prompt = (await phone.textContent('.prompt')) || '';
        const match = /^Your match: \S+ (\S+)\./.exec(prompt), want = match && numbers.get(match[1]);
        if (match) await phone.waitForTimeout(1500);
        let k = Math.floor(Math.random() * opts.length);
        if (want) for (let j = 0; j < opts.length; j++) if (((await opts[j].textContent()) || '').includes(want)) k = j;
        await opts[k].click();
      }
    } catch (e) {}
  };
  const pump = setInterval(phoneTurn, 700);

  // Wait for the questions to be answered, then start.
  for (let i = 0; i < 90; i++) {
    const done = await tv.evaluate(() => Object.values(BONFIRE_TV.prof).filter((p) => p.done).length);
    if (done >= N - 1) break;
    await tv.waitForTimeout(1000);
  }
  await tv.waitForTimeout(6500); // a ticker fact
  await tv.screenshot({ path: `${OUT}/tv-02-lobby-full.png` });
  const answered = await tv.evaluate(() => Object.values(BONFIRE_TV.prof).map((p) => Object.keys(p.answers).length));
  check(answered.length === N && answered.filter((n) => n >= 6).length >= N - 2, `everyone answered their questions (${answered.join(',')})`);
  const ticker = await tv.textContent('.ticker');
  check(/ of \d+ said /.test(ticker || ''), `the lobby shows a live fact about the room: "${ticker}"`);
  await tv.click('.start');

  // Watch the show, screenshotting every new scene and state.
  const seen = new Set();
  let last = Date.now();
  while (Date.now() - last < 200000) {
    const k = await tv.evaluate(() => `${document.querySelector('.stagebox').dataset.scene}:${BONFIRE_TV.phase}`).catch(() => '');
    if (k && !seen.has(k)) {
      seen.add(k); last = Date.now();
      await tv.waitForTimeout(k.includes('reveal') ? 2200 : 1200);
      await tv.screenshot({ path: `${OUT}/tv-${String(seen.size + 2).padStart(2, '0')}-${k.replace(/:/g, '-')}.png` });
      if (/kindred|who|room|truths/.test(k)) await phone.screenshot({ path: `${OUT}/phone-${k.replace(/:/g, '-')}.png` });
      if (k.startsWith('end')) break;
    }
    await tv.waitForTimeout(400);
  }
  clearInterval(pump);
  const scenes = [...seen].join(' ');
  check(/who:/.test(scenes) && /room:/.test(scenes) && /kindred:/.test(scenes) && /truths:/.test(scenes), 'all four mini-games played');
  check(/report:/.test(scenes) && /end:/.test(scenes), 'the Campfire Report and the podium came up');
  await tv.waitForTimeout(3000);
  await tv.screenshot({ path: `${OUT}/tv-99-end.png` });
  await phone.screenshot({ path: `${OUT}/phone-99-final.png` });
  check(st.finals >= N - 2, `every bot got its final card (${st.finals})`);
  const scored = await tv.evaluate(() => Object.keys(BONFIRE_TV.scores).length);
  check(scored >= N / 2, `points were scored (${scored} players)`);
  const found = await tv.$$eval('.match.found', (m) => m.length).catch(() => 0);
  console.log(`       screens seen by bots: ${JSON.stringify(st.kinds)} · errors: ${st.errors.join(',')} · ${Math.round((Date.now() - t0) / 1000)}s · kindred cards lit before the end: ${found}`);
  check(!st.errors.length, 'no bot got an error');
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(`\n${ok} ok, ${bad} failed`);
  console.log(`       dropped lines that rejoined: ${st.drops || 0}`);
  for (const bot of bots) { bot.done = true; try { bot.ws.close(); } catch (e) {} }
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
