# SIGNAL DIVIDE — Quality Assurance and Research Notes

## 1. Pre-launch player count matrix

| Scenario | Expected role deck | Zone sizes | Required outbound per zone |
|---|---|---|---|
| 12 | Beacon + 5 Signal, Jammer + 5 Static | 6/6 | 2, 1, 1 |
| 13 | Above + Forecaster | 7/6 | 2, 1, 1 |
| 14 | Beacon + 6 Signal, Jammer + 6 Static | 7/7 | 2, 1, 1 |
| 15 | Above + Forecaster | 8/7 | 2, 1, 1 |

Host-as-player counts toward `N`; spectator host never counts. 11 active players cannot start; 16 cannot start under the initial mode without changing cap/role logic.

## 2. Core flow acceptance tests

- [ ] QR from an iPhone is scan-able using a second iPhone and Android phone; manual code works.
- [ ] Same code cannot allow strangers to join after `Lock & deal`.
- [ ] Host joining as player receives exactly one normal card and zone.
- [ ] Host in spectator mode receives no private card.
- [ ] Four player counts produce expected Signal/Static/Forecaster totals in 1,000 seeded simulated deals each.
- [ ] Roles and zones are shuffled independently, not tied to join order.
- [ ] Normal game screen does not expose secret faction by background/theme text or network payload.
- [ ] Hold-to-peek hides on release, browser tab change, and screen wake.
- [ ] Only intentional `Show Faction` or `Show Full Card` reveals requested details.
- [ ] A player cannot elect leader in the opposite zone.
- [ ] A candidate with exact half votes does **not** become leader; floor(n/2)+1 required.
- [ ] An outgoing leader cannot choose themselves.
- [ ] Selections of wrong count, duplicate IDs, or non-zone members are rejected server-side.
- [ ] Both rooms selecting/locking simultaneously cannot double-exchange.
- [ ] First exchange sends two each way; later exchanges one each way; zone counts stay balanced.
- [ ] Transferred players keep the **same private role**.
- [ ] Timer is derived from server time, survives host or player refresh, resumes accurately after pause.
- [ ] No exchange occurs before round expiry, even if leaders preselect early.
- [ ] Both leaders' lists are locked before their opposite room learns the other outgoing names.
- [ ] Missing-leader timeout selects only eligible legal names without duplicates.
- [ ] A leader with the Beacon or Jammer card stays hidden in public roster.
- [ ] At final reveal, Jammer and Beacon same zone => Static; different => Signal.
- [ ] Forecaster cannot see result before submitting; wrong or no prediction doesn't change team winner.
- [ ] 12 and 14 player games skip Forecaster phase entirely.
- [ ] Rematch resets vote, timer, locations and selections; creates newly shuffled roles.

## 3. Adversarial and resilience tests

- [ ] A player sends fake `SELECT_OUTBOUND` request while not leader; backend rejects it.
- [ ] A player asks API for other zone's role data; backend rejects it.
- [ ] Host admin attempts to query full live deck; backend never returns it.
- [ ] A player forcibly sends `PREDICT_WINNER` at 12-player count or outside prediction phase; rejected.
- [ ] Simultaneous leader replacement and lock: server produces exactly one valid leader and selection.
- [ ] Repeat/duplicate WebSocket commands produce no second transfer.
- [ ] 1 player loses Wi-Fi for 45 seconds, refreshes, and resumes same role, zone and player ID.
- [ ] Host phone battery dies but a re-authenticated host control device can restore session, without reset.
- [ ] A stale client still displays `Zone A` after a transfer; correct on reconnect from server snapshot.
- [ ] Screen is backgrounded while full role view is visible; card is covered on resume.
- [ ] Two players try identical names: prompt correction; prevent identity collisions.
- [ ] Attackers guess short codes repeatedly: join/rate limit works, public code is not a host credential.
- [ ] Invalid custom network messages and malformed text do not crash engine or run HTML/JS.
- [ ] Browser goes to sleep; countdown catches up using server deadline rather than remaining frozen.
- [ ] Unreconciled physical transfer triggers host pause/correction before moving to next round.
- [ ] Host disconnects at selection timeout; server handles timeout and maintains state.
- [ ] An aborted game cannot reveal a mistaken winner as if it were completed normally.

