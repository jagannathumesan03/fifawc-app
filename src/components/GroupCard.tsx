import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { useTheme } from './ThemedView'
import type { Team } from '../types/contract'

type Props = {
  group: string
  teams: Team[]
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return fullName
  return parts[0][0] + '. ' + parts.slice(1).join(' ')
}

export function GroupCard({ group, teams }: Props) {
  const theme = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.groupLabel, { color: theme.text }]}>GROUP {group}</Text>
        <View style={styles.flagChips}>
          {teams.map(t => (
            <Text key={t.id} style={styles.flagChip}>{t.flag}</Text>
          ))}
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      {teams.map(team => (
        <View key={team.id} style={styles.teamRow}>
          <Text style={styles.flag}>{team.flag}</Text>
          <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1}>{team.name}</Text>
          <TouchableOpacity
            style={[styles.chip, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
            onPress={() => Linking.openURL(team.squadUrl)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: theme.accent }]}>⚽ {shortName(team.keyPlayer)}</Text>
          </TouchableOpacity>
          <Text style={[styles.ranking, { color: theme.subtext }]}>#{team.fifaRanking}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  flagChips: {
    flexDirection: 'row',
    gap: 4,
  },
  flagChip: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  flag: {
    fontSize: 20,
    width: 26,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  ranking: {
    fontSize: 11,
    width: 32,
    textAlign: 'right',
  },
})
