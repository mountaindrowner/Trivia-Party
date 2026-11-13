# SIGNAL DIVIDE — Player and Host Phone Flows

These are **mobile-first UX requirements and rough text wireframes**, not final UI artwork.

## Operating principle

At all times, players need one prominent action and one clear sentence about what to do next. Keep cards secret by default. Do not mix the color **of the physical room** with the color **of a secret team**. Room A/B uses neutral styling; faction colors appear only on intentional card reveals.

## Host screen 1: Create lobby

```text
┌───────────────────────────────┐
│         SIGNAL DIVIDE         │
│ Two zones. One last move.     │
│                               │
│ [ Host new game ]             │
│                               │
│ Host mode:                   │
│ (•) I am a spectator          │
│ ( ) I am also a player        │
│                               │
│ Preset: INTRO / 3 ROUNDS      │
│ Players: 12–15                │
│ [ Create lobby ]              │
└───────────────────────────────┘
```

This phone stays the host console. If `I am also a player`, display a clean `My Game` tab and a separate `Host` tab; do **not** leak hidden cards in either.

## Host screen 2: Show QR and join code

```text
┌───────────────────────────────┐
│ SIGNAL DIVIDE — LOBBY         │
│                               │
│         [ QR CODE ]           │
│                               │
│       JOIN CODE: M7Q4R2      │
│       example.com/j/M7Q4R2   │
│                               │
│ Players joined: 13           │
│ Ready: 12/13                 │
│                               │
│ [ View roster ]               │
│ [ Lock & deal ]               │
└───────────────────────────────┘
```

The shown code is an **illustrative example**, not a live link. QR must encode the live hosted URL. Keep 5–6-character entry backup and share link copy; do not rely on an external display. Turn up screen brightness; pass the phone around if necessary; use the code for people who cannot scan.

## Player screen 1: Join

```text
┌───────────────────────────────┐
│ JOIN SIGNAL DIVIDE            │
│ Room code: M7Q4R2            │
│                               │
│ Your display name:           │
│ [___________________]         │
│                               │
│ [ Join game ]                 │
└───────────────────────────────┘
```

No account, age fields, email, or permission prompts. Basic profanity filter/host rename is optional. Name collision: prompt for unique display name, not a silent overwrite.

## Player screen 2: Waiting and ready

```text
┌───────────────────────────────┐
│ WAITING FOR EVERYONE          │
│ 13 players joined             │
│                               │
│ [ I'm ready ]                │
│                               │
│ Keep this tab open.           │
└───────────────────────────────┘
```

Show the user's connection state and preserve game identity on refresh.

## Player screen 3: Assigned physical zone

```text
┌───────────────────────────────┐
│         GO TO ZONE B          │
│                               │
│ This is your LOCATION,        │
│ not your secret team.         │
│                               │
│ [ I'm here ]                 │
│ [ My Card ]  (covered)        │
└───────────────────────────────┘
```

Do not accidentally display the private role at the moment people gather and scan.

## Player screen 4: Game play

```text
┌───────────────────────────────┐
│ ZONE B       ROUND 1 OF 3     │
│            02:17              │
│                               │
│ Leader: Jamie                 │
│ Players here:                 │
│ Alex • Jamie • Riley • ...    │
│                               │
│ [ My Card ] [ Show Faction ]  │
│ [ Show Full Card ]            │
│ [ Leadership Vote ]           │
│                               │
│ Talk to people in this zone.  │
└───────────────────────────────┘
```

The normal screen should **not** have any team-colored badge or hidden-card preview. If the user is leader, add a `Select 2 to move` control that opens a large tappable checklist, with legal eligible player names only.

## Player screen 5: My Card — a privacy-first cover

```text
┌───────────────────────────────┐
│         MY PRIVATE CARD       │
│                               │
│      [ COVERED CARD ]         │
│                               │
│     [ HOLD TO PEEK ]          │
│                               │
│ Release to cover instantly.   │
│ [ Done ]                     │
└───────────────────────────────┘
```

