# SIGNAL DIVIDE — Engineering Blueprint

## 1. Architecture decision

Build a **responsive mobile web application** (PWA installation optional), not an install-required native app. The app uses an **authoritative multiplayer backend** and bidirectional realtime updates. The host phone is a browser-based control device, **not** a network server. This matters because a phone browser cannot reliably host an HTTP/WebSocket multiplayer server for everyone else's phones.

Possible implementations: React/Vite + Node/WebSocket + hosted Redis/SQL session persistence; or Cloudflare Pages + Workers/Durable Objects for per-match state and WebSockets. The exact stack can follow existing hosting; these are examples, not dependencies forced on the developer.

**Do not build the game as localStorage-only HTML or peer-to-peer-only browser code** and claim that scanning a QR lets 15 phones synchronize. Every participant needs the join URL and network route to the backend. The backend must own roles, room membership, timers, votes, transfers, and result calculation.

## 2. Session and authority model

- `Game`: durable unique internal ID, public short join code, unguessable host recovery token, phase, revision, options, player IDs, round, server deadline, state snapshot.
- `Participant`: stable anonymous ID, normalized unique display name, private rejoin credential, active flag, zone, role card ID, faction, `isLeader`, `isReady`, `isPresent`, connection state.
- `Room`: A/B, current members, current leader, election votes, private selected outbound IDs, locked selection flag.
- `Reveal`: ephemeral and per-device view state for self peek/manual physical show. For future device-to-device shares, server-authorized sender/recipient/mode/expiration.
- `Prediction`: Forecaster's pending, final predicted winning faction, and when committed.
- `Audit`: sanitized durable record of phase transitions, transfers, time pauses, and host overrides; **role-specific details concealed from clients until result**.

Host UI must use a **dedicated authenticated host capability**. The join code is public and cannot authorize host operations. If the host is also playing, they have **two capabilities** on the same phone: ordinary player access and host controls, but neither returns all hidden roles during live game.

## 3. Finite-state machine

```text
CREATE
  │
  ▼
LOBBY ──[12..15 ready; host confirms]──► ASSIGNED
  │                                        │
  │                                        ▼
  │                                 ZONE_ARRIVAL
  │                                        │ all arrived / host override
  │                                        ▼
  │                                  ROUND_ACTIVE ◄─────────────┐
  │                                        │ deadline            │
  │                                        ▼                     │
  │                                 TRANSFER_LOCK               │
  │                                        │ both locked or      │
  │                                        │ timeout fallback    │
  │                                        ▼                     │
  │                                 TRANSFER_APPLIED            │
  │                                        │                     │
  │                                        ├─ more rounds ─► ZONE_ARRIVAL
  │                                        │
  │                                        ├─ final, odd ─► PREDICTION
  │                                        │                       │
  │                                        └─ final, even ─┐      │
  │                                                       ▼      ▼
  │                                                     REVEAL
  │                                                       │
  │                                                       ▼
  └─────────────────────────────────────────────────── FINISHED
```

`PAUSED` should be a **flag with frozen remaining time and previous phase**, not a lossy state transition. Rematch creates a **new game instance/revision and deck**, keeping optional lobby participants but not role mappings. Only the server can advance phases.

### Important transition rules

- `LOBBY -> ASSIGNED`: validate count 12–15; all active participants ready; no duplicate IDs/names; host explicitly confirms; secure-shuffle roles and zones **once**; atomically persist both.
- `ASSIGNED -> ZONE_ARRIVAL`: show location; role remains covered.
- `ZONE_ARRIVAL -> ROUND_ACTIVE`: verify arrivals or logged explicit host override; set `deadline=serverNow+duration`.
- `ROUND_ACTIVE -> TRANSFER_LOCK`: server timer reaches 0; freeze leader changes and invalid submissions; participants see lock state. A leader may have preselected earlier, but all outgoing selections must be locked before exchange.
- `TRANSFER_LOCK -> TRANSFER_APPLIED`: each leader locked exactly `requiredOutbound` valid zone members not including self; or backend random-fills after grace; commit *both directions atomically* against one game revision.
- `TRANSFER_APPLIED -> ZONE_ARRIVAL`: show movement to affected participants; require physical movement and arrival confirmations before next round.
- `TRANSFER_APPLIED -> PREDICTION`: only after final exchange and all final movement confirmations; Forecaster submits unique final prediction. If no neutral role, go to `REVEAL`.
- `PREDICTION -> REVEAL`: after Forecaster committed or timeout forfeit. Never reveal outcome to anyone until this transition.
- `REVEAL -> FINISHED`: compute winner once from same-zone predicate; persist immutable result.

**Question to settle in code:** On the final transfer, players must physically arrive before the game compares final zones. The server can already calculate location assignments, but do not show the result until host confirms physical placement.

## 4. Default round configuration

