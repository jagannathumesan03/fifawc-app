import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Alert
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { MatchCard } from '../../../src/components/MatchCard'
import { useBracketStore } from '../../../src/stores/bracketStore'
import { TEAMS, getTeamById } from '../../../src/data/tournamentSeeds'
import { buildMatchPrompt } from '../../../src/ai/matchPrompt'
import type { Match, Stage } from '../../../src/types/contract'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'group', label: 'Groups' },
  { key: 'r32', label: 'R32' },
  { key: 'r16', label: 'R16' },
  { key: 'qf', label: 'QF' },
  { key: 'sf', label: 'SF' },
  { key: 'third', label: '3rd' },
  { key: 'final', label: 'Final' },
]

const STAGE_LABELS: Record<Stage, string> = {
  group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-Final', sf: 'Semi-Final', third: 'Third Place', final: 'Final',
}

function buildBracketHistory(matches: Match[]) {
  const history: Record<string, string[]> = {}
  for (const m of matches) {
    if (m.completed && m.winnerId) {
      if (!history[m.winnerId]) history[m.winnerId] = []
      const loserId = m.winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId
      const loser = loserId ? getTeamById(loserId) : null
      if (loser) history[m.winnerId].push(loser.name)
    }
  }
  return TEAMS.map(t => ({ teamId: t.id, beatenOpponents: history[t.id] ?? [] }))
}

export default function BracketScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { matches, setWinner, exportSnapshot } = useBracketStore()

  const groupsDone = matches.filter(m => m.stage === 'group').every(m => m.completed)
  const [activeStage, setActiveStage] = useState<Stage>(groupsDone ? 'r32' : 'group')
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  const stageMatches = matches.filter(m => m.stage === activeStage)

  function handleExport() {
    const snapshot = exportSnapshot()
    Alert.alert('Exported', `${snapshot.matches.length} matches at stage: ${snapshot.stage}`)
  }

  async function handleAskAI(match: Match) {
    const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null
    const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null
    if (!home || !away) return
    const history = buildBracketHistory(matches)
    const prompt = buildMatchPrompt(home, away, match, history)
    await Clipboard.setStringAsync(prompt)
    Alert.alert('Copied!', 'Paste this prompt into Claude or ChatGPT.')
  }

  const homeTeam = selectedMatch?.homeTeamId ? getTeamById(selectedMatch.homeTeamId) : null
  const awayTeam = selectedMatch?.awayTeamId ? getTeamById(selectedMatch.awayTeamId) : null

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={[styles.topBtnText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Bracket</Text>
        <TouchableOpacity onPress={handleExport} style={styles.topBtn}>
          <Text style={[styles.topBtnText, { color: theme.accent, textAlign: 'right' }]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Stage tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabs, { borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabsContent}>
        {STAGES.map(s => {
          const active = s.key === activeStage
          return (
            <TouchableOpacity key={s.key} onPress={() => setActiveStage(s.key)}
              style={[styles.tab, active && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabText, { color: active ? theme.accent : theme.subtext }]}>{s.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Match list */}
      <ScrollView contentContainerStyle={styles.list}>
        {stageMatches.length === 0 ? (
          <Text style={[styles.empty, { color: theme.subtext }]}>
            No matches for this stage yet.
          </Text>
        ) : (
          stageMatches.map(m => (
            <MatchCard key={m.id} match={m} mode="bracket"
              onSelectWinner={(matchId, teamId) => setWinner(matchId, teamId)}
              onPress={() => setSelectedMatch(m)} />
          ))
        )}
      </ScrollView>

      {/* MatchDetailSheet */}
      <Modal visible={!!selectedMatch} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {selectedMatch && (
              <>
                <Text style={[styles.sheetStage, { color: theme.subtext }]}>
                  {STAGE_LABELS[selectedMatch.stage]}
                </Text>

                <View style={styles.sheetTeams}>
                  <View style={styles.sheetTeam}>
                    <Text style={styles.sheetFlag}>{homeTeam?.flag ?? '?'}</Text>
                    <Text style={[styles.sheetTeamName, { color: theme.text }]} numberOfLines={1}>
                      {homeTeam?.name ?? selectedMatch.homeTeamId ?? 'TBD'}
                    </Text>
                    <Text style={[styles.sheetXg, { color: theme.subtext }]}>
                      xG {selectedMatch.xgHome ?? '—'}
                    </Text>
                  </View>
                  <Text style={[styles.sheetVs, { color: theme.subtext }]}>vs</Text>
                  <View style={styles.sheetTeam}>
                    <Text style={styles.sheetFlag}>{awayTeam?.flag ?? '?'}</Text>
                    <Text style={[styles.sheetTeamName, { color: theme.text }]} numberOfLines={1}>
                      {awayTeam?.name ?? selectedMatch.awayTeamId ?? 'TBD'}
                    </Text>
                    <Text style={[styles.sheetXg, { color: theme.subtext }]}>
                      xG {selectedMatch.xgAway ?? '—'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.sheetDivider, { backgroundColor: theme.border }]} />

                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    disabled={!homeTeam || selectedMatch.completed}
                    style={[styles.pickBtn, { backgroundColor: theme.accent, opacity: (!homeTeam || selectedMatch.completed) ? 0.4 : 1 }]}
                    onPress={() => { setWinner(selectedMatch.id, selectedMatch.homeTeamId!); setSelectedMatch(null) }}>
                    <Text style={styles.pickBtnText}>Pick {homeTeam?.name ?? 'Home'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!awayTeam || selectedMatch.completed}
                    style={[styles.pickBtn, { backgroundColor: theme.accent, opacity: (!awayTeam || selectedMatch.completed) ? 0.4 : 1 }]}
                    onPress={() => { setWinner(selectedMatch.id, selectedMatch.awayTeamId!); setSelectedMatch(null) }}>
                    <Text style={styles.pickBtnText}>Pick {awayTeam?.name ?? 'Away'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  disabled={!homeTeam || !awayTeam}
                  style={[styles.aiBtn, { borderColor: theme.accent, opacity: (!homeTeam || !awayTeam) ? 0.4 : 1 }]}
                  onPress={() => handleAskAI(selectedMatch)}>
                  <Text style={[styles.aiBtnText, { color: theme.accent }]}>Ask AI (copy prompt)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMatch(null)}>
                  <Text style={[styles.closeBtnText, { color: theme.subtext }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  topBtn: { width: 64 },
  topBtnText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  tabs: { borderBottomWidth: 1, flexGrow: 0 },
  tabsContent: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 12 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  // Sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  sheetStage: { fontSize: 12, textAlign: 'center', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  sheetTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTeam: { flex: 1, alignItems: 'center', gap: 4 },
  sheetFlag: { fontSize: 36 },
  sheetTeamName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  sheetXg: { fontSize: 12 },
  sheetVs: { fontSize: 16, fontWeight: '700', paddingHorizontal: 8 },
  sheetDivider: { height: 1, marginBottom: 20 },
  sheetActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pickBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  aiBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  aiBtnText: { fontWeight: '700', fontSize: 13 },
  closeBtn: { alignItems: 'center' },
  closeBtnText: { fontSize: 14 },
})
