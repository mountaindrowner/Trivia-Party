/* Lights Out: the rules. One night of wolves at camp, for 3 to 12 players, in the one-night style: everyone gets a
   secret card, a few cards have a job in the night (peek at a card, or swap two), then the camp gets a few minutes
   to talk and one vote. Nobody is knocked out halfway: everyone plays the whole round, and a round takes about ten
   minutes.

   The twist: cards can be swapped in the night, so you're whatever card you end up with, even if you don't know it.

   Pure functions, no page: the host page (night.js) uses them, and so does the test (tests/lights-out-rules.mjs).
   LIGHTS_OUT_RULES = { ROLES, ORDER, deck(n, easy), deal(ids, deck), resolve(game, actions), tally(votes, ids), outcome(...) } */
(function (root) {
  "use strict";
  /* team: "camp" (wins if a wolf is voted out), "wolf" (wins if no wolf is), "self" (Homesick: wins if voted out). */
  const ROLES = {
    wolf: { name: "Wolf", icon: "🐺", team: "wolf",
      goal: "Don't get caught. The wolves win if no wolf is voted out.",
      night: "You'll see who the other wolves are. If you're the only one, you can peek at one card in the middle." },
    raccoon: { name: "Raccoon", icon: "🦝", team: "wolf",
      goal: "You're not a wolf, but you're on their side. You win if no wolf is voted out, even if it's you!",
      night: "You'll see who the wolves are. They don't know about you." },
    counselor: { name: "Counselor", icon: "🔦", team: "camp",
      goal: "Find a wolf. The camp wins if a wolf is voted out.",
      night: "Shine your flashlight: look at one player's card, or at two cards in the middle." },
    sneak: { name: "Sneak", icon: "🤫", team: "camp",
      goal: "Find a wolf... unless you stole a wolf's card. Then you're a wolf now!",
      night: "Swap your card with someone else's, then look at your new card. You're that now." },
    prankster: { name: "Prankster", icon: "🧦", team: "camp",
      goal: "Find a wolf. The camp wins if a wolf is voted out.",
      night: "Swap two other players' cards. You don't get to look at them." },
    sleepwalker: { name: "Sleepwalker", icon: "😴", team: "camp",
      goal: "Find a wolf... if you're still on the camp's side. You won't know!",
      night: "You'll swap your card with one in the middle, without looking. You won't know what you are now." },
    owl: { name: "Night Owl", icon: "🦉", team: "camp",
      goal: "Find a wolf. The camp wins if a wolf is voted out.",
      night: "You wake up last and look at your own card again, so you'll know if someone swapped it." },
    bunkmate: { name: "Bunkmate", icon: "🛏️", team: "camp",
      goal: "Find a wolf. The camp wins if a wolf is voted out.",
      night: "You'll see who the other Bunkmate is. You can trust each other... at the start of the night." },
    homesick: { name: "Homesick", icon: "🏠", team: "self",
      goal: "You just want to go home. You win only if you get voted out!",
      night: "Nothing tonight. In the morning, act suspicious... but not too suspicious." },
    camper: { name: "Camper", icon: "🏕️", team: "camp",
      goal: "Find a wolf. The camp wins if a wolf is voted out.",
      night: "A quiet night. Just tap who you think the wolf is (it's only a hunch, nobody sees it)." },
  };
  /* The order the night's jobs happen in. Everyone taps at the same time; this is the order they're carried out. */
  const ORDER = ["wolf", "raccoon", "bunkmate", "counselor", "sneak", "prankster", "sleepwalker", "owl"];
  const TEAM_NAME = { camp: "The camp", wolf: "The wolves", self: "On your own" };
  const CENTER = ["Left", "Middle", "Right"];

  /** The cards for n players: n + 3 (three lie face down in the middle). The full deck adds a role or two per player
      count; the easy one keeps to wolves, a Counselor, a Prankster and campers (good for a first game). */
  function deck(n, easy) {
    n = Math.max(3, Math.min(12, n | 0));
    if (easy) {
      const d = ["wolf", "wolf", "counselor", "prankster"];
      if (n >= 10) d.push("wolf");
      while (d.length < n + 3) d.push("camper");
      return d;
    }
    const d = ["wolf", "wolf", "counselor", "sneak", "prankster", "camper"];
    if (n >= 4) d.push("owl");
    if (n >= 5) d.push("raccoon");
    if (n >= 6) d.push("homesick");
    if (n >= 7) d.push("camper");
    if (n >= 8) { d.splice(d.lastIndexOf("camper"), 1); d.push("bunkmate", "bunkmate"); }
    if (n >= 9) d.push("sleepwalker");
    if (n >= 10) d.push("wolf");
    if (n >= 11) d.push("camper");
    if (n >= 12) d.push("camper");
    return d;
  }
  const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /** Deal: { start: { id: role }, center: [3 roles] }. */
  function deal(ids, cards, rnd) {
    const s = shuffle(cards, rnd), start = {};
    ids.forEach((id, i) => { start[id] = s[i]; });
    return { start, center: s.slice(ids.length, ids.length + 3) };
  }

  const card = (r) => `${ROLES[r].icon} ${ROLES[r].name}`;
  const list = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);

  /** Carry out the night. `actions` = { id: { players: [ids], center: [0..2] } } (what each phone tapped; anything
      missing or wrong is ignored, except the Sleepwalker, who always swaps). `names` = { id: name }.
      Returns { final: { id: role }, center: [roles], learned: { id: [lines] }, story: [lines], hunch: { id: id } }. */
  function resolve(game, actions, names, rnd = Math.random) {
    const ids = Object.keys(game.start);
    const now = Object.assign({}, game.start), mid = game.center.slice();
    const learned = {}, story = [], hunch = {};
    const tell = (id, line) => { (learned[id] = learned[id] || []).push(line); };
    const name = (id) => names[id] || "Someone";
    const who = (role) => ids.filter((id) => game.start[id] === role);
    const act = (id) => actions[id] || {};
    const okPlayers = (id, n) => { const p = (act(id).players || []).filter((x, i, a) => ids.includes(x) && x !== id && a.indexOf(x) === i); return p.length >= n ? p.slice(0, n) : null; };
    const okCenter = (id, n) => { const c = (act(id).center || []).map(Number).filter((x, i, a) => x >= 0 && x <= 2 && Number.isInteger(x) && a.indexOf(x) === i); return c.length >= n ? c.slice(0, n) : null; };

    // Everyone with nothing to do tapped a hunch (just for fun at the end).
    for (const id of ids) { const p = okPlayers(id, 1); if (p && ["camper", "homesick", "bunkmate", "owl", "raccoon"].includes(game.start[id])) hunch[id] = p[0]; }

    const wolves = who("wolf");
    for (const id of wolves) {
      const others = wolves.filter((w) => w !== id).map(name);
      if (others.length) tell(id, others.length === 1 ? `The other wolf is ${others[0]}.` : `The other wolves are ${list(others)}.`);
      else {
        const c = okCenter(id, 1);
        if (c) { tell(id, `You're the only wolf. You peeked at the ${CENTER[c[0]].toLowerCase()} card in the middle: ${card(mid[c[0]])}.`); story.push(`${name(id)}, the only wolf, peeked at the ${CENTER[c[0]].toLowerCase()} middle card (${card(mid[c[0]])}).`); }
        else tell(id, "You're the only wolf. You didn't peek at the middle.");
      }
    }
    if (wolves.length > 1) story.push(`The wolves, ${list(wolves.map(name))}, saw each other.`);
    for (const id of who("raccoon")) {
      tell(id, wolves.length ? (wolves.length === 1 ? `The wolf is ${name(wolves[0])}.` : `The wolves are ${list(wolves.map(name))}.`) : "There are no wolves among the players! The wolf cards are all in the middle.");
      story.push(wolves.length ? `${name(id)}, the Raccoon, saw who the wolves were.` : `${name(id)}, the Raccoon, saw there were no wolves.`);
    }
    const bunks = who("bunkmate");
    for (const id of bunks) {
      const other = bunks.filter((b) => b !== id);
      tell(id, other.length ? `Your bunkmate is ${list(other.map(name))}.` : "The other Bunkmate card is in the middle. You're on your own.");
    }
    if (bunks.length > 1) story.push(`The bunkmates, ${list(bunks.map(name))}, saw each other.`);
    for (const id of who("counselor")) {
      const p = okPlayers(id, 1), c = okCenter(id, 2);
      if (p) { tell(id, `You shined your flashlight on ${name(p[0])}: ${card(now[p[0]])}.`); story.push(`${name(id)}, the Counselor, looked at ${name(p[0])}'s card (${card(now[p[0]])}).`); }
      else if (c) { tell(id, `You looked in the middle: ${card(mid[c[0]])} and ${card(mid[c[1]])}.`); story.push(`${name(id)}, the Counselor, looked at two middle cards (${card(mid[c[0]])} and ${card(mid[c[1]])}).`); }
      else tell(id, "You didn't look at anything.");
    }
    for (const id of who("sneak")) {
      const p = okPlayers(id, 1);
      if (!p) { tell(id, "You didn't swap. You're still the Sneak, on the camp's side."); continue; }
      const t = p[0];
      [now[id], now[t]] = [now[t], now[id]];
      const team = ROLES[now[id]].team;
      tell(id, `You swapped cards with ${name(t)}. You're now: ${card(now[id])}.` + (team === "wolf" ? " You're on the wolves' side now!" : team === "self" ? " Now you want to get voted out!" : ""));
      story.push(`${name(id)}, the Sneak, swapped cards with ${name(t)}, and became ${card(now[id])}.`);
    }
    for (const id of who("prankster")) {
      const p = okPlayers(id, 2);
      if (!p) { tell(id, "You didn't pull a prank."); continue; }
      [now[p[0]], now[p[1]]] = [now[p[1]], now[p[0]]];
      tell(id, `You swapped ${name(p[0])}'s and ${name(p[1])}'s cards.`);
      story.push(`${name(id)}, the Prankster, swapped ${name(p[0])}'s and ${name(p[1])}'s cards.`);
    }
    for (const id of who("sleepwalker")) {
      const c = okCenter(id, 1) || [Math.floor(rnd() * 3)];
      [now[id], mid[c[0]]] = [mid[c[0]], now[id]];
      tell(id, `You sleepwalked and swapped your card with the ${CENTER[c[0]].toLowerCase()} card in the middle. You don't know what you are now!`);
      story.push(`${name(id)}, the Sleepwalker, swapped with the ${CENTER[c[0]].toLowerCase()} middle card, and became ${card(now[id])}.`);
    }
    for (const id of who("owl")) {
      tell(id, now[id] === "owl" ? "You checked your card at the end of the night: still 🦉 Night Owl." : `You checked your card at the end of the night. It changed! You're now: ${card(now[id])}.`);
      if (now[id] !== "owl") story.push(`${name(id)}, the Night Owl, woke up as ${card(now[id])}.`);
    }
    for (const id of ids) {
      const r = game.start[id];
      if (r === "camper") tell(id, hunch[id] ? `A quiet night. Your hunch was ${name(hunch[id])}.` : "A quiet night.");
      if (r === "homesick") tell(id, "You just want to go home. Get yourself voted out!");
    }
    if (!story.length) story.push("Nobody did anything at all. A very quiet night.");
    return { final: now, center: mid, learned, story, hunch };
  }

  /** The vote: `votes` = { voter: target }. Whoever gets the most votes is out (all of them, on a tie), but only if
      somebody got more than one vote. Returns { count: { id: n }, out: [ids], top }. */
  function tally(votes, ids) {
    const count = {};
    for (const id of ids) count[id] = 0;
    for (const [v, t] of Object.entries(votes)) if (ids.includes(v) && ids.includes(t) && v !== t) count[t]++;
    const top = Math.max(0, ...Object.values(count));
    return { count, top, out: top > 1 ? ids.filter((id) => count[id] === top) : [] };
  }

  /** Who won, from the cards everyone ended with. Returns { winners: [ids], camp, wolves, homesick, headline, kind }. */
  function outcome(final, out, names) {
    const ids = Object.keys(final), name = (id) => names[id] || "Someone";
    const team = (id) => ROLES[final[id]].team;
    const wolvesHere = ids.filter((id) => final[id] === "wolf");
    const wolfOut = out.some((id) => final[id] === "wolf");
    const homesickOut = out.filter((id) => final[id] === "homesick");
    let camp, wolves, kind, headline;
    if (wolvesHere.length) {
      camp = wolfOut;
      wolves = !wolfOut && !homesickOut.length;
      kind = camp ? "camp" : wolves ? "wolf" : "homesick";
    } else {
      // No wolves among the players: the camp wins only by trusting each other (nobody voted out).
      camp = out.length === 0;
      wolves = false;
      kind = camp ? "camp" : homesickOut.length ? "homesick" : "nobody";
    }
    // The Raccoon wins with the wolves; with no wolves around, if somebody else (not Homesick) is voted out.
    const raccoonWins = (id) => (wolvesHere.length ? wolves : out.length > 0 && !out.includes(id) && !homesickOut.length);
    const winners = ids.filter((id) => (team(id) === "camp" && camp) || (final[id] === "wolf" && wolves) || (final[id] === "raccoon" && raccoonWins(id)) || (final[id] === "homesick" && out.includes(id)));
    if (kind === "camp") headline = (wolvesHere.length ? "The camp wins! 🏕️" : "There were no wolves... and you trusted each other. The camp wins! 🏕️")
      + (homesickOut.length ? ` And ${list(homesickOut.map(name))} got to go home.` : "");
    else if (kind === "wolf") headline = "The wolves win! 🐺";
    else if (kind === "homesick") headline = `${list(homesickOut.map(name))} got to go home! 🏠`;
    else headline = `There were no wolves! You voted out ${list(out.map(name))} for nothing. 😬`;
    return { winners, camp, wolves, homesick: homesickOut, kind, headline };
  }

  const api = { ROLES, ORDER, TEAM_NAME, CENTER, deck, deal, resolve, tally, outcome, card, list, shuffle };
  root.LIGHTS_OUT_RULES = api;
})(globalThis);
