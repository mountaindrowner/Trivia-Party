# SIGNAL DIVIDE — Master Game Design Specification

**Version:** 1.0 • **Intent:** Mobile browser game for 12–15 players, in person • **Playtime:** 6 minutes of timed discussion plus exchange/setup time • **Tone:** Accessible, exciting, nonviolent, suitable for mixed-age church groups.

## 1. Design vision

> The phones handle secret information and logistics. The people make the game.

The group has been rained indoors, people are standing around with phones, and there is no TV. The host should be able to open one URL, show a QR code, and start a game that makes everyone talk to one another. Success is not “everyone stares at a screen”; success is “everyone occasionally glances at a screen and then starts making alliances.”

The reference is *Two Rooms and a Boom*: two separated groups, hidden affiliations, voluntary reveals, leaders, and exchanges between rooms. This game uses new faction and character names, original written rules, and its own mobile controls. It deliberately retains a familiar basic structure while omitting complex special cards until core play is reliable.

### Priorities, in order

1. Join in under a minute once everyone knows where the QR code is.
2. Never accidentally expose a private card or the other room's role information.
3. Allow 12–15 people to talk, move, and negotiate without pauses caused by UI.
4. Never allow a leader to accidentally exchange too many people, themselves, or nobody.
5. Never let a disconnect corrupt a match or silently give a new identity.
6. Always reach a determinate winner without needing someone to tally cards.

### Out of scope for V1

Role-card swaps; automatic physical location verification; all-private in-app chat; AI narrators; location permission; account registration; payments; audio/video; projector mode; gameplay relying on a single shared TV; secret DMs across rooms; complex conditions/extra roles.

## 2. Story and victory

Two competing networks are trying to determine whether the last intact broadcast will be protected or disrupted.

- **Signal faction (blue, circle icon)** protects the **Beacon**, a unique Signal role. Signal wins when Beacon and Jammer finish in **different physical zones**.
- **Static faction (orange, zigzag icon)** includes the **Jammer**, a unique Static role. Static wins when Jammer and Beacon finish in **the same physical zone**.
- **Forecaster (gray, question-mark icon)** appears only at odd player counts. The Forecaster has no affiliation with either faction and wins independently by predicting which faction wins, **after the final exchange but before roles are revealed**. Its win/loss does not change the faction result.

Victory is based on the **server's final zone assignments**, which must be made to match real-world movement. No player is eliminated. No one needs to surrender a phone.

## 3. Exact deck sizes, 12–15 players

| N | Signal cards | Static cards | Neutral cards | Physical zones |
|---|---|---|---|---|
| 12 | 1 Beacon + 5 Signal Members | 1 Jammer + 5 Static Members | 0 | 6 / 6 |
| 13 | 1 Beacon + 5 Signal Members | 1 Jammer + 5 Static Members | 1 Forecaster | 7 / 6 |
| 14 | 1 Beacon + 6 Signal Members | 1 Jammer + 6 Static Members | 0 | 7 / 7 |
| 15 | 1 Beacon + 6 Signal Members | 1 Jammer + 6 Static Members | 1 Forecaster | 8 / 7 |

N is the number of active participants at the instant the game starts; a separate non-playing host is **not** counted. Randomize the deck with a secure server-side shuffle, randomly deal exactly one card to every player, and *separately* shuffle zone assignments. The neutral card never replaces a primary role.

**Fairness invariant:** every started game has precisely one Beacon, precisely one Jammer, equal Signal and Static counts, and no more than one Forecaster. Both essential characters may begin in the same zone; the strategy lies in learning, bluffing, and moving them.

## 4. Physical venue setup

The host designates **Zone A** and **Zone B** before inviting people to join. Two separate meeting rooms work best. If rain forces everyone into one hall, two far-apart sections can work if groups cannot overhear one another. Being able to *see* the other group is less damaging than being able to *hear* their conversations. This is a social rule, not a geolocation requirement.

Players must:

