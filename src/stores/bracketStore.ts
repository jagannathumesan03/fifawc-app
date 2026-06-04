import { create } from 'zustand'
import { db } from '../db/database'
import { getGroupMatches, TEAMS } from '../data/tournamentSeeds'
import type { Match, BracketSnapshot, Team, Stage } from '../types/contract'

let _progressTimer: ReturnType<typeof setTimeout> | null = null

function schedulePush(getSnapshot: () => BracketSnapshot) {
  if (_progressTimer) clearTimeout(_progressTimer)
  _progressTimer = setTimeout(() => {
    try {
      const { rooms, pushProgress } = (require('./roomStore') as { useRoomStore: { getState(): { rooms: import('../types/contract').Room[]; pushProgress(roomId: string, snapshot: BracketSnapshot): Promise<void> } } }).useRoomStore.getState()
      const activeRoom = rooms.find((r: import('../types/contract').Room) => r.status === 'active')
      if (activeRoom) pushProgress(activeRoom.id, getSnapshot())
    } catch { /* store not ready */ }
  }, 500)
}

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

  // Best 8 third-placers: sorted by FIFA ranking (static seeding for prediction mode — no match results to tally)
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
    schedulePush(() => get().exportSnapshot())
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
    schedulePush(() => get().exportSnapshot())
  },

  isComplete() {
    const { matches, allGroupsLocked } = get()
    if (!allGroupsLocked()) return false
    const final = matches.find(m => m.stage === 'final')
    return final?.completed === true
  },

  exportSnapshot(): BracketSnapshot {
    const state = get()
    const { matches, lockedGroups, groupOrder } = state
    const stages = ['group','r32','r16','qf','sf','third','final'] as const
    const latestStage = stages.reduce((acc, s) =>
      matches.some(m => m.stage === s && m.completed) ? s : acc, 'group' as BracketSnapshot['stage'])
    return {
      version: 'alpha',
      exportedAt: new Date().toISOString(),
      stage: latestStage,
      matches,
      lockedGroups,
      groupOrder,
      completedAt: state.isComplete() ? new Date().toISOString() : null,
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
