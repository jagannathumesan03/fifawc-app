import type { Team, Match } from '../types/contract'

type BracketHistory = {
  teamId: string
  beatenOpponents: string[]
}

export function buildMatchPrompt(
  teamA: Team,
  teamB: Team,
  match: Match,
  bracketHistory: BracketHistory[]
): string {
  const stageLabel: Record<string, string> = {
    group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
    qf: 'Quarter-Final', sf: 'Semi-Final', third: 'Third Place Play-off', final: 'Final'
  }

  const historyA = bracketHistory.find(h => h.teamId === teamA.id)
  const historyB = bracketHistory.find(h => h.teamId === teamB.id)

  const pathA = historyA?.beatenOpponents.join(', ') || 'Group stage entry'
  const pathB = historyB?.beatenOpponents.join(', ') || 'Group stage entry'

  return `You are analyzing a FIFA World Cup 2026 ${stageLabel[match.stage] ?? match.stage} matchup.

Team A: ${teamA.name}
- Rating: ${teamA.rating}/100 | Key Player: ${teamA.keyPlayer}
- Tournament wins so far: ${pathA}
- Next: vs ${teamB.name} — ${stageLabel[match.stage]}

Team B: ${teamB.name}
- Rating: ${teamB.rating}/100 | Key Player: ${teamB.keyPlayer}
- Tournament wins so far: ${pathB}
- Next: vs ${teamA.name} — ${stageLabel[match.stage]}

Before making your analysis, research the current status of both teams using:
- ESPN (espn.com) — squad lists and injury tracker
- NBC Sports (nbcsports.com) — confirmed rosters
- Wikipedia (wikipedia.org) — 2026 FIFA World Cup squads
- Yahoo Sports (sports.yahoo.com) — live updates and news

Provide:
1. Current form & key injuries for each team
2. Tactical matchup breakdown (formations, pressing style, set pieces)
3. Key player battle to watch
4. Predicted outcome with reasoning

Be concise. Max 300 words. End with a one-line verdict.`
}
