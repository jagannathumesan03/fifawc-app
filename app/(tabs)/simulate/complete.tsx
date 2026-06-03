import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useBracketStore } from '../../../src/stores/bracketStore'
import { useRoomStore } from '../../../src/stores/roomStore'
import { getTeamById } from '../../../src/data/tournamentSeeds'

export default function CompleteScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { matches, exportSnapshot } = useBracketStore()
  const { rooms, exportBracket } = useRoomStore()
  const [exporting, setExporting] = useState(false)

  const finalMatch = matches.find(m => m.stage === 'final')
  const champion = finalMatch?.winnerId ? getTeamById(finalMatch.winnerId) : null
  const activeRoom = rooms.find(r => r.status === 'active')

  async function handleExport() {
    if (!activeRoom) {
      Alert.alert('No active room', 'Join a room to export your bracket with a signed timestamp.')
      return
    }
    setExporting(true)
    try {
      const snapshot = exportSnapshot()
      const { imageUrl, signedKey } = await exportBracket(activeRoom.id, snapshot)
      Alert.alert('Bracket exported!', `Signed key: ${signedKey.slice(0, 16)}…`, [
        { text: 'View', onPress: () => Linking.openURL(imageUrl) },
        { text: 'OK' },
      ])
    } catch (e) {
      Alert.alert('Export failed', String(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <ThemedView style={styles.container}>
      {/* Champion banner */}
      <View style={[styles.hero, { backgroundColor: theme.accent }]}>
        <Text style={styles.heroEmoji}>{champion?.flag ?? '🏆'}</Text>
        <Text style={styles.heroSub}>YOUR CHAMPION</Text>
        <Text style={styles.heroTitle}>{champion?.name ?? 'Complete your bracket'}</Text>
        <Text style={styles.heroBadge}>Bracket Complete ✓</Text>
      </View>

      <View style={styles.links}>
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/(tabs)/simulate/standings')}
        >
          <Text style={styles.linkIcon}>📋</Text>
          <View style={styles.linkText}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>Group Stage</Text>
            <Text style={[styles.linkSub, { color: theme.subtext }]}>12 groups · all locked</Text>
          </View>
          <Text style={[styles.linkArrow, { color: theme.accent }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/(tabs)/simulate/bracket')}
        >
          <Text style={styles.linkIcon}>🏆</Text>
          <View style={styles.linkText}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>Knockout Bracket</Text>
            <Text style={[styles.linkSub, { color: theme.subtext }]}>R32 → Final</Text>
          </View>
          <Text style={[styles.linkArrow, { color: theme.accent }]}>›</Text>
        </TouchableOpacity>

        {activeRoom && (
          <TouchableOpacity
            style={[styles.linkCard, { backgroundColor: theme.surface, borderColor: theme.accent + '55' }]}
            onPress={() => router.push(`/(tabs)/rooms/${activeRoom.id}`)}
          >
            <Text style={styles.linkIcon}>👥</Text>
            <View style={styles.linkText}>
              <Text style={[styles.linkTitle, { color: theme.text }]}>Room {activeRoom.code}</Text>
              <Text style={[styles.linkSub, { color: theme.subtext }]}>{activeRoom.members.length} members · view all picks</Text>
            </View>
            <Text style={[styles.linkArrow, { color: theme.accent }]}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.exportArea}>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: theme.accent, opacity: exporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>{exporting ? 'Exporting…' : 'Export Bracket Photo'}</Text>
        </TouchableOpacity>
        <Text style={[styles.exportNote, { color: theme.subtext }]}>
          Generates a shareable image with a signed timestamp proving when you made your picks.
        </Text>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  heroEmoji: { fontSize: 52, marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  heroBadge: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  links: { padding: 16, gap: 10 },
  linkCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  linkIcon: { fontSize: 24 },
  linkText: { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: '700' },
  linkSub: { fontSize: 12, marginTop: 2 },
  linkArrow: { fontSize: 20, fontWeight: '300' },
  exportArea: { paddingHorizontal: 16, paddingBottom: 32 },
  exportBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  exportNote: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
})
