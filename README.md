# FIFA WC 2026 Simulator

A mobile bracket simulator for the 2026 FIFA World Cup built with Expo (React Native). Simulate all 48 teams across 12 groups, drag-reorder standings, and watch the knockout bracket fill in round by round. Optionally share a room with friends to vote on match outcomes together.

---

## Features

- **Group stage** — 12 groups (A–L), 48 teams, 72 matches generated with xG-based ratings
- **Auto-simulate** — Poisson-goal model simulates all group matches in one tap
- **Drag-to-reorder standings** — manually adjust finishing positions per group with a smooth drag UI
- **Full knockout bracket** — R32 seeded from standings; winners propagate automatically through R16 → QF → SF → 3rd Place → Final
- **Bracket export** — snapshot your bracket and share it as JSON
- **Ask AI** — copies a match context prompt to clipboard for Claude / ChatGPT analysis
- **Rooms (multiplayer)** — create or join a room, submit your bracket, and see a live consensus view via SSE
- **Dark / light theme**
- **Persistent state** — bracket saved locally with expo-sqlite; settings via AsyncStorage

---

## Tech Stack

### App (`/` — this repo)
| Layer | Library |
|---|---|
| Framework | Expo SDK 54, React Native 0.81 |
| Navigation | expo-router 6 (file-based) |
| State | Zustand |
| Storage | expo-sqlite (bracket), AsyncStorage (settings) |
| Camera | expo-camera (QR room join) |
| Gestures | react-native-gesture-handler, PanResponder |

### Server ([fifawc-server](https://github.com/KenanMathews/fifawc-server))
| Layer | Library |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Hono + @hono/node-server |
| Database | better-sqlite3 |
| Real-time | Server-Sent Events (SSE) |
| Tests | Vitest |

---

## Project Structure

```
app/
  _layout.tsx               # Root layout (GestureHandlerRootView)
  index.tsx                 # Redirect → /(tabs)/simulate
  (tabs)/
    _layout.tsx             # Tab bar: Simulate | Rooms | Profile
    simulate/
      index.tsx             # Landing — Init bracket / import
      groups.tsx            # Group stage cards + auto-simulate
      standings.tsx         # Drag-to-reorder standings per group
      bracket.tsx           # Full knockout bracket (R32 → Final)
    rooms/
      index.tsx             # Room list / create
      [id].tsx              # Room detail + consensus view
      scanner.tsx           # QR code scanner for join
    profile/
      index.tsx             # Display name, theme, server URL

src/
  types/contract.ts         # Shared types: Team, Match, Stage, BracketSnapshot, Room …
  data/tournamentSeeds.ts   # 48 teams + getGroupMatches()
  stores/
    bracketStore.ts         # Core simulation engine + bracket propagation
    settingsStore.ts        # AsyncStorage-backed settings
    roomStore.ts            # Room state + SSE
  components/
    ThemedView.tsx          # Theme-aware View + useTheme hook
    MatchCard.tsx           # Reusable match row
    GroupCard.tsx           # Group match list card
  hooks/
    useSync.ts              # Push/pull bracket snapshot to server
    useSSE.ts               # SSE subscription for room events
  ai/matchPrompt.ts         # Builds a match context prompt for AI
  api/client.ts             # Typed HTTP client for the server
  db/database.ts            # expo-sqlite setup
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Expo Go](https://expo.dev/go) (SDK 54) on your phone **or** an iOS/Android simulator
- The server running locally (optional — rooms/sync features only)

### App

```bash
git clone https://github.com/KenanMathews/fifawc-app.git
cd fifawc-app
npm install
cp .env.example .env          # edit EXPO_PUBLIC_SERVER_URL if running the server
npx expo start
```

Scan the QR code with Expo Go or press `i` / `a` for simulator.

### Server

```bash
git clone https://github.com/KenanMathews/fifawc-server.git
cd fifawc-server
npm install
npm run dev                   # starts on http://localhost:3000
```

Set `EXPO_PUBLIC_SERVER_URL=http://<your-local-ip>:3000` in the app's `.env` so your phone can reach it.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_SERVER_URL` | `http://localhost:3000` | Base URL of the fifawc-server |

---

## Server API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/sync/push` | Save bracket snapshot for a device |
| `GET` | `/api/sync/pull?deviceId=` | Fetch latest snapshot for a device |
| `POST` | `/api/rooms` | Create a room |
| `POST` | `/api/rooms/join` | Join by room code |
| `GET` | `/api/rooms/:id` | Get room + members |
| `POST` | `/api/rooms/:id/submit` | Submit bracket snapshot |
| `GET` | `/api/rooms/:id/consensus` | Compute vote consensus |
| `POST` | `/api/rooms/:id/force-vote` | Admin: force a match to vote on |
| `POST` | `/api/rooms/:id/skip` | Admin: skip a match |
| `DELETE` | `/api/rooms/:id/members/:memberId` | Admin: remove member |
| `GET` | `/api/rooms/:id/stream` | SSE event stream |

### SSE Events

| Event | Payload |
|---|---|
| `member_joined` | `{ member }` |
| `consensus_updated` | `{ consensus: ConsensusBracket }` |
| `force_vote` | `{ matchId }` |

---

## How the Simulation Works

1. **Group stage** — each group's 6 matches get xG values derived from FIFA rating differentials (`xG = max(0.5, 1.2 ± ratingDiff × 0.03)`). Auto-simulate draws goal counts from a Poisson distribution.
2. **Standings** — `groupOrder` in the bracket store tracks finishing positions per group. Drag the standings rows to override the simulated order.
3. **R32 seeding** — group pairs (A/B, C/D, E/F, G/H, I/J, K/L) produce matches as `1st(X) vs 2nd(Y)` and `1st(Y) vs 2nd(X)`. Best 8 of 12 third-place teams (ranked by wins, then rating) fill the remaining 4 matches.
4. **Knockout propagation** — `propagateWinners()` rebuilds R16/QF/SF/Final/Third from current winners after every pick, preserving already-completed matches.

---

## License

MIT