- Stay with their assigned zone during discussion.
- Not call, text, signal, record, or relay information to people in the other zone.
- Talk, form alliances, bluff, nominate leaders, and optionally reveal cards to **people physically in their own zone**.
- Exchange **people** when the app says move. Never hand their phone or role to another person.
- Follow the host's normal supervision and event boundaries; do not send minors into isolated or unsupervised spaces.

For visibility and accessibility, zones can be named **North / South**, **Blue Table / Orange Table** (but avoid accidentally implying affiliation!), or simply **A / B**. Best default is A/B: location labels must not be faction labels.

**If the space is too small to keep conversations separate:** do not promise equivalent deduction. The app can still run, but call it a casual single-hall variant and expect a weaker game.

## 5. Complete first-game sequence

### Step 0 — Host creates the lobby

1. Host opens URL and selects `Host game`.
2. Options: `Spectate / host only` **or** `Play too`; 12–15 players including host if participating.
3. Defaults: `Intro game`, three rounds, 2/1/1 per-zone transfers, faction-only sharing on, ordinary private/full card reveal on.
4. Server creates six-character join code and QR join link. Host shows phone screen; players scan it **from their own phones**, or enter short code if scanning fails. No account, password, or app installation.
5. Everyone chooses a display name, sees a waiting room, and taps `Ready`.
6. Host confirms all expected players and presses `Lock & deal` (a confirmation prevents an accidental start).

**Crucial:** No one can join after the roster is locked. Latecomers wait for the next game.

### Step 1 — Assignment and movement

The server privately assigns one role and one physical zone to each player. Player's screen shows `Go to Zone A` or `Go to Zone B` and an `I'm here` confirmation. Hide any private role until they explicitly open `My Card`, and avoid revealing the card while the player is looking around a crowd.

Wait until every player has confirmed location. The host may resolve a mis-tap; there is no GPS or Bluetooth. This is self-report, not location proof.

### Step 2 — Leaders

Each zone needs one **public leader**, who directs that zone's outgoing players. To avoid a stalled first game, the app randomly designates a provisional leader in each zone when the round is ready. In person, anyone can campaign, nominate, and challenge. Players in that zone can replace the provisional leader by majority vote in the app. A leader can abdicate to a consenting replacement.

Leaders are *roles of authority*, **not** extra hidden cards; the Beacon, Jammer, Member, or Forecaster could be elected. The leader's identity must be visible to everyone in their zone. A leader **cannot be selected as an outgoing transfer**. If you want to move a leader, first replace them.

Majority is `floor(number_in_zone/2) + 1` approvals. Changing leaders is allowed during discussion, but frozen once a selection is locked for that exchange. Votes are cleared on transfer and when the elected leader changes.

### Step 3 — Discussion and role reveals

The default game has three rounds:

| Round | Live discussion time | Players selected **per zone** at the end |
|---|---:|---:|
| 1 | 3:00 | 2 |
| 2 | 2:00 | 1 |
| 3 | 1:00 | 1 |

The large on-screen countdown is synchronized by server time. Players may talk, deceive, ask to compare cards, or reveal their own role. There is **no forced truthful speech** except when the real card is displayed by the app. They may **not** alter their hidden card.

Players have these card controls:

- `My Card` — private, covered by default; **press and hold** `Peek` to reveal to the owner, then automatically cover on release or when app is backgrounded.
- `Show Faction` — large Signal/Static/Forecaster badge to show someone standing nearby. No role name. Close button, automatic short timeout. This is permitted because all supported games have at least 12 players.
- `Show Full Card` — large role, faction, objective; temporarily shows on the holder's screen to nearby people. **Never shown without an intentional action**.
- `Hide Now` — immediately covers all card views.

A physical full-card show is not necessarily mutual: another person can decline to reveal their own card. Players may **claim** any identity verbally, but they must not substitute a fake screen or screenshot and call it the app's real card. Screenshots cannot be prevented, so the experience remains an honor system.

**V1.1 optional verified sharing:** Select a player currently in your zone, select `Team only` or `Full card`, and send a request. The recipient accepts. The server shows the exact permitted information only to the accepted recipient for a short period; one-way reveals are possible. A reciprocal share is simply two accepted requests. No cross-zone requests, no persistent reveal inbox, and no sender-controlled forgery. This feature adds overhead and is not required for V1 play.

### Step 4 — Leader selection and exchange

1. During the last 30 seconds, each leader can preselect the required number of outgoing people from their own zone. Selections are visible **inside that zone only**; if provisional, they can change until locked.
2. At 0:00, the UI moves to `Confirm exchange`. Both leaders must lock exactly the required count. The server rejects selecting the leader, a non-member, duplicate names, or too many/few people.
3. The two leaders **cannot see the other room's selections until both are locked**, avoiding last-second counters. Each zone can see its own locked list; the opposite zone never sees the private negotiation before the transfer.
4. If a leader is unresponsive, display a short **20-second selection grace**. The host can pause; otherwise the server automatically and fairly selects missing outgoing players from eligible players with a secure random choice. This is an **explicit mobile convenience rule** that differs from purely human-controlled play. Warn everyone ahead of time.
5. Once both selections are locked, the server performs **one atomic exchange** of exactly equal-size lists. Each player's personal UI updates to `MOVE TO ZONE A/B` or `STAY IN ZONE A/B`, with a clear list of moves and no secret card details.
6. Physical movers walk to their destination. All players tap `I'm here` (no GPS). Host confirms the room is settled and starts the next timer. For a safe group, do not automatically start a discussion timer before people actually arrive.
7. After round 3's transfer, the game ends; **no more timed discussion or further movement**.

