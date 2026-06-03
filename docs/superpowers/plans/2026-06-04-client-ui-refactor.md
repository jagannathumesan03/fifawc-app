# Client UI Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the FIFA WC app UI to the new flow: room lobby → drag-to-seed group stage → confirm per group → round-by-round knockout bracket → completed bracket final page.

**Architecture:** The existing `bracketStore` core logic (R32 generation, propagateWinners) is kept and extended with group locking. Screens are rewritten cleanly — no working-around existing patterns. The group match picking flow (`groups.tsx`, `GroupCard`, `MatchCard`, `autoSimulate`) is deleted entirely.

**Tech Stack:** React Native, Expo Router, Zustand, TypeScript, react-native-draggable-flatlist (already installed)

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/types/contract.ts` | Add `lockedGroups`, `completedAt`, `signedKey` to types |
| Modify | `src/stores/bracketStore.ts` | Add `lockGroup`, `lockedGroups`, `isComplete`, remove `autoSimulate` |
| Modify | `src/stores/roomStore.ts` | Remove consensus/force-vote, add `startRoom`, `getMemberBrackets` |
| Modify | `src/api/client.ts` | Add `startRoom`, `getMemberBrackets`, `exportBracket` |
| Delete | `src/ai/matchPrompt.ts` | Not needed |
| Delete | `src/components/GroupCard.tsx` | Replaced by new group seeding screen |
| Delete | `src/components/MatchCard.tsx` | Replaced by new bracket match card |
| Rewrite | `app/(tabs)/simulate/standings.tsx` | Group seeding: drag order + 12-dot strip + pill nav |
| Delete | `app/(tabs)/simulate/groups.tsx` | Replaced by standings.tsx |
| Rewrite | `app/(tabs)/simulate/bracket.tsx` | Round-by-round knockout, friends' picks per match |
| Create | `app/(tabs)/simulate/complete.tsx` | Final page: quick links + export |
| Rewrite | `app/(tabs)/simulate/index.tsx` | Simplified home |
| Rewrite | `app/(tabs)/simulate/_layout.tsx` | Updated stack |
| Rewrite | `app/(tabs)/rooms/[id].tsx` | Room lobby: member list, Start button, live presence |
| Rewrite | `app/(tabs)/rooms/index.tsx` | Room list + create + join |

---

### Task 1: Update Types

**Files:**
- Modify: `src/types/contract.ts`

- [ ] **Step 1: Add `lockedGroups`, `completedAt`, `signedKey` to the snapshot type and add `RoomStatus`**

Replace the entire `src/types/contract.ts` with:

```typescript
export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

export type Team = {
  id: string
  name: string
  group: string
  confederation: string
  rating: number
  flag: string
  fifaRanking: number
  keyPlayer: string
  style: string
  isDarkHorse: boolean
  squadUrl: string
}

export type Match = {
  id: string
  stage: Stage
  homeTeamId: string | null
  awayTeamId: string | null
  winnerId: string | null
  xgHome: number | null
  xgAway: number | null
  completed: boolean
}

export type BracketSnapshot = {
  version: 'alpha'
  exportedAt: string
  stage: Stage
  matches: Match[]
  lockedGroups: string[]
  completedAt: string | null
  signedKey: string | null
  metadata?: {
    label?: string
    authorId?: string
    roomId?: string
  }
}

export type Member = {
  id: string
  displayName: string
  hasSubmitted: boolean
  submittedAt: string | null
}

export type RoomStatus = 'lobby' | 'active' | 'complete'

export type Room = {
  id: string
  code: string
  name: string
  adminId: string
  status: RoomStatus
  members: Member[]
  createdAt: string
}

