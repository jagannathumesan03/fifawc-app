import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { useTheme } from './ThemedView'
import type { Match, ConsensusMatch } from '../types/contract'
import { TEAMS } from '../data/tournamentSeeds'

type Props = {
  match: Match | ConsensusMatch
  mode: 'bracket' | 'consensus'
  onSelectWinner?: (matchId: string, teamId: string) => void
  onPress?: () => void
}

function isConsensusMatch(m: Match | ConsensusMatch): m is ConsensusMatch {
  return 'voteHome' in m
}

export function MatchCard({ match, mode, onSelectWinner, onPress }: Props) {
  const theme = useTheme()
  const homeTeam = TEAMS.find(t => t.id === match.homeTeamId)
  const awayTeam = TEAMS.find(t => t.id === match.awayTeamId)

  const homePicked = match.winnerId === match.homeTeamId
  const awayPicked = match.winnerId === match.awayTeamId

  const homeLabel = mode === 'consensus' && isConsensusMatch(match)
    ? `${match.voteHome}/${match.totalVotes}`
    : match.xgHome != null ? `xG ${match.xgHome}` : '—'
  const awayLabel = mode === 'consensus' && isConsensusMatch(match)
    ? `${match.voteAway}/${match.totalVotes}`
    : match.xgAway != null ? `xG ${match.xgAway}` : '—'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TouchableOpacity
        disabled={mode === 'consensus' || !onSelectWinner}
        onPress={() => onSelectWinner?.(match.id, match.homeTeamId!)}
        style={[styles.teamRow, homePicked && { backgroundColor: theme.accent + '22' }]}>
        <Text style={[styles.teamName, { color: homePicked ? theme.accent : theme.text }]}>
          {homeTeam?.flag} {homeTeam?.name ?? match.homeTeamId ?? 'TBD'}
        </Text>
        <Text style={[styles.label, { color: theme.subtext }]}>{homeLabel}</Text>
      </TouchableOpacity>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <TouchableOpacity
        disabled={mode === 'consensus' || !onSelectWinner}
        onPress={() => onSelectWinner?.(match.id, match.awayTeamId!)}
        style={[styles.teamRow, awayPicked && { backgroundColor: theme.accent + '22' }]}>
        <Text style={[styles.teamName, { color: awayPicked ? theme.accent : theme.text }]}>
          {awayTeam?.flag} {awayTeam?.name ?? match.awayTeamId ?? 'TBD'}
        </Text>
        <Text style={[styles.label, { color: theme.subtext }]}>{awayLabel}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  teamName: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12 },
  divider: { height: 1 },
})