**Handling possible conflicts:** A leader vote that completes while the timer reaches zero must be serialized before/after deadline consistently on the server; once selection locks, leader cannot change. A room always retains at least 4–6 people, so selecting 2 nonleaders is feasible for this mode.

### Step 5 — Forecaster prediction, then reveal

If there is a Forecaster (13 or 15 people), that player receives `Predict which faction won: Signal / Static` **after the final transfer and before reveal**. Only they see this action. Other players see `Waiting for final prediction`. Give them 15–20 seconds; if they do not respond, they automatically forfeit the independent prediction **without changing the team outcome**. The host may pause to resolve connection issues.

Then show everyone a suspense screen, the faction result, and a clearly labeled location of the Beacon and Jammer. Optionally show the full final roster/roles only after all reveal and verdict processing is complete. Include `Play again` which shuffles a **new deck and new zones**, resets history, and returns to lobby; never re-use the last role mapping as a “rematch.”

## 6. Leadership rules — precise version

- One leader for every zone during every discussion round; leader status persists through a transfer because leaders cannot be transferred.
- Auto-assign provisional leader at start of game. Other zone members may nominate and vote for any member (including themselves). Only votes from current zone members count.
- A challenge is successful on a strict majority; active votes for other candidates do not combine. A player's vote replaces any previous vote.
- Leader may offer transfer of leadership to another zone member; recipient must accept. Do not permit loops in which the immediate former leader instantly receives it back during that same round (optional friction control).
- Leadership changes invalidates any *unlocked* pending outbound selection; the new leader must make their own selection.
- Once the transfer lock window begins, leadership elections pause until the next round. That keeps selection deterministic.
- Hosts can force-assign a leader only through a visible `Emergency fix` action that logs a public host override; fairness is more important than invisible fixes.

## 7. Information flow and anti-spoiler rules

Public to all players: phase, game number, countdown, own zone, own zone roster, own zone leader, overall number of players, transfer status. Public **only after completion**: team result and all characters.

