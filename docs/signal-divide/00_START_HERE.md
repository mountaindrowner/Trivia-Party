# SIGNAL DIVIDE — start here

**A mobile-first, in-person social deduction game design for 12–15 players.**

This package is a **design and implementation specification**, not a playable application. It is intended for a web developer or AI coding assistant to build into an existing hosted site. The creator already has a link/hosting direction; this package concentrates on game rules, device logistics, screens, technical requirements, balancing, and test criteria.

## What is in this folder?

1. `01_MASTER_GAME_SPEC.md` — canonical product decisions, complete rules, room logic, mobile interaction, failure handling, original role deck, and scope.
2. `02_PLAYER_AND_HOST_SCREENS.md` — phone-by-phone UX, wireframes, sample copy, QR/room movement logistics, and accessibility.
3. `03_ENGINEERING_BLUEPRINT.md` — authoritative state machine, data structures, messaging contracts, fairness, persistence, identity, and privacy.
4. `04_BUILD_BRIEF_FOR_CODING_AI.md` — copy/paste developer handoff with priorities and acceptance criteria.
5. `05_HOST_CHEAT_SHEET.md` — printable, practical facilitation and troubleshooting guide.
6. `06_TEST_MATRIX_AND_SOURCES.md` — 12–15 player test matrix, adversarial cases, references and licensing notes.

## One-paragraph pitch

**Signal Divide** takes inspiration from *Two Rooms and a Boom* without copying its cards or artwork. A host displays a QR code on their phone. Twelve to fifteen players join on their own phones, each receiving a private faction/role and an assigned physical zone. Players speak, bluff, choose room leaders, and decide what they want to reveal. In three rounds (3:00, 2:00, 1:00), each leader sends 2, then 1, then 1 player to the opposite zone. A hidden **Beacon** must stay away from a hidden **Jammer** at the final exchange. Phones automate assignment, timing, role display, leader votes, moves, and victory calculation; human interaction remains the heart of the game.

## The three strongest decisions

- **Move players, not cards.** Basic play never swaps identities or role cards. Physical movement across the room is the exchange. Future cards that truly swap identities are optional and out of initial scope.
- **Show a phone card; don't require digital pairing.** First version: cover/reveal full role or show faction only, controlled from that player's own screen. A direct phone-to-phone consent-based share is a second-phase enhancement.
- **Use one online authoritative session.** The host phone is a control surface; it is *not* a server. Joining via QR and real-time synchronized play require a hosted backend and working phone internet access.

## Default settings

| Setting | Default |
|---|---|
| Participants | 12–15 **actual players**, including the host if host selects `Play too` |
| Spectating host | Allowed; does not count toward player limit |
| Rooms | Zone A and Zone B, physical locations within sight of appropriate supervision |
| Rounds | 3; 180, 120, 60 seconds |
| Players traded, **from each room**, at each exchange | 2, 1, 1 |
| Winning condition | Jammer and Beacon in same final zone => Static wins; otherwise Signal wins |
| Odd-player balancing | One neutral Forecaster at 13 or 15, who predicts the winner before final reveal |
| New players once started | Locked; no mid-game joins |
| Elimination | None |
| Screen requirements | Phones only; no projector or shared TV |

**Suggested first test:** 12 players, three rounds, only four card types (Beacon, Jammer, Signal Member, Static Member); then run 13 players with the Forecaster.

## Trademark and source distinction

*Two Rooms and a Boom* belongs to its creators/publisher. This package is an **original prototype concept inspired by genre-level mechanics** for private use, not an official adaptation or an authorized reproduction. Use original names, art, card copy, interface, and rules prose. Seek permission or advice before representing it as licensed or releasing a near-identical commercial version. Links to source rules appear in `06_TEST_MATRIX_AND_SOURCES.md`.
