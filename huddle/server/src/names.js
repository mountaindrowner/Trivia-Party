/* Nickname rules for Holy Huddle. A name shows on the TV in front of a room of kids, so it is checked before it is
   accepted: 1–12 characters of letters, numbers, spaces, hyphens and apostrophes, and no bad or mean words, including
   spelled-around ones (sh1t, f u c k, fuuuck) and ones spelled with lookalike letters (ɡ ı ƒ). A refusal never says
   which word matched. Probe it with real answers before adding a word: names.js is also run on Bluff answers. */

const MAX_LEN = 12;
const ALLOWED = /^[\p{Script=Latin}0-9 '-]+$/u;

// Matched anywhere inside the squashed name ("xXshitXx" is caught).
const STRONG = [
  "fuck", "fuk", "fck", "shit", "cunt", "bitch", "biatch", "whore", "slut", "nigg", "faggot", "porn", "penis",
  "vagina", "dildo", "nazi", "hitler", "retard", "molest", "boob", "titty", "tits", "horny", "jizz", "wank", "twat",
  "bastard", "asshole", "pussy", "dick", "sexy", "kys", "suicide",
  // Spelled-around versions.
  "phuck", "phuk", "fvck", "fcuk", "fxck", "cnut", "nibba", "nigha", "azzhole", "tranny", "seggs", "kkk",
];
// Matched only as a whole word, because they hide inside ordinary names and words
// (glass, Cassie, Hellen, Essex, grapes, peacock, cucumber, torpedo, Marsellus).
const WORDS = ["ass", "hell", "damn", "sex", "crap", "piss", "satan", "devil", "kill", "die", "dead", "hate", "kms", "gay",
  "loser", "stupid", "idiot", "dumb", "ugly", "fat", "rape", "cock", "cum", "arse", "pedo", "fag", "thot"];
// "…ass" insults (dumbass, jackass, fatass), without catching glass, bass, grass, class, Picasso.
const ASS_INSULT = /(?:dumb|jack|fat|bad|smart|lard|kick|wise|dip|dum)a+s+$/;
// Phrases that are fine word by word but not together.
const PHRASES = [/\bkill (?:your ?self|ur ?self|yo ?self|u)\b/, /\bgo die\b/, /\b(?:you|u) should die\b/, /\bi hate (?:you|u)\b/];

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", 9: "g", "@": "a", $: "s", "!": "i", "|": "l", "+": "t" };

/** Lowercase, undo leetspeak and accents. */
const plain = (s) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[0-9@$!|+]/g, (c) => LEET[c] || c);
/** After `plain`, every letter should be plain a–z. Latin lookalikes that don't break down (ɡ ı ƒ Đ ʃ) are refused,
    since they spell words past the filter; ordinary accents (José, Zoë, Ñoño) break down and pass. */
const lookalike = (p) => /[^ -~]/.test(p); // anything but printable ASCII
/** "f.u.c.k", "f-u-c-k", "f u c k" → "fuck" (runs of single letters joined across anything that isn't a letter). */
const joinSingles = (p) => p.replace(/\b([a-z])[^a-z]+(?=[a-z]\b)/g, "$1");
/** "fuuuck" → "fuck". */
const dedupe = (s) => s.replace(/(.)\1+/g, "$1");

/** Returns { ok: true, name } with the tidied name, or { ok: false, reason } where reason is "empty", "long", "chars" or "word". */
export function checkName(raw) {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  const name = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, reason: "empty" };
  if ([...name].length > MAX_LEN) return { ok: false, reason: "long" };
  if (!ALLOWED.test(name)) return { ok: false, reason: "chars" };
  const p = plain(name);
  if (lookalike(p)) return { ok: false, reason: "chars" };
  const squashed = p.replace(/[^a-z]/g, "");
  const variants = [squashed, dedupe(squashed)];
  if (STRONG.some((w) => variants.some((v) => v.includes(w)))) return { ok: false, reason: "word" };
  const words = p.split(/[^a-z]+/).filter(Boolean).flatMap((w) => [w, dedupe(w)]);
  // A name typed with spaces between the letters ("a s s") is checked as one word too.
  if (/^(?:[a-z] )+[a-z]$/.test(p)) words.push(squashed, dedupe(squashed));
  if (words.some((w) => WORDS.includes(w) || ASS_INSULT.test(w))) return { ok: false, reason: "word" };
  return { ok: true, name };
}

/* Typed answers (Spark Wars' Bluff the Bible): short text that shows on the TV. Same filter as names, but Bible words
   are fine here ("the devil", "the Dead Sea", "to kill a giant"), and so is a little punctuation. No emoji. */
const TEXT_MAX = 40;
const TEXT_ALLOWED = /^[\p{Script=Latin}0-9 '\-.,!?&:()/"]+$/u;
const TEXT_WORDS = ["ass", "damn", "sex", "crap", "piss", "kms", "gay", "loser", "stupid", "idiot", "dumb", "ugly", "rape", "cock",
  "cum", "arse", "pedo", "fag", "kys", "stfu", "wtf", "omfg", "lmfao", "thot"];
// Real Bible words a strong word hides inside (Exodus 25: the ark is made of shittim wood).
const BIBLE_WORDS = ["shittim"];
// Short words that are words on their own, so "finish it" isn't read as one word.
const SHORT_WORDS = new Set(("a i am an as at be by do go he if in is it me my no of oh on or ox so to up us we " +
  "all and any are ask bad big boy but can cat cry cup day did dog dry ear eat end eye far fat few fig fly for fox fun " +
  "god got had has her him his hot how ice ink its jar joy key kid lad law lay led let lie low mad man map may men " +
  "mom dad new not now oak off oil old one our out owl own pig pit pot put ran ram rat raw red rod row run sad sat " +
  "saw say sea see set she sin sit six sky son sun tax ten the tie toe too top two use vow war was way wet who why " +
  "win yes yet you").split(" "));

/** Returns { ok: true, text } or { ok: false, reason } where reason is "empty", "long", "chars" or "word". */
export function checkText(raw) {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  const text = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty" };
  if ([...text].length > TEXT_MAX) return { ok: false, reason: "long" };
  if (!TEXT_ALLOWED.test(text)) return { ok: false, reason: "chars" };
  const p = plain(text);
  if (lookalike(p)) return { ok: false, reason: "chars" };
  const words = p.split(/[^a-z]+/).filter(Boolean);
  // Strong words anywhere inside a word, across spelled-out letters ("f.u.c.k"), or across a word split in two
  // ("sh it", "nig ga", "hit ler"). A split is only joined when one side is a short piece that isn't a word itself,
  // so ordinary answers ("finish it", "salt water") stay apart.
  const singles = joinSingles(p).split(/[^a-z]+/).filter(Boolean);
  const piece = (w) => w.length <= 3 && !SHORT_WORDS.has(w);
  const pairs = [];
  for (let i = 1; i < words.length; i++) if (piece(words[i - 1]) || piece(words[i])) pairs.push(words[i - 1] + words[i]);
  const pieces = [...words, ...singles].filter((w) => !BIBLE_WORDS.includes(w)).flatMap((w) => [w, dedupe(w)]);
  const joined = pairs.flatMap((w) => [w, dedupe(w)]);
  if ([...pieces, ...joined].some((w) => STRONG.some((s) => w.includes(s)))) return { ok: false, reason: "word" };
  if (pieces.some((w) => TEXT_WORDS.includes(w) || ASS_INSULT.test(w))) return { ok: false, reason: "word" };
  if (PHRASES.some((r) => r.test(words.join(" ")))) return { ok: false, reason: "word" };
  return { ok: true, text };
}
