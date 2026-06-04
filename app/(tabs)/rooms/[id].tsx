import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useRoomStore } from '../../../src/stores/roomStore'
import { useBracketStore } from '../../../src/stores/bracketStore'
import type { Member } from '../../../src/types/contract'

export default function RoomLobbyScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>()
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const { rooms, adminTokenByRoomId, startRoom, submitBracket, loadMemberBrackets, memberBracketsByRoomId, refreshRoom } = useRoomStore()
  const { exportSnapshot, isComplete } = useBracketStore()
  const [starting, setStarting] = useState(false)

  const room = rooms.find(r => r.id === id)
  const isHost = !!adminTokenByRoomId[id]
  const memberBrackets = memberBracketsByRoomId[id] ?? []
  const bracketComplete = isComplete()

  useEffect(() => {
    if (room?.status === 'active') loadMemberBrackets(id)
  }, [room?.status])

  useEffect(() => {
    if (!id) return
    const INTERVAL = room?.status === 'lobby' ? 4000 : 8000
    const timer = setInterval(() => {
      refreshRoom(id).catch(() => {})
      if (room?.status === 'active') loadMemberBrackets(id).catch(() => {})
    }, INTERVAL)
    return () => clearInterval(timer)
  }, [id, room?.status])

  async function handleStart() {
    setStarting(true)
    try {
      await startRoom(id)
    } catch (e) {
      Alert.alert('Failed to start', String(e))
    } finally {
      setStarting(false)
    }
  }

  async function handleSubmit() {
    try {
      await submitBracket(id, exportSnapshot())
      Alert.alert('Bracket submitted!', 'Your picks are locked in.')
    } catch (e) {
      Alert.alert('Submit failed', String(e))
    }
  }

  if (!room) return null

  const isLobby = room.status === 'lobby'
  const isActive = room.status === 'active'

  function renderMember({ item }: { item: Member }) {
    const hasBracket = memberBrackets.some(mb => mb.memberId === item.id)
    return (
      <TouchableOpacity
        style={[styles.memberRow, { borderBottomColor: theme.border }]}
        onPress={() => hasBracket && router.push(`/(tabs)/rooms/${id}/compare?memberId=${item.id}`)}
        disabled={!hasBracket}
      >
        <View style={[styles.memberAvatar, { backgroundColor: theme.surface }]}>
          <Text style={styles.avatarText}>{item.displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.text }]}>{item.displayName}</Text>
          {isActive && (
            <Text style={[styles.memberStatus, { color: hasBracket ? theme.accent : theme.subtext }]}>
              {hasBracket ? 'Bracket submitted ✓' : 'Waiting…'}
            </Text>
          )}
          {isLobby && (
            <Text style={[styles.memberStatus, { color: theme.accent }]}>In lobby ●</Text>
          )}
        </View>
        {hasBracket && <Text style={[styles.viewPicks, { color: theme.accent }]}>View picks ›</Text>}
      </TouchableOpacity>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={[styles.topBtnText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Room {room.code}</Text>
        <View style={styles.topBtn} />
      </View>

      {isLobby && (
        <View style={[styles.codeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.codeLabel, { color: theme.subtext }]}>ROOM CODE</Text>
          <Text style={[styles.codeValue, { color: theme.accent }]}>{room.code}</Text>
          <Text style={[styles.codeSub, { color: theme.subtext }]}>Share with friends to join</Text>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: theme.subtext }]}>PLAYERS ({room.members.length})</Text>

      <FlatList
        data={room.members}
        keyExtractor={m => m.id}
        renderItem={renderMember}
        style={{ flex: 1 }}
      />

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        {isLobby && isHost && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: starting ? 0.6 : 1 }]}
            onPress={handleStart}
            disabled={starting}
          >
            <Text style={styles.primaryBtnText}>{starting ? 'Starting…' : 'Start Bracket →'}</Text>
          </TouchableOpacity>
        )}
        {isLobby && !isHost && (
          <View style={[styles.waitingBox, { backgroundColor: theme.surface }]}>
            <Text style={[styles.waitingText, { color: theme.subtext }]}>Waiting for host to start…</Text>
          </View>
        )}
        {isActive && bracketComplete && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryBtnText}>Submit My Bracket</Text>
          </TouchableOpacity>
        )}
        {isActive && !bracketComplete && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/(tabs)/simulate/standings')}
          >
            <Text style={styles.primaryBtnText}>Make My Picks →</Text>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  topBtn: { width: 64 },
  topBtnText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  codeBox: { margin: 16, padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  codeLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  codeValue: { fontSize: 36, fontWeight: '900', letterSpacing: 8, marginVertical: 4 },
  codeSub: { fontSize: 11 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingVertical: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberStatus: { fontSize: 11, marginTop: 2 },
  viewPicks: { fontSize: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  waitingBox: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  waitingText: { fontSize: 14 },
})