```json
{
  "minPlayers": 12,
  "maxPlayers": 15,
  "rounds": [
    { "durationSeconds": 180, "outboundPerZone": 2 },
    { "durationSeconds": 120, "outboundPerZone": 1 },
    { "durationSeconds": 60, "outboundPerZone": 1 }
  ],
  "selectionGraceSeconds": 20,
  "predictionGraceSeconds": 20,
  "autoAssignFirstLeaders": true,
  "allowShowFaction": true,
  "allowManualFullCardReveal": true,
  "allowInAppShares": false
}
```

Five-round mode is **not** a V1 requirement. If added, explicitly test counts and budgets; potential high-participation defaults for 12–13: outbound `[2,2,2,1,1]`, and for 14–15: `[3,2,2,1,1]`, durations `[300,240,180,120,60]`. Keep it as an opt-in advanced preset.

## 5. Server-side invariants (must be enforced, not just UI-disabled)

```text
12 <= numberOfActivePlayersAtStart <= 15
len(allPlayerIDs) == count(unique(allPlayerIDs))
exactlyOne(role == BEACON)
exactlyOne(role == JAMMER)
signalCount == staticCount
neutralCount == (playerCount mod 2)
every player has exactly one assigned zone (A or B)
abs(size(A) - size(B)) <= 1 after every exchange
exactly one leader per zone when discussions are active
leader belongs to own zone
leader cannot be outbound
selected outbound count == requirement for that round
selected outbound IDs distinct, all from original room
same number leaves A as leaves B
role ownership unchanged during normal transfers
once transfer committed, applying event again is a no-op
outcome based only on final Beacon and Jammer zone IDs
```

The size-difference property follows from equal outbound counts, including 13/15 where 7/6 or 8/7 remains constant. If someone drops off Wi-Fi, **do not delete them** from the role and roster data; inactive connections remain valid participants until a deliberate game abort.

### Secure random assignment pseudocode

```text
function deal(activePlayers):
  n = activePlayers.length
  assert(12 <= n && n <= 15)
  factionSize = floor(n / 2)
  deck = [BEACON, JAMMER]
       + repeat(SIGNAL_MEMBER, factionSize - 1)
       + repeat(STATIC_MEMBER, factionSize - 1)
  if n % 2 == 1: deck += [FORECASTER]
  deck = cryptoSecureShuffle(deck)
  ids = cryptoSecureShuffle(activePlayers.map(p => p.id))
  for i in 0..n-1: privateRole[ids[i]] = deck[i]
  physicalIds = cryptoSecureShuffle(ids)
  for i in 0..n-1:
    zone[physicalIds[i]] = (i < ceil(n/2) ? A : B)
  electProvisionalLeader(A)
  electProvisionalLeader(B)
  persistAtomically()
```

Do not infer or leak hidden faction from the word “Zone A/B.” Use cryptographically strong server RNG, not `Math.random()` when fairness matters.

## 6. Protocol contract (illustrative; stack agnostic)

### Client commands

| Type | Who can call | Checks/meaning |
|---|---|---|
| `CREATE_GAME` | anyone creating host session | Return game ID, host token, public code, QR URL |
| `JOIN_GAME` | lobby participant | Lobby open, available slot, unique display name |
| `READY` | own participant | Mark ready/unready pre-lock |
| `LOCK_AND_DEAL` | host | 12–15 ready, once per match |
| `CONFIRM_ARRIVAL` | own participant | Only when prompted by assigned zone |
| `START_ROUND` | host | No missing arrival confirmations unless explicit override |
| `NOMINATE` / `VOTE_LEADER` | own current-zone participant | Vote candidate currently in zone; strict majority |
| `OFFER_LEADERSHIP` / `ACCEPT_LEADERSHIP` | current leader / named successor | Same zone; no transfer lock |
| `SELECT_OUTBOUND` | current room leader | Own room, eligible IDs, correct count; replace provisional selection |
| `LOCK_OUTBOUND` | current room leader | Correct count; locked immutable |
| `PREDICT_WINNER` | Forecaster only | Prediction phase, first valid prediction |
| `PAUSE` / `RESUME` | host | Server freezes/restores remaining time |
| `EMERGENCY_CORRECT_ZONE` | host | Paused only; logged, confirmation required |
| `ABORT` / `REMATCH` | host | Explicit confirm; no hidden-map leakage |

### Server events (minimum)

- `LOBBY_UPDATE` — sanitized roster/ready flags, total count.
- `ASSIGNMENT_PRIVATE` — recipient player's role and current zone only.
- `STATE_VIEW` — safe per-caller snapshot; **not a broadcast of unfiltered game model**.
- `TIMER_SYNC` — absolute deadline and current server timestamp.
- `ROOM_LEADER_UPDATE` — leader ID and voting status in relevant zone.
- `OUTBOUND_STATUS` — local zone's publicly selected names, counts, lock state. Opposite zone only gets `opponentLocked: true/false`.
- `TRANSFER_INSTRUCTION` — own new zone and whether to move. Do not leak opposite room secrets.
- `PREDICTION_REQUEST` — Forecaster only.
- `RESULT` — after prediction closes, winning faction and final roles/zones.
- `REJOIN_RESTORED` — identity resumed with sanitized current state.

