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

function buildR32Matches(groupOrder: Record<string, string[]>, groupMatches: Match[]): Match[] {
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

  const thirds = GROUP_LETTERS
    .map(g => {
      const teamId = groupOrder[g]?.[2]
      const team: Team | undefined = teamId ? TEAMS.find(t => t.id === teamId) : undefined
      if (!team || !teamId) return null
      const wins = groupMatches.filter(m => m.stage === 'group' && m.completed && m.winnerId === teamId).length
      return { teamId, team, wins }
    })
    .filter((x): x is { teamId: string; team: Team; wins: number } => x !== null)
    .sort((a, b) => b.wins - a.wins || b.team.rating - a.team.rating)
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

// Rebuilds all knockout rounds from R32 onwards, preserving already-completed matches.
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

function poissonGoals(xg: number): number {
  const L = Math.exp(-xg)
  let k = 0, p = 1
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

type BracketStore = {
  matches: Match[]
  savedSnapshots: { id: string; label: string; snapshot: BracketSnapshot }[]
  pendingSyncMatchIds: string[]
  groupOrder: Record<string, string[]>
  initBracket(): void
  setWinner(matchId: string, winnerId: string): void
  autoSimulate(): void
  exportSnapshot(): BracketSnapshot
  importSnapshot(snapshot: BracketSnapshot): void
  saveSnapshot(label: string): void
  loadSnapshot(id: string): void
  loadSavedSnapshots(): void
  setGroupOrder(group: string, order: string[]): void
}

export const useBracketStore = create<BracketStore>((set, get) => ({
  matches: [],
  savedSnapshots: [],
  pendingSyncMatchIds: [],
  groupOrder: defaultGroupOrder(),

  initBracket() {
    set({ matches: getGroupMatches(), pendingSyncMatchIds: [], groupOrder: defaultGroupOrder() })
  },

  setGroupOrder(group, order) {
    set(state => {
      const newGroupOrder = { ...state.groupOrder, [group]: order }
      const groupMatches = state.matches.filter(m => m.stage === 'group')
      const r32 = buildR32Matches(newGroupOrder, groupMatches)
      return { groupOrder: newGroupOrder, matches: propagateWinners([...groupMatches, ...r32]) }
    })
  },

  setWinner(matchId, winnerId) {
    set(state => {
      const updated = state.matches.map(m =>
        m.id === matchId ? { ...m, winnerId, completed: true } : m
      )
      return {
        matches: propagateWinners(updated),
        pendingSyncMatchIds: [...new Set([...state.pendingSyncMatchIds, matchId])],
      }
    })
  },

  autoSimulate() {
    set(state => {
      const simulated = state.matches.map(m => {
        if (m.stage !== 'group' || m.completed || !m.homeTeamId || !m.awayTeamId || !m.xgHome || !m.xgAway) return m
        const homeGoals = poissonGoals(m.xgHome)
        const awayGoals = poissonGoals(m.xgAway)
        const winnerId = homeGoals >= awayGoals ? m.homeTeamId : m.awayTeamId
        return { ...m, winnerId, completed: true }
      })
      const r32 = buildR32Matches(state.groupOrder, simulated)
      const withR32 = [...simulated.filter(m => m.stage === 'group'), ...r32]
      return {
        matches: propagateWinners(withR32),
        pendingSyncMatchIds: state.matches.filter(m => !m.completed && m.stage === 'group').map(m => m.id),
      }
    })
  },

  exportSnapshot(): BracketSnapshot {
    const { matches } = get()
    const stages = ['group','r32','r16','qf','sf','third','final'] as const
    const latestStage = stages.reduce((acc, s) =>
      matches.some(m => m.stage === s && m.completed) ? s : acc, 'group' as BracketSnapshot['stage'])
    return {
      version: 'alpha',
      exportedAt: new Date().toISOString(),
      stage: latestStage,
      matches,
    }
  },

  importSnapshot(snapshot) {
    set(state => ({
      matches: state.matches.map(local => {
        const incoming = snapshot.matches.find(m => m.id === local.id)
        if (incoming?.completed) return incoming
        return local
      })
    }))
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
