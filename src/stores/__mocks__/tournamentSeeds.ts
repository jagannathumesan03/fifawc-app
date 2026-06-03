import type { Team, Match } from '../../types/contract'

const GROUPS = 'ABCDEFGHIJKL'.split('')

export const TEAMS: Team[] = GROUPS.flatMap(g =>
  ['T1','T2','T3','T4'].map((n, i) => ({
    id: `${g}${n}`,
    name: `Team ${g}${n}`,
    group: g,
    confederation: 'UEFA',
    rating: 70 + i,
    flag: '🏳',
    fifaRanking: 10 + i,
    keyPlayer: 'Player',
    style: 'Balanced',
    isDarkHorse: false,
    squadUrl: '',
  }))
)

export function getGroupMatches(): Match[] {
  const matches: Match[] = []
  let id = 0
  for (const g of GROUPS) {
    const teams = TEAMS.filter(t => t.group === g)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `group-${id++}`,
          stage: 'group',
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          winnerId: null,
          xgHome: 1.2,
          xgAway: 1.2,
          completed: false,
        })
      }
    }
  }
  return matches
}
