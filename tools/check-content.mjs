/* global THP, SPARK_DATA, SPARK_LINES, SPARK_VOICE, BONFIRE -- the game files this loads set these */
// Checks every piece of game content for mistakes a game would trip over: `npm run check:content`.
//   Trivia Holy Party: the questions and the final-race prompts.
//   Spark Wars: Bluff the Bible facts, Timeline sets, the curriculum lessons, Barnabas's lines and his recordings.
//   Bonfire Ice Breaker: the "about me" questions.
// It loads the same files the games load and exits with an error if anything is wrong.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
globalThis.THP = {};
const load = (rel) => require(path.join(ROOT, rel));

const problems = [];
const bad = (where, what) => problems.push(`${where}: ${what}`);
let checked = 0;

/* ---------- Trivia Holy Party ---------- */
for (const f of ["js/data.js", "js/data-modes.js", ...fs.readdirSync(path.join(ROOT, "js/more")).map((f) => "js/more/" + f)]) load(f);
const seenQ = new Map();
THP.QUESTIONS.forEach((q, i) => {
  checked++;
  const at = `THP question ${i} (lvl ${q.lvl}) "${String(q.q).slice(0, 50)}"`;
  if (!Number.isInteger(q.lvl) || q.lvl < 1 || q.lvl > 7) bad(at, "level should be 1 to 7");
  if (typeof q.q !== "string" || !q.q.trim()) bad(at, "no question text");
  if (!Array.isArray(q.a) || q.a.length !== 4) bad(at, "needs exactly 4 answers");
  else if (new Set(q.a.map((x) => String(x).toLowerCase())).size !== 4) bad(at, "two answers are the same");
  if (!q.ref) bad(at, "no Bible reference");
  if (seenQ.has(q.q)) bad(at, `same question as #${seenQ.get(q.q)}`);
  seenQ.set(q.q, i);
});
(THP.FINAL_PROMPTS || []).forEach((p, i) => {
  checked++;
  const at = `THP race prompt ${i} "${String(p.p).slice(0, 40)}"`;
  if (!Array.isArray(p.opts) || p.opts.length < 3) bad(at, "needs at least 3 options");
  else if (!p.opts.some((o) => o[1])) bad(at, "has no right option"); // (every option right is fine: "tap all that fit")
});

/* ---------- Spark Wars ---------- */
globalThis.SPARK_DATA = {};
load("spark/data/bluff.js");
load("spark/data/timeline.js");
for (const f of fs.readdirSync(path.join(ROOT, "spark/data/lessons")).sort()) load("spark/data/lessons/" + f);
load("spark/host-lines.js");
load("spark/voice/voice.js");

SPARK_DATA.BLUFF.forEach((b, i) => {
  checked++;
  const at = `Bluff fact ${i} "${b.q.slice(0, 50)}"`;
  if ((b.q.match(/___/g) || []).length !== 1) bad(at, "needs exactly one ___ blank");
  if (!b.a || !Array.isArray(b.accept) || !b.accept.includes(b.a.toLowerCase())) bad(at, "the answer (lowercase) should be in accept");
  if (!Array.isArray(b.lies) || b.lies.length !== 3) bad(at, "needs 3 house lies");
  else if (b.lies.some((l) => b.accept.includes(l.toLowerCase()))) bad(at, "a house lie is actually the answer");
  if (!b.ref) bad(at, "no reference");
});

SPARK_DATA.TIMELINE.forEach((s, i) => {
  checked++;
  const at = `Timeline set ${i} "${s.title}"`;
  if (!Array.isArray(s.items) || s.items.length < 5 || s.items.length > 7) bad(at, "needs 5 to 7 cards");
  else {
    if (s.items.some((x) => !x.t || x.t.length > 24)) bad(at, "a card label is missing or longer than 24 characters");
    if (new Set(s.items.map((x) => x.t)).size !== s.items.length) bad(at, "two cards are the same");
    if (s.items.some((x) => !x.ref)) bad(at, "a card has no reference");
  }
});

