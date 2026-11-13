# SIGNAL DIVIDE — Copy/Paste Build Brief for Developer or Coding AI

Use this as an initial implementation request. The **canonical game rules** are in `01_MASTER_GAME_SPEC.md`; the **technical state machine** is in `03_ENGINEERING_BLUEPRINT.md`. Read both before coding.

---

## Build request

Build **Signal Divide**, a responsive, mobile-browser multiplayer social-deduction game for **12–15 in-person players** and an optional spectator host. Players join an online room by scanning a QR code from the host's phone or typing a short room code. Everyone uses only their own phone. Phones run logistics and hidden cards; humans talk face-to-face in **two physical zones**. Do not add a TV/projector requirement. Do not require accounts, email, or location permission.

### Gameplay in one sentence

Randomly assign everyone a secret Signal/Static/Forecaster card and physical Zone A/B, run discussion rounds of **180/120/60 seconds**, let each zone's leader choose **2/1/1 players to exchange**, and determine whether hidden **Beacon** and **Jammer** end up in the same physical zone (Static victory) or different zones (Signal victory).

### Exact deck setup

- 12 players: Beacon + 5 Signal Members; Jammer + 5 Static Members.
- 13: same plus one gray Forecaster.
- 14: Beacon + 6 Signal Members; Jammer + 6 Static Members.
- 15: same plus one gray Forecaster.
- Forecaster independently predicts winning faction **after last transfer before public reveal**.
- Assign roles and zones independently with secure server-side randomness; zone sizes 6/6, 7/6, 7/7, 8/7.
- Host option `I am also playing` includes host in number; spectators do not receive cards or count.

### User experience

Host creates -> displays QR/code -> players join/nickname/ready -> host locks lobby -> players see zone -> everyone physically moves -> private role card remains covered until `Hold to Peek` -> each room has provisional leader -> players can replace leader by a strict majority of current room votes -> discussion timer -> leaders select exact outgoing count excluding leader -> server locks both lists and swaps zone memberships atomically -> people move and confirm arrival -> next round -> Forecaster predicts if present -> reveal winner/roles -> rematch.

Player UI has large timer, neutral zone label, own zone's roster, leader name, `My Card`, `Show Faction`, `Show Full Card`, `Hide Now`, leader nomination/voting, and transfer instructions. Manual reveals occur only on the card owner's own screen. No permanent face-up card after tab switch/backgrounding. Optional later: consent-based device-to-device verified sharing in same room. **No card-ownership swaps in V1.**

### Non-negotiable architecture

Use a **hosted authoritative multiplayer backend** (WebSockets/serialized game state) with a responsive frontend. Host phone is a dashboard, **not** the HTTP server. Backend owns roles, clock, election, submissions, room swaps, result and persistence. Never send the full hidden role mapping to regular players or the host while the game is running. QR includes only public join information. Secure private tokens for hosts/players, reconnect after refresh, event idempotency, and server-sanitized per-player state views. Lobby must reject late joins and prevent duplicate player IDs/names.

### Round behavior

First round 3:00 / two outbound from each zone; second 2:00 / one; third 1:00 / one. Leaders can preselect in the last 30 seconds; lock at timer end. Both rooms lock independently before atomic transfer. Give an unresponsive leader a visible 20-second grace, then server selects legal outgoing names randomly (or host pauses). Leaders cannot move unless leadership is changed first. All people confirm physical location before next countdown. After final transfer and arrival, only Forecaster prediction remains before victory reveal.

### Reliability

Works on iOS Safari and Android Chrome. Show reconnect state; never silently re-deal after refresh or backend restart; pause/resume based on authoritative server deadline; host recovery capability; host emergency corrections logged visibly. A missing participant remains in the deck — stop or abort instead of auto removing them. Provide readable high-contrast UI with faction names/icons in addition to colors. No essential audio dependency.

### Security and trust

Every mutation checks actor identity, zone membership, role privilege, current phase, and game revision. No cross-room sharing. No hidden state in public client payloads or inspectable page data. Role reveals must require intentional action, and hide on page visibility loss. Prevent host-console privilege from revealing the deck before completion. Avoid collecting unnecessary personal data.

### Deliver incrementally

**Milestone A — Lobby & assignment:** join by code/QR, 12–15 deck, zone assignment, covered private cards, private sanitized state. Test counts 12, 13, 14, 15.

**Milestone B — Actual game:** zone leaders, majority votes, server timer, 2/1/1 outbound, atomic cross-zone exchanges, move confirmation, results including neutral.

**Milestone C — Reliability & polish:** disconnect/rejoin, host pause/recovery, game revision idempotency, responsive layout, timeouts, tests, rematch, accessibility.

**Later only (separate feature flag):** verified in-app share, special role powers, 5-round preset, genuine role swaps.

### Required developer deliverables

1. Working web UI for host and players at phone widths.
2. Backend realtime match engine with persistence suitable to chosen hosting.
3. QR join path plus fallback manual code.
4. Automated game-engine tests and browser-level critical-flow tests.
5. README showing exact run/deploy process for chosen stack; environment variables; network requirement; recovery behavior.
6. Sample deterministic test harness or seeded test mode **for local development only**; cryptographic randomness in production.
7. Clear note that this is a new, unlicensed game inspired by a genre reference; do not use third-party game art/card copy.

### Don't do these things

- Do **not** build a single-device turn-based app where players pass the host phone around.
- Do **not** require all players to download native apps.
- Do **not** tell me that phones can synchronize offline by scanning a QR without a backend.
- Do **not** use color to show the secret faction in the normal neutral-zone game screen.
- Do **not** let host-player gain hidden cards through admin endpoints.
- Do **not** allow leaders to exchange themselves or skip required slots.
- Do **not** treat exchanging rooms and swapping role cards as the same mechanic.
- Do **not** silently remove or redeal a participant after a network loss.

### Definition of done

Run one real session with **15 people**: one phone displays QR, all join, everyone receives correct independent role/zone, leaders vote and exchange 2/1/1, nobody's role changes when moving, everyone reaches a correct outcome, Forecaster can predict, and a disconnected phone resumes without changing role. Repeat with 12, 13, and 14. Confirm that neither the ordinary player API nor the live host API leaks the complete deck.

---

## Notes for implementation planning

The first playable version should be visually appealing but simple, with very little on-screen reading while the discussion clock runs. Avoid expanding scope before the authoritative transfers work. The backend is more important than visual animations; privacy, leadership, and network restoration are the hard problems.
