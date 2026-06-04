import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
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
  const { matches, setWinner, isComplete } = useBracketStore()
  const { memberBracketsByRoomId, memberProgressByRoomId, loadMemberProgress, rooms } = useRoomStore()
  const [activeStage, setActiveStage] = useState<Stage>('r32')

  const activeRoomId = rooms.find(r => r.status === 'active')?.id ?? null

  useEffect(() => {
    if (!activeRoomId) return
    loadMemberProgress(activeRoomId)
    const id = setInterval(() => loadMemberProgress(activeRoomId), 10000)
    return () => clearInterval(id)
  }, [activeRoomId])

  const stageMatches = matches.filter(m => m.stage === activeStage)
  const progressEntries = activeRoomId ? (memberProgressByRoomId[activeRoomId] ?? []) : []
  const finalEntries = activeRoomId ? (memberBracketsByRoomId[activeRoomId] ?? []) : []
  const finalMemberIds = new Set(finalEntries.map(e => e.memberId))
  const allMemberBrackets = [
    ...progressEntries.filter(e => !finalMemberIds.has(e.memberId)),
    ...finalEntries,
  ]

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

              {friendPicks.length > 0 && (
                <View style={[styles.friendRow, { borderTopColor: theme.border }]}>
                  {friendPicks.map((fp, i) => (
                    <View
                      key={i}
                      style={[styles.friendChip, { borderColor: fp.teamId === match.winnerId ? theme.accent : theme.border }]}
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