const lessons = SPARK_DATA.LESSONS.slice().sort((a, b) => a.n - b.n);
if (lessons.map((l) => l.n).join() !== Array.from({ length: 40 }, (_, i) => i + 1).join()) bad("Spark lessons", "should be lessons 1 to 40, each once");
const seenL = new Map();
for (const l of lessons) {
  const at = `Lesson ${l.n} "${l.title}"`;
  if (!l.book || !l.title || !l.scripture || !l.anchor) bad(at, "is missing its book, title, scripture or Gospel Anchor");
  if (!Array.isArray(l.q) || l.q.length !== 15) bad(at, "should have 15 questions");
  for (const q of l.q || []) {
    checked++;
    const qa = `${at}: "${String(q.q).slice(0, 50)}"`;
    if (!Array.isArray(q.a) || q.a.length !== 4) bad(qa, "needs exactly 4 answers");
    else {
      if (new Set(q.a.map((x) => x.toLowerCase())).size !== 4) bad(qa, "two answers are the same");
      if (q.a.some((x) => x.length > 60)) bad(qa, "an answer is longer than 60 characters (too long for a phone button)");
    }
    if (!q.ref) bad(qa, "no reference");
    if (seenL.has(q.q)) bad(qa, `same question as lesson ${seenL.get(q.q)}`);
    seenL.set(q.q, l.n);
  }
}

/* ---------- Bonfire Ice Breaker: the "about me" questions ---------- */
globalThis.BONFIRE = {};
load("bonfire/data/questions.js");
const seenB = new Set();
BONFIRE.QUESTIONS.forEach((q, i) => {
  checked++;
  const at = `Bonfire question ${i} "${String(q.q).slice(0, 50)}"`;
  if (!BONFIRE.CATS[q.c]) bad(at, `unknown category "${q.c}"`);
  if (!q.q || !q.q.trim()) bad(at, "no question text");
  if (q.t === "pair" && (!Array.isArray(q.a) || q.a.length !== 2)) bad(at, "a this-or-that needs exactly 2 options");
  else if (q.t === "pick" && (!Array.isArray(q.a) || q.a.length < 3 || q.a.length > 4)) bad(at, "a pick-one needs 3 or 4 options");
  else if (q.t === "yes" && !q.find) bad(at, "a yes/no needs `find` (how a yes reads)");
  else if (q.t === "text" && !q.hint) bad(at, "a typed answer needs a `hint`");
  else if (!["pair", "pick", "yes", "text"].includes(q.t)) bad(at, `unknown type "${q.t}"`);
  if ((q.a || []).some((x) => x.length > 32)) bad(at, "an option is longer than 32 characters (too long for a phone button)");
  if (seenB.has(q.q)) bad(at, "asked twice");
  seenB.add(q.q);
});
if (BONFIRE.QUESTIONS.filter((q) => q.core && q.t !== "text").length < 8) bad("Bonfire", "needs at least 8 core questions (the ones everyone answers)");

/* Barnabas: every line the code asks for exists; recordings exist for every line; recorded files exist. */
const code = ["spark/core.js", ...fs.readdirSync(path.join(ROOT, "spark")).filter((f) => f.endsWith(".js") && f !== "core.js" && f !== "host-lines.js").map((f) => "spark/" + f)]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const asked = new Set([...code.matchAll(/\b(?:sw\.say|host\.say)\(\s*"([\w.]+)"/g)].map((m) => m[1]));
for (const m of code.matchAll(/host:\s*"([\w.]+)"/g)) asked.add(m[1]);
for (const key of asked) if (!SPARK_LINES[key]) bad("Barnabas", `the code asks for line "${key}", which isn't in host-lines.js`);
for (const [key, items] of Object.entries(SPARK_LINES)) {
  items.forEach((it, i) => {
    checked++;
    const spoken = typeof it === "string" ? it : it.v || it.t;
    if (/\{(name|n|set)\}/.test(spoken)) bad(`Barnabas ${key}[${i}]`, "the recorded version can't say a name or number: give it a `v`");
    const clip = SPARK_VOICE[key] && SPARK_VOICE[key][i];
    if (!clip) { bad(`Barnabas ${key}[${i}]`, "has no recording (run spark/voice/record.py --only " + key + ")"); return; }
    for (const url of typeof clip === "string" ? [clip] : Object.values(clip)) if (!fs.existsSync(path.join(ROOT, "spark", url))) bad(`Barnabas ${key}[${i}]`, `${url} is missing`);
  });
}
const listed = new Set(Object.values(SPARK_VOICE).flat().flatMap((c) => (c && typeof c === "object" ? Object.values(c) : [c])).filter(Boolean).map((u) => path.basename(u)));
for (const f of fs.readdirSync(path.join(ROOT, "spark/voice/clips"))) if (!listed.has(f)) bad("Barnabas", `spark/voice/clips/${f} isn't used by any line (delete it, or re-run record.py)`);

console.log(`Checked ${checked} questions, facts, sets and lines.`);
if (problems.length) {
  console.log(`\n${problems.length} problem${problems.length > 1 ? "s" : ""}:`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("All content looks right.");