Private to owner: actual team and role, Forecaster status, owner-specific share requests and accepted views. Zone-local: nominations, votes/leader status, outgoing names (not the opposite room's private choices). Server-only during play: the full deck mapping and both rooms' role compositions.

The host dashboard must **not** reveal who is Beacon or Jammer or which faction has more people in any zone before game ends, **including when the host is a player**. The server sends sanitized views and never embeds the hidden roster in the page or QR link. Do not mistake “hidden by CSS” for access control.

A reveal must not accidentally persist when a phone locks/unlocks, navigates back, switches tabs, or changes room. On `visibilitychange`, replace any face-up card with its cover immediately; also expire timed disclosures on the server.

## 8. What an actual 14-person game might look like

- Host starts with 14 active participants. The server deals 7 Signal and 7 Static identities, including one Beacon and one Jammer; zones are assigned 7 and 7 independently.
- Each zone gets a provisional leader. For three minutes, players compare their cards and argue about who can be trusted.
- Both leaders select **two** outgoing players. The server commits both lists at once, then instructs those four individuals to move to the opposite zone.
- Another two minutes of discussion; leaders send **one each**. After a final one-minute discussion, leaders send **one each**.
- The Jammer and Beacon's zones are compared. The app announces the winner; everyone sees the role reveal. The host can immediately start a rematch.

The specific people and roles are random in each game. No player is assigned a predictable role or zone based on join order.

## 9. Recommended player-facing language

**Game title:** SIGNAL DIVIDE  
**Subtitle:** Two zones. Hidden teams. One last move.

**Join:** `Scan the code or enter the room code. No account needed.`  
**Your zone:** `ZONE B. Head there now. Keep your card secret until you decide otherwise.`  
**Private card:** `Hold to peek. Release to hide.`  
**Faction share:** `This reveals your faction, not your special role.`  
**Leader:** `You decide who moves. You cannot select yourself.`  
**Transfer:** `You are moving to Zone A. Keep your phone and your card.`  
**Victory:** `SIGNAL WINS — Beacon and Jammer ended apart.` / `STATIC WINS — Beacon and Jammer ended together.`

## 10. Accessibility and pastoral/social fit

Use readable large text; high-contrast backgrounds; faction names **and icons** in addition to color; reduced-motion mode; no essential audio cue; host can verbally announce time; large buttons; avoid drag-and-drop or tiny checkboxes. Do not use proximity tracking, real names, forced personal revelations, location services, or public humiliation. Explicitly say: **“Bluff about your game card, not about real people or personal life.”** For minors, participants remain in event-supervised areas throughout.

## 11. Contingency rules

- **Someone drops connection:** preserve their role and physical zone; they rejoin with their existing anonymous session token. Do not redeal. They can keep talking, but host should pause before exchange if the selected player cannot see move instructions.
- **Host disconnects:** reconnect with a separate host recovery token and restore the dashboard. A host connection dropping must not erase the game or expose all roles.
- **A person leaves completely:** pause, then choose `Abort and start new match` unless a future explicit substitute mechanic is built. Secretly removing a card or continuing with a different count changes balance and end-game logic.
- **No internet at venue:** QR/websocket multiplayer cannot work from ordinary phone browsers without network connectivity. Use prearranged connectivity or a manual paper-slip fallback. A service worker alone does not create a multiplayer backend.
- **Mistaken transfer in real life:** pause and reconcile who moved. A host can use a visibly logged `Correct zone assignment` before continuing, with a strong warning; do not recalculate the outcome based on an incorrect roster.
- **Leader not available:** 20-second selection grace, then random legal selection; host can pause first. The result must be public and logged.
- **Emergency stop:** host can pause/halt the game instantly; mobile app must not override an adult's directions.

## 12. What should come after a successful first game?

**Release 1:** stable join/role/zone/leader/timer/exchange/reveal and manual show modes.  
**Release 1.1:** one-way/reciprocal verified app-to-app sharing, configurable timers, host recovery polish, vote UX.  
**Release 2:** additional original roles with abilities, a longer 5-round mode, custom role presets and alternative objectives.  
**Later:** optional genuine card-identity exchanges, implemented as a server-owned atomic action with explicit ownership semantics and new balancing tests. Do not improvise this during V1.

**Design axiom:** the screen is a tool for the room, not a replacement for the room.