## 4. Playtest observation checklist

For real 12–15-person tests, observe:

- Actual time from QR display to all 12–15 participants ready; number requiring manual room code.
- Whether people understand `Zone A/B` is **not** their hidden faction.
- Whether players hold phone long enough to show cards, and whether privacy cover hides naturally.
- Whether players look at one another more than at the phone during discussion.
- Whether leader voting interrupts conversation or enables it.
- Whether the move phase takes longer than expected; do not run next timer while people walk.
- How often someone misses their transfer prompt due to app switching/screen lock.
- Whether 3/2/1 discussion clock is long enough. Increase only after baseline tests.
- Whether neutral Forecaster makes 13/15 more fun or confusing.
- Whether 15 people in a single hall can stay separated enough to create meaningful secrets.

## 5. Comparison: what was borrowed from the genre and why

| Reference | Relevance to this project | Deliberate decision |
|---|---|---|
| *Two Rooms and a Boom* | Two physical rooms, timed conversations, leaders, hostages, hidden teams and reveals | Best core reference for 12–15, but original names/art/cards not copied |
| *One Night Ultimate Werewolf* | Mobile-friendly quick roles and short total playtime | Useful pacing reference, but typical 3–10-player range is below target |
| *Blood on the Clocktower* | Strong social deduction with many players | Too much narration/storytelling for first lightweight rainy-day app |
| *Mafia / Werewolf* | Easy to teach to an indoor crowd | Avoid player eliminations and lengthy referee tasks |
| *Jackbox* | Link/code-based join and private phone actions | Adopt entry experience; no TV needed |

## 6. Sources consulted (links and what was checked)

1. **Publisher: Tuesday Knight Games — official Two Rooms and a Boom product/rules overview.** Confirms basic objective, two separate rooms, leaders, three rounds, no moderator, 6–30 player count, free print-and-play link.  
   https://www.tuesdayknightgames.com/products/two-rooms-and-a-boom
2. **Two Rooms and a Boom rulebook v4.0 (hosted rulebook PDF).** Confirms base 3/2/1-minute rounds, 11–21-player outbound schedule 2/1/1, separate role cards vs physical hostages, leader rules, 13/15 odd-player-style neutral role precedent.  
   https://cdn.1j1ju.com/medias/ef/63/0c-two-rooms-and-a-boom-rulebook.pdf
3. **Publisher playsets page.** Describes starter packs for groups of 6–17 and recognizes church/school icebreaker groups; confirms the importance of color sharing for 11+ people.  
   https://www.tuesdayknightgames.com/pages/two-rooms-and-a-boom-music-playsets
4. **UltraboardGames rules transcription.** Useful cross-check for basic leaders, hostage transfers, neutral gambler and 11+ color reveals.  
   https://www.ultraboardgames.com/two-rooms-and-a-boom/game-rules.php
5. **Kaboom community digital adaptation.** An existing browser-based online adaptation of *Two Rooms and a Boom* for in-person phones; useful as a comparison or last-minute fallback, but the live feature set and support were not independently tested.  
   https://www.playkaboom.com/
6. **Feint:** browser-hosted social games with join code/QR and private role delivery; reference for an understandable join pattern, not a dependency.  
   https://www.feint.games/

*Research checked November 12, 2026. Source links are provided for reference only. Do not bundle third-party PDF, artwork, game text, brand assets, or source code without appropriate rights. This package intentionally contains independently written instructions and original prototype names.*

## 7. Rights / positioning

The package is neither endorsed by nor affiliated with Tuesday Knight Games. Rules for a private lookalike prototype are not automatically a license to distribute branded card artwork, published character text, or official PDF files. For public release, use independently authored wording and art, and seek appropriate rights clearance if representing the software as an official or direct digital edition.
