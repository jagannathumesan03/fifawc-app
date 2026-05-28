import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { GroupCard } from '../../../src/components/GroupCard'
import { TEAMS } from '../../../src/data/tournamentSeeds'
import { useBracketStore } from '../../../src/stores/bracketStore'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export default function GroupsScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { matches, autoSimulate } = useBracketStore()

  const hasCompleted = matches.some(m => m.stage === 'group' && m.completed)

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Group Stage</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.bracketBtn, { borderColor: theme.border }]}
          onPress={() => router.push('/(tabs)/simulate/standings')}
          activeOpacity={0.8}
        >
          <Text style={[styles.bracketBtnText, { color: theme.text }]}>Standings</Text>
        </TouchableOpacity>
        {hasCompleted && (
          <TouchableOpacity
            style={[styles.bracketBtn, { borderColor: theme.accent }]}
            onPress={() => router.push('/(tabs)/simulate/bracket')}
            activeOpacity={0.8}
          >
            <Text style={[styles.bracketBtnText, { color: theme.accent }]}>Bracket →</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.simulateBtn, { backgroundColor: theme.accent }]}
          onPress={autoSimulate}
          activeOpacity={0.8}
        >
          <Text style={styles.simulateBtnText}>Auto-simulate all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {GROUP_LETTERS.map(letter => (
          <GroupCard
            key={letter}
            group={letter}
            teams={TEAMS.filter(t => t.group === letter)}
          />
        ))}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 64 },
  backText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  simulateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  simulateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bracketBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bracketBtnText: { fontSize: 13, fontWeight: '700' },
  list: { padding: 12, gap: 12 },
})
