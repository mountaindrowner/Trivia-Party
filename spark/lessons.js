/* Spark Wars: Spark's own curriculum, "The Church Is Here" (40 lessons, Acts to Revelation, ESV), for any game that
   asks questions. The questions are in spark/data/lessons/ (15 per lesson, with the lesson's Gospel Anchor).

   Pick a lesson and how to mix it:
     This week   the lesson first, then earlier lessons from the same book (so a long game doesn't repeat too soon)
     Whole book  every lesson in that book, up to this one
     All so far  every lesson from 1 to this one, this lesson first */
SW.lessons = (() => {
  const MIXES = [["week", "This week"], ["book", "Whole book"], ["sofar", "All so far"]];
  const list = () => ((window.SPARK_DATA && SPARK_DATA.LESSONS) || []).slice().sort((a, b) => a.n - b.n);

  /** { name, sub, first: [questions to ask first], then: [the rest], lesson } for the chosen lesson and mix. */
  function pool(prefs) {
    const all = list();
    if (!all.length) return null;
    const L = all.find((l) => l.n === prefs.lesson) || all[0];
    const qs = (ls) => ls.flatMap((l) => l.q.map((q) => ({ ...q, lesson: l.n, cat: `Lesson ${l.n}` })));
    const earlier = all.filter((l) => l.n < L.n && (prefs.lessonMix === "sofar" || l.book === L.book));
    const name = `Lesson ${L.n}: ${L.title}`;
    if (prefs.lessonMix === "book") return { name: `${L.book}, lessons ${earlier.concat(L).map((l) => l.n).join(", ")}`, sub: L.book, first: qs(earlier.concat(L)), then: [], lesson: L };
    if (prefs.lessonMix === "sofar") return { name: `Lessons 1–${L.n}`, sub: `Everything through ${name}`, first: qs([L]), then: qs(earlier), lesson: L };
    return { name, sub: L.scripture, first: qs([L]), then: qs(earlier), lesson: L };
  }

  /** The lobby settings: which lesson (◀ ▶ through all of them) and how to mix it. */
  function settings(chips, prefs, stepper) {
    const all = list();
    if (!all.length) return [];
    const i = Math.max(0, all.findIndex((l) => l.n === prefs.lesson));
    const L = all[i];
    return [
      stepper("Lesson", `${L.n} · ${L.title}`, () => { prefs.lesson = all[(i + all.length - 1) % all.length].n; }, () => { prefs.lesson = all[(i + 1) % all.length].n; }),
      chips("Mix", MIXES, prefs.lessonMix || "week", (v) => { prefs.lessonMix = v; }),
    ];
  }

  /** The Gospel Anchor to end a game on (not for "All so far", which covers many lessons). */
  const anchor = (p, prefs) => (p && prefs.lessonMix !== "sofar" ? { title: `Lesson ${p.lesson.n}: ${p.lesson.title}`, text: p.lesson.anchor } : null);

  return { list, pool, settings, anchor, MIXES };
})();
