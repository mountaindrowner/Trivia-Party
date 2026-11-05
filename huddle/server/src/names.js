/* Nickname rules for Holy Huddle. A name shows on the TV in front of a room of kids, so it is checked before it is
   accepted: 1–12 characters of letters, numbers, spaces, hyphens and apostrophes, and no bad or mean words, including
   spelled-around ones (sh1t, f u c k, fuuuck). A refusal never says which word matched. */

const MAX_LEN = 12;
const ALLOWED = /^[\p{Script=Latin}0-9 '\-]+$/u;

// Matched anywhere inside the squashed name ("xXshitXx" is caught).
const STRONG = [
  "fuck", "fuk", "fck", "shit", "cunt", "bitch", "biatch", "whore", "slut", "nigg", "faggot", "porn", "penis",
  "vagina", "dildo", "nazi", "hitler", "retard", "molest", "boob", "titty", "tits", "horny", "jizz", "wank", "twat",
  "bastard", "asshole", "pussy", "dick", "sexy", "kys", "suicide",
];
// Matched only as a whole word, because they hide inside ordinary names and words
// (glass, Cassie, Hellen, Essex, grapes, peacock, cucumber, torpedo, Marsellus).
const WORDS = ["ass", "hell", "damn", "sex", "crap", "piss", "satan", "devil", "kill", "die", "dead", "hate", "kms", "gay",
  "loser", "stupid", "idiot", "dumb", "ugly", "fat", "rape", "cock", "cum", "arse", "pedo", "fag"];

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", 9: "g", "@": "a", $: "s", "!": "i", "|": "l", "+": "t" };

/** Lowercase, undo leetspeak and accents. */
const plain = (s) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[0-9@$!|+]/g, (c) => LEET[c] || c);
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
  const squashed = p.replace(/[^a-z]/g, "");
  const variants = [squashed, dedupe(squashed)];
  if (STRONG.some((w) => variants.some((v) => v.includes(w)))) return { ok: false, reason: "word" };
  const words = p.split(/[^a-z]+/).filter(Boolean).flatMap((w) => [w, dedupe(w)]);
  // A name typed with spaces between the letters ("a s s") is checked as one word too.
  if (/^(?:[a-z] )+[a-z]$/.test(p)) words.push(squashed, dedupe(squashed));
  if (words.some((w) => WORDS.includes(w))) return { ok: false, reason: "word" };
  return { ok: true, name };
}