While holding, show faction name/icon, role name, objective and any ability (if advanced cards are eventually added). Support touch pointer down/up and safe cancellation; if accessibility requires an alternative, provide an explicit `Reveal for 5 seconds` with a large `Hide now` button. Lock/background must hide it.

## Player screen 6: Reveal to nearby person

`Show Faction` deliberately shows *only* the player's faction in huge text and icon. `Show Full Card` deliberately shows the complete card. Both have a visible `Hide Now` and a short auto-hide timeout (e.g. 8 seconds). The owner turns their phone toward whomever they trust. This is not a broadcast to the entire game, and the backend does not send a reveal event to another player's device in V1.

Don't hide/show via browser tabs that might leave a face-up card onscreen after an app switch. Use one authenticated card view with protected temporary reveal state.

## Player screen 7: Leader tools

```text
┌───────────────────────────────┐
│ YOU ARE ZONE B LEADER         │
│ Move 2 players this round     │
│                               │
│ [ ] Alex                      │
│ [ ] Riley                     │
│ [ ] Morgan                    │
│ [ ] Casey                     │
│                               │
│ Selected: 0/2                │
│ [ Lock my selection ]         │
└───────────────────────────────┘
```

Leader can't choose self. For 12–15 players, two transfers in the first round and one in each later round. Empty/overfull selection disables lock. Selection becomes irreversible when locked. Show own room's selection to room members; never display the other room's selection before both are locked.

## Player screen 8: Exchange

```text
┌───────────────────────────────┐
│         MOVE TO ZONE A        │
│                               │
│ Take your phone with you.     │
│ Keep your card and role.      │
│                               │
│ [ I'm in Zone A ]             │
└───────────────────────────────┘
```

Non-moving players see `STAY IN ZONE B`. Everyone gets a concise `Waiting for people to arrive...` view. The host controls start of next round after the people have actually moved.

## Player screen 9: Final result

```text
┌───────────────────────────────┐
│         STATIC WINS!          │
│                               │
│ Jammer and Beacon ended       │
│ together in Zone A.           │
│                               │
│ [ See all roles ]             │
│ [ Join rematch ]              │
└───────────────────────────────┘
```

If neutral Forecaster is active, show prediction screen to Forecaster **before** showing this result to anyone.

## Host dashboard: During play

Show two location **headcounts**, round timer, joined/connected count, confirmation status, which leaders have locked selection, and pause/resume. The host must *not* see secret roles or faction populations. Buttons:

- `Pause / Resume` — pauses a server-owned countdown for everyone.
- `Repeat movement instruction` — lets absent-minded participants see where they should go.
- `Correct zone` — logged host override, only when paused, with confirmation.
- `Replace leader` — logged emergency override, only when paused.
- `Abort match` — irreversible after confirm.
- `Rematch` — after outcome, reshuffle roles/zones.

For a player-host, keep `My Game` as the primary tab during live rounds.

## Optional upgrade: consent-based two-phone share

The feature is **not required to play** and should not displace physical conversation. If added:

1. Player A sees a same-zone roster, taps Player B, chooses `Faction only` or `Full card`.
2. Player B sees `Alex would like to show you their faction. Accept / Decline`.
3. On accept, server sends only the requested allowed information from A to B, with expiry.
4. Both A and B can independently show their cards to one another. There is no forced reciprocity.
5. Room changes cancel pending requests. No requests to other zones. No server-shared card history visible to players.

Avoid claiming cryptographic proof that someone physically viewed a card. Server authorization can certify which data was sent to which session, but it cannot prevent screenshots or off-app talk.

## Visibility, battery, and device ergonomics

- Large text for timer and physical destination; no reliance on vibration or sound.
- Keep wake-lock only if browser supports and user permits; always survive screen sleep by recalculating remaining time from server deadline.
- No full-screen-only requirement. iOS Safari and Android Chrome supported.
- Touch targets at least 44 CSS pixels; visual focus for keyboard and screen readers.
- Distinguish zones by letter, not secret-team hue.
- Support slower devices and temporary disconnected indicators without reshuffling identities.
- Keep status simple: `Connected`, `Trying to reconnect`, `Host paused`, `Move now`.
