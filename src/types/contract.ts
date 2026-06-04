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
  groupOrder: Record<string, string[]>
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
