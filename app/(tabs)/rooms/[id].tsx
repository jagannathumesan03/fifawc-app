import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { MatchCard } from '../../../src/components/MatchCard'
import { useRoomStore } from '../../../src/stores/roomStore'
import { useBracketStore } from '../../../src/stores/bracketStore'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import { useSSE } from '../../../src/hooks/useSSE'
import { createApiClient } from '../../../src/api/client'
import type { Room, ConsensusBracket } from '../../../src/types/contract'

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const theme = useTheme()
  const router = useRouter()
  const { rooms, submitBracket, consensusByRoomId, setConsensus } = useRoomStore()
  const { exportSnapshot } = useBracketStore()
  const { serverUrl, deviceId } = useSettingsStore()

  const [room, setRoom] = useState<Room | null>(rooms.find(r => r.id === id) ?? null)
  const [submitting, setSubmitting] = useState(false)

  const consensus: ConsensusBracket | null = consensusByRoomId[id] ?? null
  const me = room?.members.find(m => m.id === deviceId)
  const isAdmin = room?.adminId === deviceId

  // Refresh room from server
  useEffect(() => {
    if (!serverUrl || !id) return
    const api = createApiClient(serverUrl, deviceId)
    api.getRoom(id).then(setRoom).catch(() => {})
    api.getConsensus(id).then(c => setConsensus(id, c)).catch(() => {})
  }, [id, serverUrl])

  // SSE keeps consensus in the store up-to-date automatically
  useSSE(id)

  async function handleSubmit() {
    if (!id) return
    setSubmitting(true)
    try {
      const snapshot = exportSnapshot()
      await submitBracket(id, snapshot)
      Alert.alert('Submitted!', 'Your bracket has been shared with the room.')
      if (serverUrl) {
        const updated = await createApiClient(serverUrl, deviceId).getRoom(id)
        setRoom(updated)
      }
    } catch {
      Alert.alert('Error', 'Could not submit. Check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!room) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Room</Text>
          <View style={{ width: 64 }} />
        </View>
        <Text style={[styles.empty, { color: theme.subtext }]}>Loading room…</Text>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 64 }}>
          <Text style={[styles.back, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{room.name}</Text>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.accent, opacity: (submitting || !!me?.hasSubmitted) ? 0.5 : 1 }]}
          disabled={submitting || !!me?.hasSubmitted}
          onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>{me?.hasSubmitted ? 'Submitted' : 'Submit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Room code */}
        <View style={[styles.codeRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.codeLabel, { color: theme.subtext }]}>Code</Text>
          <Text style={[styles.code, { color: theme.text }]}>{room.code}</Text>
        </View>

        {/* Members */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Members ({room.members.length})
        </Text>
        <View style={styles.members}>
          {room.members.map(m => (
            <View key={m.id} style={[styles.memberChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.memberDot, { color: m.hasSubmitted ? '#16a34a' : theme.subtext }]}>
                {m.hasSubmitted ? '✓' : '○'}
              </Text>
              <Text style={[styles.memberName, { color: theme.text }]}>{m.displayName}</Text>
              {isAdmin && m.id !== deviceId && (
                <Text style={[styles.adminTag, { color: theme.subtext }]}>admin</Text>
              )}
            </View>
          ))}
        </View>

        {/* Consensus */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Consensus Bracket</Text>
        {!consensus || consensus.matches.length === 0 ? (
          <Text style={[styles.empty, { color: theme.subtext }]}>
            Waiting for members to submit brackets…
          </Text>
        ) : (
          consensus.matches
            .filter((m: ConsensusBracket['matches'][number]) => !m.skipped)
            .map((m: ConsensusBracket['matches'][number]) => (
              <MatchCard key={m.id} match={m} mode="consensus" />
            ))
        )}
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
  back: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  submitBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { padding: 16, gap: 12 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  codeLabel: { fontSize: 12, fontWeight: '600' },
  code: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  memberDot: { fontSize: 12 },
  memberName: { fontSize: 13, fontWeight: '600' },
  adminTag: { fontSize: 10 },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 13 },
})