export function isValidSnapshot(data: unknown): data is BracketSnapshot {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  const stages: Stage[] = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final']
  return (
    d.version === 'alpha' &&
    typeof d.exportedAt === 'string' &&
    stages.includes(d.stage as Stage) &&
    Array.isArray(d.matches)
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/contract.ts
git commit -m "refactor: update contract types for new bracket flow"
```

---

### Task 2: Refactor bracketStore

**Files:**
- Modify: `src/stores/bracketStore.ts`

- [ ] **Step 1: Write tests for `lockGroup` and `allGroupsLocked`**

Create `src/stores/__tests__/bracketStore.test.ts`:

```typescript
import { useBracketStore } from '../bracketStore'

beforeEach(() => {
  useBracketStore.getState().initBracket()
})

test('no groups locked on init', () => {
  const { lockedGroups } = useBracketStore.getState()
  expect(lockedGroups).toEqual([])
})

test('lockGroup adds group to lockedGroups', () => {
  useBracketStore.getState().lockGroup('A')
  expect(useBracketStore.getState().lockedGroups).toContain('A')
})

test('lockGroup is idempotent', () => {
  useBracketStore.getState().lockGroup('A')
  useBracketStore.getState().lockGroup('A')
  expect(useBracketStore.getState().lockedGroups.filter(g => g === 'A')).toHaveLength(1)
})

test('allGroupsLocked returns false when not all 12 locked', () => {
  'ABCDEFGHIJK'.split('').forEach(g => useBracketStore.getState().lockGroup(g))
  expect(useBracketStore.getState().allGroupsLocked()).toBe(false)
})

test('allGroupsLocked returns true when all 12 locked', () => {
  'ABCDEFGHIJKL'.split('').forEach(g => useBracketStore.getState().lockGroup(g))
  expect(useBracketStore.getState().allGroupsLocked()).toBe(true)
})

test('isComplete false before final picked', () => {
  expect(useBracketStore.getState().isComplete()).toBe(false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/stores/__tests__/bracketStore.test.ts
```
Expected: FAIL — `lockGroup` not defined

- [ ] **Step 3: Refactor `bracketStore.ts`**

Replace `src/stores/bracketStore.ts` with:

```typescript
import { create } from 'zustand'
import { db } from '../db/database'
import { getGroupMatches, TEAMS } from '../data/tournamentSeeds'
import type { Match, BracketSnapshot, Team, Stage } from '../types/contract'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const GROUP_PAIRS: [string, string][] = [['A','B'],['C','D'],['E','F'],['G','H'],['I','J'],['K','L']]

function matchXg(homeRating: number, awayRating: number) {
  const diff = homeRating - awayRating
  return {
    xgHome: Math.round(Math.max(0.5, 1.2 + diff * 0.03) * 10) / 10,
    xgAway: Math.round(Math.max(0.5, 1.2 - diff * 0.03) * 10) / 10,
  }
}

function slotOf(id: string): number {
  const m = id.match(/-(\d+)$/)
  return m ? parseInt(m[1], 10) : 0
}

export function buildR32Matches(groupOrder: Record<string, string[]>): Match[] {
  const r32: Match[] = []
  let idx = 0

  for (const [g1, g2] of GROUP_PAIRS) {
    const [first1, second1] = groupOrder[g1] ?? []
    const [first2, second2] = groupOrder[g2] ?? []
    const tf1 = TEAMS.find(t => t.id === first1)
    const ts1 = TEAMS.find(t => t.id === second1)
    const tf2 = TEAMS.find(t => t.id === first2)
    const ts2 = TEAMS.find(t => t.id === second2)
    if (!tf1 || !ts1 || !tf2 || !ts2) { idx += 2; continue }

    r32.push({ id: `r32-${idx++}`, stage: 'r32', homeTeamId: first1, awayTeamId: second2, winnerId: null, ...matchXg(tf1.rating, ts2.rating), completed: false })
    r32.push({ id: `r32-${idx++}`, stage: 'r32', homeTeamId: first2, awayTeamId: second1, winnerId: null, ...matchXg(tf2.rating, ts1.rating), completed: false })
  }

  // Best 8 third-placers by FIFA ranking (proxy for points tiebreaker in prediction mode)
  const thirds = GROUP_LETTERS
    .map(g => {
      const teamId = groupOrder[g]?.[2]
      const team: Team | undefined = teamId ? TEAMS.find(t => t.id === teamId) : undefined
      if (!team || !teamId) return null
      return { teamId, team }
    })
    .filter((x): x is { teamId: string; team: Team } => x !== null)
    .sort((a, b) => a.team.fifaRanking - b.team.fifaRanking)
    .slice(0, 8)

  for (let i = 0; i < 4; i++) {
    const home = thirds[i], away = thirds[7 - i]
    if (!home || !away) { idx++; continue }
    r32.push({ id: `r32-${idx++}`, stage: 'r32', homeTeamId: home.teamId, awayTeamId: away.teamId, winnerId: null, ...matchXg(home.team.rating, away.team.rating), completed: false })
  }

  return r32
}

function buildFromPrev(stage: Stage, prevMatches: Match[]): Match[] {
  const count = Math.floor(prevMatches.length / 2)
  const result: Match[] = []
  for (let i = 0; i < count; i++) {
    const m1 = prevMatches[2 * i]
    const m2 = prevMatches[2 * i + 1]
    const homeTeamId = m1?.winnerId ?? null
    const awayTeamId = m2?.winnerId ?? null
    const homeTeam = homeTeamId ? TEAMS.find(t => t.id === homeTeamId) : null
    const awayTeam = awayTeamId ? TEAMS.find(t => t.id === awayTeamId) : null
    const xg = homeTeam && awayTeam ? matchXg(homeTeam.rating, awayTeam.rating) : { xgHome: null, xgAway: null }
    result.push({ id: `${stage}-${i}`, stage, homeTeamId, awayTeamId, winnerId: null, ...xg, completed: false })
  }
  return result
}

function buildThirdPlace(sfMatches: Match[]): Match | null {
  if (sfMatches.length < 2) return null
  const [sf0, sf1] = sfMatches
  const getLoser = (m: Match) => m.winnerId ? (m.winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId) : null
  const homeTeamId = getLoser(sf0)
  const awayTeamId = getLoser(sf1)
  const homeTeam = homeTeamId ? TEAMS.find(t => t.id === homeTeamId) : null
  const awayTeam = awayTeamId ? TEAMS.find(t => t.id === awayTeamId) : null
  const xg = homeTeam && awayTeam ? matchXg(homeTeam.rating, awayTeam.rating) : { xgHome: null, xgAway: null }
  return { id: 'third-0', stage: 'third', homeTeamId, awayTeamId, winnerId: null, ...xg, completed: false }
}

function propagateWinners(current: Match[]): Match[] {
  const byId = new Map(current.map(m => [m.id, m]))
  const groups = current.filter(m => m.stage === 'group')
  const r32 = current.filter(m => m.stage === 'r32').sort((a, b) => slotOf(a.id) - slotOf(b.id))
  if (r32.length === 0) return current

  function merge(next: Match): Match {
    const ex = byId.get(next.id)
    return ex?.completed ? ex : next
  }

  const r16 = buildFromPrev('r16', r32).map(merge)
  const qf = buildFromPrev('qf', r16).map(merge)
  const sf = buildFromPrev('sf', qf).map(merge)
  const final_ = buildFromPrev('final', sf).map(merge)
  const thirdRaw = buildThirdPlace(sf)
  const third = thirdRaw ? [merge(thirdRaw)] : []

  return [...groups, ...r32, ...r16, ...qf, ...sf, ...final_, ...third]
}

function defaultGroupOrder(): Record<string, string[]> {
  const order: Record<string, string[]> = {}
  for (const g of GROUP_LETTERS) {
    order[g] = TEAMS.filter(t => t.group === g).map(t => t.id)
  }
  return order
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

type BracketStore = {
  matches: Match[]
  groupOrder: Record<string, string[]>
  lockedGroups: string[]
  savedSnapshots: { id: string; label: string; snapshot: BracketSnapshot }[]
  initBracket(): void
  setGroupOrder(group: string, order: string[]): void
  lockGroup(group: string): void
  allGroupsLocked(): boolean
  setWinner(matchId: string, winnerId: string): void
  isComplete(): boolean
  exportSnapshot(): BracketSnapshot
  importSnapshot(snapshot: BracketSnapshot): void
  saveSnapshot(label: string): void
  loadSnapshot(id: string): void
  loadSavedSnapshots(): void
}

export const useBracketStore = create<BracketStore>((set, get) => ({
  matches: [],
  groupOrder: defaultGroupOrder(),
  lockedGroups: [],
  savedSnapshots: [],

  initBracket() {
    set({ matches: getGroupMatches(), groupOrder: defaultGroupOrder(), lockedGroups: [] })
  },

  setGroupOrder(group, order) {
    if (get().lockedGroups.includes(group)) return
    set(state => ({ groupOrder: { ...state.groupOrder, [group]: order } }))
  },

  lockGroup(group) {
    set(state => {
      if (state.lockedGroups.includes(group)) return state
      const lockedGroups = [...state.lockedGroups, group]
      const allLocked = lockedGroups.length === GROUP_LETTERS.length
      if (!allLocked) return { lockedGroups }
      // All groups locked — generate full bracket
      const r32 = buildR32Matches(state.groupOrder)
      const matches = propagateWinners([...state.matches.filter(m => m.stage === 'group'), ...r32])
      return { lockedGroups, matches }
    })
  },

  allGroupsLocked() {
    return get().lockedGroups.length === GROUP_LETTERS.length
  },

  setWinner(matchId, winnerId) {
    set(state => {
      const updated = state.matches.map(m =>
        m.id === matchId ? { ...m, winnerId, completed: true } : m
      )
      return { matches: propagateWinners(updated) }
    })
  },

  isComplete() {
    const { matches, allGroupsLocked } = get()
    if (!allGroupsLocked()) return false
    const final = matches.find(m => m.stage === 'final')
    return final?.completed === true
  },

  exportSnapshot(): BracketSnapshot {
    const { matches, lockedGroups } = get()
    const stages = ['group','r32','r16','qf','sf','third','final'] as const
    const latestStage = stages.reduce((acc, s) =>
      matches.some(m => m.stage === s && m.completed) ? s : acc, 'group' as BracketSnapshot['stage'])
    return {
      version: 'alpha',
      exportedAt: new Date().toISOString(),
      stage: latestStage,
      matches,
      lockedGroups,
      completedAt: get().isComplete() ? new Date().toISOString() : null,
      signedKey: null,
    }
  },

  importSnapshot(snapshot) {
    set({
      matches: snapshot.matches,
      lockedGroups: snapshot.lockedGroups ?? [],
    })
  },

  saveSnapshot(label) {
    const snapshot = get().exportSnapshot()
    const id = generateUUID()
    const now = new Date().toISOString()
    db.runSync('INSERT INTO bracket_snapshots (id, label, data, created_at) VALUES (?,?,?,?)',
      id, label, JSON.stringify(snapshot), now)
    get().loadSavedSnapshots()
  },

  loadSnapshot(id) {
    const row = db.getFirstSync<{ data: string }>('SELECT data FROM bracket_snapshots WHERE id = ?', id)
    if (row) get().importSnapshot(JSON.parse(row.data))
  },

  loadSavedSnapshots() {
    const rows = db.getAllSync<{ id: string; label: string; data: string }>(
      'SELECT id, label, data FROM bracket_snapshots ORDER BY created_at DESC'
    )
    set({ savedSnapshots: rows.map(r => ({ id: r.id, label: r.label, snapshot: JSON.parse(r.data) })) })
  },
}))
```

- [ ] **Step 4: Run tests**

```bash
npx jest src/stores/__tests__/bracketStore.test.ts
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/bracketStore.ts src/stores/__tests__/bracketStore.test.ts
git commit -m "refactor: bracketStore — add lockGroup, remove autoSimulate"
```

---

### Task 3: Refactor roomStore + API client

**Files:**
- Modify: `src/stores/roomStore.ts`
- Modify: `src/api/client.ts`

- [ ] **Step 1: Update API client — add `startRoom`, `getMemberBrackets`, `exportBracket`**

Replace `src/api/client.ts`:

```typescript
import type { BracketSnapshot, Room } from '../types/contract'

export function createApiClient(baseUrl: string, deviceId: string) {
  const base = baseUrl.replace(/\/$/, '')

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    if (res.status === 204) return undefined as T
    return res.json()
  }

  return {
    health: () =>
      request<{ status: string; version: string }>('/api/health'),

    createRoom: (name: string, displayName: string) =>
      request<{ room: Room; adminToken: string }>('/api/rooms', {
        method: 'POST', body: JSON.stringify({ name, deviceId, displayName }),
      }),

    joinRoom: (code: string, displayName: string) =>
      request<{ room: Room }>('/api/rooms/join', {
        method: 'POST', body: JSON.stringify({ code, deviceId, displayName }),
      }),

    getRoom: (roomId: string) =>
      request<Room>(`/api/rooms/${roomId}`),

    startRoom: (roomId: string, adminToken: string) =>
      request<{ room: Room }>(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({}),
      }),

    submitBracket: (roomId: string, snapshot: BracketSnapshot) =>
      request<void>(`/api/rooms/${roomId}/submit`, {
        method: 'POST', body: JSON.stringify({ snapshot, deviceId }),
      }),

    getMemberBrackets: (roomId: string) =>
      request<{ memberId: string; displayName: string; snapshot: BracketSnapshot }[]>(
        `/api/rooms/${roomId}/brackets`
      ),

    exportBracket: (roomId: string, snapshot: BracketSnapshot) =>
      request<{ imageUrl: string; signedKey: string }>(`/api/rooms/${roomId}/export`, {
        method: 'POST', body: JSON.stringify({ snapshot, deviceId }),
      }),
  }
}
```

- [ ] **Step 2: Rewrite `roomStore.ts`**

Replace `src/stores/roomStore.ts`:

```typescript
import { create } from 'zustand'
import { db } from '../db/database'
import { createApiClient } from '../api/client'
import { useSettingsStore } from './settingsStore'
import type { Room, BracketSnapshot } from '../types/contract'

type MemberBracket = { memberId: string; displayName: string; snapshot: BracketSnapshot }

type RoomStore = {
  rooms: Room[]
  adminTokenByRoomId: Record<string, string>
  memberBracketsByRoomId: Record<string, MemberBracket[]>
  loadRooms(): void
  createRoom(name: string, displayName: string): Promise<Room>
  joinRoom(code: string, displayName: string): Promise<Room>
  startRoom(roomId: string): Promise<void>
  submitBracket(roomId: string, snapshot: BracketSnapshot): Promise<void>
  loadMemberBrackets(roomId: string): Promise<void>
  exportBracket(roomId: string, snapshot: BracketSnapshot): Promise<{ imageUrl: string; signedKey: string }>
}

function api() {
  const { serverUrl, deviceId } = useSettingsStore.getState()
  return createApiClient(serverUrl, deviceId)
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: [],
  adminTokenByRoomId: {},
  memberBracketsByRoomId: {},

  loadRooms() {
    const rows = db.getAllSync<{ data: string }>('SELECT data FROM rooms_cache ORDER BY updated_at DESC')
    set({ rooms: rows.map(r => JSON.parse(r.data)) })
  },

  async createRoom(name, displayName) {
    const { room, adminToken } = await api().createRoom(name, displayName)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      room.id, JSON.stringify(room), new Date().toISOString())
    set(s => ({
      rooms: [room, ...s.rooms.filter(r => r.id !== room.id)],
      adminTokenByRoomId: { ...s.adminTokenByRoomId, [room.id]: adminToken },
    }))
    return room
  },

  async joinRoom(code, displayName) {
    const { room } = await api().joinRoom(code, displayName)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      room.id, JSON.stringify(room), new Date().toISOString())
    set(s => ({ rooms: [room, ...s.rooms.filter(r => r.id !== room.id)] }))
    return room
  },

  async startRoom(roomId) {
    const adminToken = get().adminTokenByRoomId[roomId]
    if (!adminToken) throw new Error('Not the host')
    const { room } = await api().startRoom(roomId, adminToken)
    set(s => ({ rooms: s.rooms.map(r => r.id === roomId ? room : r) }))
  },

  async submitBracket(roomId, snapshot) {
    await api().submitBracket(roomId, snapshot)
  },

  async loadMemberBrackets(roomId) {
    const brackets = await api().getMemberBrackets(roomId)
    set(s => ({ memberBracketsByRoomId: { ...s.memberBracketsByRoomId, [roomId]: brackets } }))
  },

  async exportBracket(roomId, snapshot) {
    return api().exportBracket(roomId, snapshot)
  },
}))
```

- [ ] **Step 3: Delete unused files**

```bash
rm src/ai/matchPrompt.ts src/components/GroupCard.tsx src/components/MatchCard.tsx src/hooks/useSync.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/roomStore.ts src/api/client.ts
git commit -m "refactor: roomStore and API client for new room flow"
```

---

### Task 4: Group Seeding Screen

**Files:**
- Rewrite: `app/(tabs)/simulate/standings.tsx`
- Delete: `app/(tabs)/simulate/groups.tsx`

- [ ] **Step 1: Delete groups.tsx**

```bash
rm "app/(tabs)/simulate/groups.tsx"
```

- [ ] **Step 2: Rewrite `standings.tsx` as the group seeding screen**

Replace `app/(tabs)/simulate/standings.tsx`:

```typescript
import { useState, useRef, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { TEAMS } from '../../../src/data/tournamentSeeds'
import { useBracketStore } from '../../../src/stores/bracketStore'
import type { Team } from '../../../src/types/contract'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

function positionStyle(index: number, theme: ReturnType<typeof useTheme>) {
  if (index === 0) return { bg: theme.accent + '33', border: theme.accent + '88', badgeBg: '#14532d', badgeColor: '#4ade80', label: '1st' }
  if (index === 1) return { bg: theme.accent + '22', border: theme.accent + '66', badgeBg: '#14532d', badgeColor: '#4ade80', label: '2nd' }
  if (index === 2) return { bg: '#78350f22', border: '#78350f55', badgeBg: '#78350f', badgeColor: '#fbbf24', label: '3rd' }
  return { bg: theme.surface, border: theme.border, badgeBg: theme.surface, badgeColor: theme.subtext, label: '4th' }
}

export default function GroupSeedingScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { groupOrder, setGroupOrder, lockGroup, lockedGroups } = useBracketStore()
  const [activeGroup, setActiveGroup] = useState('A')

  const teams: Team[] = (groupOrder[activeGroup] ?? [])
    .map(id => TEAMS.find(t => t.id === id))
    .filter((t): t is Team => !!t)

  const isLocked = lockedGroups.includes(activeGroup)

  const handleDragEnd = useCallback(({ data }: { data: Team[] }) => {
    setGroupOrder(activeGroup, data.map(t => t.id))
  }, [activeGroup, setGroupOrder])

  const handleLock = useCallback(() => {
    lockGroup(activeGroup)
    const nextIndex = GROUP_LETTERS.indexOf(activeGroup) + 1
    if (nextIndex < GROUP_LETTERS.length) {
      setActiveGroup(GROUP_LETTERS[nextIndex])
    } else {
      router.push('/(tabs)/simulate/bracket')
    }
  }, [activeGroup, lockGroup, router])

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Team>) => {
    const index = getIndex() ?? 0
    const pos = positionStyle(index, theme)
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={isLocked ? undefined : drag}
          disabled={isLocked}
          activeOpacity={0.8}
          style={[styles.row, { backgroundColor: pos.bg, borderColor: pos.border, elevation: isActive ? 4 : 0 }]}
        >
          <View style={[styles.badge, { backgroundColor: pos.badgeBg }]}>
            <Text style={[styles.badgeText, { color: pos.badgeColor }]}>{pos.label}</Text>
          </View>
          <Text style={styles.flag}>{item.flag}</Text>
          <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          {!isLocked && <Text style={[styles.handle, { color: theme.subtext }]}>⠿</Text>}
          {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
        </TouchableOpacity>
      </ScaleDecorator>
    )
  }, [isLocked, theme])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
            <Text style={[styles.topBtnText, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Group Stage</Text>
          <View style={styles.topBtn} />
        </View>

        {/* 12-dot progress strip */}
        <View style={styles.dotStrip}>
          {GROUP_LETTERS.map(g => {
            const locked = lockedGroups.includes(g)
            const active = g === activeGroup
            return (
              <TouchableOpacity key={g} onPress={() => setActiveGroup(g)}>
                <View style={[
                  styles.dot,
                  locked && { backgroundColor: theme.accent },
                  active && !locked && { backgroundColor: '#f59e0b', width: 10, height: 10, borderRadius: 5 },
                  !active && !locked && { backgroundColor: theme.border },
                ]} />
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Group header */}
        <View style={styles.groupHeader}>
          <Text style={[styles.groupTitle, { color: theme.text }]}>GROUP {activeGroup}</Text>
          <Text style={[styles.groupSub, { color: theme.subtext }]}>
            {isLocked ? 'Locked ✓' : 'Long press ⠿ to reorder'}
          </Text>
        </View>

        {/* Draggable list */}
        <DraggableFlatList
          data={teams}
          keyExtractor={item => item.id}
          onDragEnd={handleDragEnd}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />

        {/* Lock button + pill nav */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          {!isLocked ? (
            <TouchableOpacity
              style={[styles.lockBtn, { backgroundColor: theme.accent }]}
              onPress={handleLock}
            >
              <Text style={styles.lockBtnText}>
                Lock Group {activeGroup} {GROUP_LETTERS.indexOf(activeGroup) < GROUP_LETTERS.length - 1 ? '→' : '→ Bracket'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pillNav}>
              <TouchableOpacity onPress={() => {
                const i = GROUP_LETTERS.indexOf(activeGroup)
                if (i > 0) setActiveGroup(GROUP_LETTERS[i - 1])
              }}>
                <Text style={[styles.pillText, { color: theme.subtext }]}>← {GROUP_LETTERS[GROUP_LETTERS.indexOf(activeGroup) - 1] ?? ''}</Text>
              </TouchableOpacity>
              <Text style={[styles.pillActive, { color: theme.accent }]}>{activeGroup} ●</Text>
              <TouchableOpacity onPress={() => {
                const i = GROUP_LETTERS.indexOf(activeGroup)
                if (i < GROUP_LETTERS.length - 1) setActiveGroup(GROUP_LETTERS[i + 1])
              }}>
                <Text style={[styles.pillText, { color: theme.accent }]}>{GROUP_LETTERS[GROUP_LETTERS.indexOf(activeGroup) + 1] ?? ''} →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ThemedView>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  topBtn: { width: 64 },
  topBtnText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  dotStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  groupHeader: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' },
  groupTitle: { fontSize: 18, fontWeight: '800' },
  groupSub: { fontSize: 11, marginTop: 2 },
  list: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 36, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  flag: { fontSize: 24 },
  teamName: { flex: 1, fontSize: 15, fontWeight: '600' },
  handle: { fontSize: 18 },
  lockIcon: { fontSize: 14 },
  footer: { borderTopWidth: 1, padding: 12 },
  lockBtn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  lockBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pillNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  pillText: { fontSize: 13 },
  pillActive: { fontSize: 13, fontWeight: '700' },
})
```

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/simulate/standings.tsx"
git rm "app/(tabs)/simulate/groups.tsx"
git commit -m "feat: group seeding screen with drag-to-order, lock per group, dot progress"
```

---

### Task 5: Knockout Bracket Screen

**Files:**
- Rewrite: `app/(tabs)/simulate/bracket.tsx`

- [ ] **Step 1: Rewrite `bracket.tsx` with round-by-round unlock and friends' picks**

Replace `app/(tabs)/simulate/bracket.tsx`:

```typescript
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useBracketStore } from '../../../src/stores/bracketStore'
import { useRoomStore } from '../../../src/stores/roomStore'
import { getTeamById } from '../../../src/data/tournamentSeeds'
import type { Match, Stage } from '../../../src/types/contract'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'r32', label: 'R32' },
  { key: 'r16', label: 'R16' },
  { key: 'qf', label: 'QF' },
  { key: 'sf', label: 'SF' },
  { key: 'third', label: '3rd' },
  { key: 'final', label: 'Final' },
]

function isStageUnlocked(stage: Stage, matches: Match[]): boolean {
  if (stage === 'r32') return true
  const prev: Stage = stage === 'r16' ? 'r32' : stage === 'qf' ? 'r16' : stage === 'sf' ? 'qf' : stage === 'third' ? 'sf' : stage === 'final' ? 'sf' : 'r32'
  return matches.filter(m => m.stage === prev).every(m => m.completed)
}

export default function BracketScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { matches, setWinner, isComplete, exportSnapshot } = useBracketStore()
  const { memberBracketsByRoomId } = useRoomStore()
  const [activeStage, setActiveStage] = useState<Stage>('r32')

  const stageMatches = matches.filter(m => m.stage === activeStage)
  const allMemberBrackets = Object.values(memberBracketsByRoomId).flat()

  function getFriendPicks(match: Match) {
    return allMemberBrackets
      .map(mb => {
        const m = mb.snapshot.matches.find(fm => fm.id === match.id)
        if (!m?.winnerId) return null
        const team = getTeamById(m.winnerId)
        return { displayName: mb.displayName, flag: team?.flag ?? '?', teamId: m.winnerId }
      })
      .filter(Boolean) as { displayName: string; flag: string; teamId: string }[]
  }

  function handlePick(match: Match, teamId: string) {
    if (match.completed) return
    setWinner(match.id, teamId)
    if (isComplete()) router.push('/(tabs)/simulate/complete')
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={[styles.topBtnText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Bracket</Text>
        <View style={styles.topBtn} />
      </View>

      {/* Round tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabs, { borderBottomColor: theme.border }]} contentContainerStyle={styles.tabsContent}>
        {STAGES.map(s => {
          const unlocked = isStageUnlocked(s.key, matches)
          const active = s.key === activeStage
          return (
            <TouchableOpacity
              key={s.key}
              disabled={!unlocked}
              onPress={() => setActiveStage(s.key)}
              style={[styles.tab, active && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabText, { color: active ? theme.accent : unlocked ? theme.text : theme.subtext }]}>
                {s.label}{!unlocked ? ' 🔒' : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Match list */}
      <ScrollView contentContainerStyle={styles.list}>
        {stageMatches.map(match => {
          const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null
          const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null
          const friendPicks = getFriendPicks(match)

          return (
            <View key={match.id} style={[styles.matchCard, { borderColor: theme.border }]}>
              {/* Home team */}
              <TouchableOpacity
                disabled={match.completed || !home}
                onPress={() => home && handlePick(match, match.homeTeamId!)}
                style={[styles.teamRow, match.winnerId === match.homeTeamId && { backgroundColor: theme.accent + '22' }]}
              >
                <Text style={styles.teamFlag}>{home?.flag ?? '?'}</Text>
                <Text style={[styles.teamName, { color: match.winnerId === match.homeTeamId ? theme.accent : theme.text }]} numberOfLines={1}>
                  {home?.name ?? 'TBD'}
                </Text>
                {match.winnerId === match.homeTeamId && <Text style={[styles.checkmark, { color: theme.accent }]}>✓</Text>}
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Away team */}
              <TouchableOpacity
                disabled={match.completed || !away}
                onPress={() => away && handlePick(match, match.awayTeamId!)}
                style={[styles.teamRow, match.winnerId === match.awayTeamId && { backgroundColor: theme.accent + '22' }]}
              >
                <Text style={styles.teamFlag}>{away?.flag ?? '?'}</Text>
                <Text style={[styles.teamName, { color: match.winnerId === match.awayTeamId ? theme.accent : theme.text }]} numberOfLines={1}>
                  {away?.name ?? 'TBD'}
                </Text>
                {match.winnerId === match.awayTeamId && <Text style={[styles.checkmark, { color: theme.accent }]}>✓</Text>}
              </TouchableOpacity>

              {/* Friends' picks */}
              {friendPicks.length > 0 && (
                <View style={[styles.friendRow, { borderTopColor: theme.border }]}>
                  {friendPicks.map((fp, i) => (
                    <View
                      key={i}
                      style={[
                        styles.friendChip,
                        { borderColor: fp.teamId === match.winnerId ? theme.accent : theme.border },
                      ]}
                    >
                      <Text style={{ fontSize: 10 }}>{fp.flag}</Text>
                      <Text style={[styles.friendName, { color: fp.teamId === match.winnerId ? theme.accent : theme.subtext }]}>
                        {fp.displayName.slice(0, 5)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  topBtn: { width: 64 },
  topBtnText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  tabs: { borderBottomWidth: 1, flexGrow: 0 },
  tabsContent: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  matchCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  teamRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  teamFlag: { fontSize: 24 },
  teamName: { flex: 1, fontSize: 14, fontWeight: '600' },
  checkmark: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1 },
  friendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, padding: 8, borderTopWidth: 1 },
  friendChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 6 },
  friendName: { fontSize: 9 },
})
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/simulate/bracket.tsx"
git commit -m "feat: bracket screen with round-by-round unlock and friends' picks"
```

---

### Task 6: Completed Bracket Final Page

**Files:**
- Create: `app/(tabs)/simulate/complete.tsx`

- [ ] **Step 1: Create `complete.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useBracketStore } from '../../../src/stores/bracketStore'
import { useRoomStore } from '../../../src/stores/roomStore'
import { getTeamById } from '../../../src/data/tournamentSeeds'

export default function CompleteScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { matches, exportSnapshot } = useBracketStore()
  const { rooms, exportBracket } = useRoomStore()
  const [exporting, setExporting] = useState(false)

  const finalMatch = matches.find(m => m.stage === 'final')
  const champion = finalMatch?.winnerId ? getTeamById(finalMatch.winnerId) : null
  const activeRoom = rooms.find(r => r.status === 'active')

  async function handleExport() {
    if (!activeRoom) {
      Alert.alert('No active room', 'Join a room to export your bracket with a signed timestamp.')
      return
    }
    setExporting(true)
    try {
      const snapshot = exportSnapshot()
      const { imageUrl, signedKey } = await exportBracket(activeRoom.id, snapshot)
      Alert.alert('Bracket exported!', `Signed key: ${signedKey.slice(0, 16)}…`, [
        { text: 'View', onPress: () => Linking.openURL(imageUrl) },
        { text: 'OK' },
      ])
    } catch (e) {
      Alert.alert('Export failed', String(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <ThemedView style={styles.container}>
      {/* Champion banner */}
      <View style={[styles.hero, { backgroundColor: theme.accent }]}>
        <Text style={styles.heroEmoji}>{champion?.flag ?? '🏆'}</Text>
        <Text style={styles.heroSub}>YOUR CHAMPION</Text>
        <Text style={styles.heroTitle}>{champion?.name ?? 'Complete your bracket'}</Text>
        <Text style={styles.heroBadge}>Bracket Complete ✓</Text>
      </View>

      <View style={styles.links}>
        {/* Group stage link */}
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/(tabs)/simulate/standings')}
        >
          <Text style={styles.linkIcon}>📋</Text>
          <View style={styles.linkText}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>Group Stage</Text>
            <Text style={[styles.linkSub, { color: theme.subtext }]}>12 groups · all locked</Text>
          </View>
          <Text style={[styles.linkArrow, { color: theme.accent }]}>›</Text>
        </TouchableOpacity>

        {/* Bracket link */}
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/(tabs)/simulate/bracket')}
        >
          <Text style={styles.linkIcon}>🏆</Text>
          <View style={styles.linkText}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>Knockout Bracket</Text>
            <Text style={[styles.linkSub, { color: theme.subtext }]}>R32 → Final</Text>
          </View>
          <Text style={[styles.linkArrow, { color: theme.accent }]}>›</Text>
        </TouchableOpacity>

        {/* Room link */}
        {activeRoom && (
          <TouchableOpacity
            style={[styles.linkCard, { backgroundColor: theme.surface, borderColor: theme.accent + '55' }]}
            onPress={() => router.push(`/(tabs)/rooms/${activeRoom.id}`)}
          >
            <Text style={styles.linkIcon}>👥</Text>
            <View style={styles.linkText}>
              <Text style={[styles.linkTitle, { color: theme.text }]}>Room {activeRoom.code}</Text>
              <Text style={[styles.linkSub, { color: theme.subtext }]}>{activeRoom.members.length} members · view all picks</Text>
            </View>
            <Text style={[styles.linkArrow, { color: theme.accent }]}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Export button */}
      <View style={styles.exportArea}>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: theme.accent, opacity: exporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>{exporting ? 'Exporting…' : 'Export Bracket Photo'}</Text>
        </TouchableOpacity>
        <Text style={[styles.exportNote, { color: theme.subtext }]}>
          Generates a shareable image with a signed timestamp proving when you made your picks.
        </Text>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  heroEmoji: { fontSize: 52, marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  heroBadge: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  links: { padding: 16, gap: 10 },
  linkCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  linkIcon: { fontSize: 24 },
  linkText: { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: '700' },
  linkSub: { fontSize: 12, marginTop: 2 },
  linkArrow: { fontSize: 20, fontWeight: '300' },
  exportArea: { paddingHorizontal: 16, paddingBottom: 32 },
  exportBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  exportNote: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
})
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/simulate/complete.tsx"
git commit -m "feat: completed bracket final page with quick links and export"
```

---

### Task 7: Room Lobby Screen

**Files:**
- Rewrite: `app/(tabs)/rooms/[id].tsx`

- [ ] **Step 1: Rewrite room lobby screen**

Replace `app/(tabs)/rooms/[id].tsx`:

```typescript
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useRoomStore } from '../../../src/stores/roomStore'
import { useBracketStore } from '../../../src/stores/bracketStore'
import type { Member } from '../../../src/types/contract'

export default function RoomLobbyScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { rooms, adminTokenByRoomId, startRoom, submitBracket, loadMemberBrackets, memberBracketsByRoomId } = useRoomStore()
  const { exportSnapshot, isComplete } = useBracketStore()
  const [starting, setStarting] = useState(false)

  const room = rooms.find(r => r.id === id)
  const isHost = !!adminTokenByRoomId[id]
  const memberBrackets = memberBracketsByRoomId[id] ?? []
  const bracketComplete = isComplete()

  useEffect(() => {
    if (room?.status === 'active') loadMemberBrackets(id)
  }, [room?.status])

  async function handleStart() {
    setStarting(true)
    try {
      await startRoom(id)
      // submit own bracket
      await submitBracket(id, exportSnapshot())
    } catch (e) {
      Alert.alert('Failed to start', String(e))
    } finally {
      setStarting(false)
    }
  }

  async function handleSubmit() {
    try {
      await submitBracket(id, exportSnapshot())
      Alert.alert('Bracket submitted!', 'Your picks are locked in.')
    } catch (e) {
      Alert.alert('Submit failed', String(e))
    }
  }

  if (!room) return null

  const isLobby = room.status === 'lobby'
  const isActive = room.status === 'active'

  function renderMember({ item }: { item: Member }) {
    const hasBracket = memberBrackets.some(mb => mb.memberId === item.id)
    return (
      <TouchableOpacity
        style={[styles.memberRow, { borderBottomColor: theme.border }]}
        onPress={() => hasBracket && router.push(`/(tabs)/rooms/${id}/compare?memberId=${item.id}`)}
        disabled={!hasBracket}
      >
        <View style={[styles.memberAvatar, { backgroundColor: theme.surface }]}>
          <Text style={styles.avatarText}>{item.displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.text }]}>{item.displayName}</Text>
          {isActive && (
            <Text style={[styles.memberStatus, { color: hasBracket ? theme.accent : theme.subtext }]}>
              {hasBracket ? 'Bracket submitted ✓' : 'Waiting…'}
            </Text>
          )}
          {isLobby && (
            <Text style={[styles.memberStatus, { color: theme.accent }]}>In lobby ●</Text>
          )}
        </View>
        {hasBracket && <Text style={[styles.viewPicks, { color: theme.accent }]}>View picks ›</Text>}
      </TouchableOpacity>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={[styles.topBtnText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Room {room.code}</Text>
        <View style={styles.topBtn} />
      </View>

      {isLobby && (
        <View style={[styles.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.codeLabel, { color: theme.subtext }]}>ROOM CODE</Text>
          <Text style={[styles.codeValue, { color: theme.accent }]}>{room.code}</Text>
          <Text style={[styles.codeSub, { color: theme.subtext }]}>Share with friends to join</Text>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: theme.subtext }]}>PLAYERS ({room.members.length})</Text>

      <FlatList
        data={room.members}
        keyExtractor={m => m.id}
        renderItem={renderMember}
        style={{ flex: 1 }}
      />

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        {isLobby && isHost && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: starting ? 0.6 : 1 }]}
            onPress={handleStart}
            disabled={starting}
          >
            <Text style={styles.primaryBtnText}>{starting ? 'Starting…' : 'Start Bracket →'}</Text>
          </TouchableOpacity>
        )}
        {isLobby && !isHost && (
          <View style={[styles.waitingBox, { backgroundColor: theme.surface }]}>
            <Text style={[styles.waitingText, { color: theme.subtext }]}>Waiting for host to start…</Text>
          </View>
        )}
        {isActive && bracketComplete && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryBtnText}>Submit My Bracket</Text>
          </TouchableOpacity>
        )}
        {isActive && !bracketComplete && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/(tabs)/simulate/standings')}
          >
            <Text style={styles.primaryBtnText}>Make My Picks →</Text>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  topBtn: { width: 64 },
  topBtnText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  codeBox: { margin: 16, padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  codeLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  codeValue: { fontSize: 36, fontWeight: '900', letterSpacing: 8, marginVertical: 4 },
  codeSub: { fontSize: 11 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingVertical: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberStatus: { fontSize: 11, marginTop: 2 },
  viewPicks: { fontSize: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  waitingBox: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  waitingText: { fontSize: 14 },
})
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/rooms/[id].tsx"
git commit -m "feat: room lobby screen with member list, start button, submit bracket"
```

---

### Task 8: Update Home Screen + Routing

**Files:**
- Modify: `app/(tabs)/simulate/index.tsx`
- Modify: `app/(tabs)/simulate/_layout.tsx`

- [ ] **Step 1: Simplify home screen — remove Import Bracket, point Start to standings**

Replace `app/(tabs)/simulate/index.tsx`:

```typescript
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useBracketStore } from '../../../src/stores/bracketStore'

export default function HomeScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { initBracket } = useBracketStore()

  function handleStart() {
    initBracket()
    router.push('/(tabs)/simulate/standings')
  }

  const actions = [
    { icon: '▶️', title: 'Start Bracket', subtitle: 'Predict group seeds & knockout picks', onPress: handleStart },
    { icon: '🚪', title: 'Join a Room', subtitle: 'Enter code or scan QR to compete with friends', onPress: () => router.push('/(tabs)/rooms') },
  ]

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.hero, { backgroundColor: theme.accent }]}>
        <Text style={styles.heroEmoji}>🏆</Text>
        <Text style={styles.heroSub}>FIFA WORLD CUP</Text>
        <Text style={styles.heroTitle}>2026 Simulator</Text>
        <Text style={styles.heroHosts}>USA · Canada · Mexico</Text>
      </View>
      <ScrollView contentContainerStyle={styles.actions}>
        {actions.map(a => (
          <TouchableOpacity key={a.title} onPress={a.onPress}
            style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>{a.title}</Text>
              <Text style={[styles.actionSub, { color: theme.subtext }]}>{a.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 2 },
  heroHosts: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 },
  actions: { padding: 16, gap: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 14 },
  actionIcon: { fontSize: 28 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700' },
  actionSub: { fontSize: 12, marginTop: 2 },
})
```

- [ ] **Step 2: Update simulate stack layout to include `complete` screen**

Read current `app/(tabs)/simulate/_layout.tsx` then add `complete` to the stack:

```typescript
import { Stack } from 'expo-router'

export default function SimulateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="standings" />
      <Stack.Screen name="bracket" />
      <Stack.Screen name="complete" />
    </Stack>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/simulate/index.tsx" "app/(tabs)/simulate/_layout.tsx"
git commit -m "refactor: home screen simplified, complete screen added to stack"
```

---

### Task 9: Smoke Test

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 2: Run all tests**

```bash
npx jest
```
Expected: All PASS

- [ ] **Step 3: Start dev server and manually verify the flow**

```bash
npx expo start
```

Walk through:
1. Home → Start Bracket → Group Seeding screen shows Group A with 4 teams draggable
2. Long press ⠿ to reorder → teams reorder
3. Tap "Lock Group A" → dot turns green, advances to Group B
4. Lock all 12 groups → navigates to Bracket screen
5. Bracket shows R32 tab unlocked, R16+ locked
6. Pick all R32 winners → R16 unlocks
7. Continue through to Final → navigates to Complete screen
8. Complete screen shows champion, quick links, Export button

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: client UI refactor complete — group seeding, bracket, room lobby, final page"
```