Every state-mutating command should include `gameId`, authenticated actor identity, `clientCommandId` for idempotency, and expected game revision (or equivalent transactional locking). Validate current phase on server.

## 7. Safe views and information security

Never send the full deck/role map to players or to the active host dashboard. Server must project data into distinct permissioned views:

**Public match view:** phase, round number, current server timer, player count, own zone, own current-zone roster, room leader, own zone's outgoing names, connection/arrival states, safe aggregate move statuses.

**Owner-only:** exact own role/team, own legal actions, accepted direct reveals (future).

**Host-only controls:** pause, rescue, reconnect, room headcount, phase control — **not** hidden full-role knowledge. Emergency correction of a member's room should not show their card.

**Post-result:** full roster and character reveal (optionally any game history after match ends).

Protect by session credentials, authorization checks on WebSocket and HTTP endpoints, and explicit response schemas. The QR link contains **public join code only**, no host token. Reconnect tokens should be stored privately per-device and rotated/revoked as needed. Use TLS (`https` / `wss`). Rate-limit public code guessing, joining, and vote/action spam. Normalize/escape user-input names to prevent markup injection.

## 8. Timer and race handling

- All countdowns derive from a **server timestamp/deadline**. Clients render locally based on the last synchronization, but cannot extend rounds by adjusting their clocks.
- Pause saves exact remaining duration. Resume reassigns future server deadline; broadcast to every device.
- Commands reaching server after the round lock point must be rejected or allocated deterministically by server receipt order, never by client-supplied time.
- Outgoing lists are committed *together*. The exchange is one database transaction or one serialized room-object operation.
- If the leader is offline, after grace choose any remaining eligible player uniformly at random and log the fallback. It must never select a leader or duplicate ID.
- If both leaders lock early, do **not** exchange before the discussion timer expires.
- An expired or duplicated `LOCK_OUTBOUND` after the exchange must not cause a second transfer.

## 9. Physical share / digital share distinction

**V1 manual show is an on-device UX action, not a network reveal:** the card owner presses and holds to show their own screen. The app cannot police who visually saw the screen and must not pretend otherwise.

**Optional V1.1 device-to-device share** is an authenticated data permission: owner requests reveal mode -> recipient accepts -> server returns only eligible info to that recipient for seconds. Request requires both players in the same current zone and active round; canceled on move/timeout. Consent is to *receive* the info, not proof of secret disclosure to any real-world person. Keep audit records privacy-minimal.

Do not implement genuine role-card swaps until later. If added, a swap must atomically reassign role ownership, handle special-role singleton invariants, invalidate stale cached card views, and clearly show both players their **new roles**. This is a different transaction from a physical move.

## 10. Offline, recovery, and operations

- **Network prerequisite:** each device must access the same backend through Wi-Fi or cellular. Devices can use different networks as long as routing works. No LAN discovery required.
- **Drop/rejoin:** leave disconnected participant in their zone; restore via device rejoin token. If a phone dies or never returns, pause/abort rather than secretly changing the deck.
- **Host reconnect:** recovery token restores host authority. If host is a player, player token also restores own role view.
- **Server restarts:** persisted snapshot and deadline reconstruct phase; no re-deals. An authoritative durable room object is useful.
- **PWA cache:** optional for static assets only; it cannot replace live multiplayer communication.
- **Data retention:** default ephemeral; expire completed lobbies and role history within a short configured period such as 24 hours, without storing phone numbers or personal identities.
- **Logging:** log phase and integrity events; never log private role payloads or host tokens to publicly viewable console/audit interfaces.
- **Performance:** 16 active sockets including spectator is trivial for a normal realtime deployment, but test real iPhones and Android devices. Avoid assumptions about background websocket persistence.

## 11. Technical completion criteria

The game is ready to use only when it passes the following:

1. A host on iPhone shows a QR; 12–15 mixed iPhone/Android browsers join without installs.
2. Each player receives one and only one correct private card; two essential cards exist.
3. At odd counts, Forecaster appears and can predict independently.
4. Each player knows correct Zone A/B; leaders cannot be transferred.
5. For each of 3 rounds, timer stays consistent after pauses, refreshes, and temporary network loss.
6. Only the current leader can submit; exactly 2/1/1 valid selections per zone are accepted.
7. No one can see the opposing room's identities, selection decisions, or faction composition early.
8. Simultaneous exchange changes **only zone membership**, never roles.
9. End game computes correct same-zone/different-zone result after final movement.
10. Host playing does not see all role assignments.
11. A reconnect does not mint a duplicate player or cause a deck reshuffle.
12. Rematch produces fresh roles, fresh zones, zero votes/selections, and new match state.
