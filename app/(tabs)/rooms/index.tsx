import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useRoomStore } from '../../../src/stores/roomStore'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import type { Room } from '../../../src/types/contract'
import { ServerBanner } from '../../../src/components/ServerBanner'

type Sheet = 'none' | 'join' | 'create'

export default function RoomsScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { rooms, loadRooms, joinRoom, createRoom } = useRoomStore()
  const { deviceId, displayName: savedName } = useSettingsStore()

  const [sheet, setSheet] = useState<Sheet>('none')
  const [code, setCode] = useState('WC2026-')
  const [displayName, setDisplayName] = useState(savedName)
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadRooms() }, [])

  async function handleJoin() {
    if (!displayName.trim()) return Alert.alert('Name required', 'Enter your display name.')
    setLoading(true)
    try {
      const room = await joinRoom(code.trim().toUpperCase(), displayName.trim())
      setSheet('none')
      router.push(`/(tabs)/rooms/${room.id}`)
    } catch {
      Alert.alert('Error', 'Could not join room. Check the code and server URL.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!roomName.trim() || !displayName.trim()) return Alert.alert('Fields required', 'Enter a room name and your display name.')
    if (!deviceId) return Alert.alert('Not ready', 'App is still loading. Try again in a moment.')
    setLoading(true)
    try {
      const room = await createRoom(roomName.trim(), displayName.trim())
      setSheet('none')
      router.push(`/(tabs)/rooms/${room.id}`)
    } catch (e) {
      Alert.alert('Error', `Could not create room: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  function handleScanQR() {
    setSheet('none')
    router.push('/(tabs)/rooms/scanner')
  }

  function renderRoom({ item }: { item: Room }) {
    const submitted = item.members.find(m => m.id === deviceId)?.hasSubmitted
    return (
      <TouchableOpacity
        style={[styles.roomCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push(`/(tabs)/rooms/${item.id}`)}
        activeOpacity={0.8}>
        <View style={styles.roomInfo}>
          <Text style={[styles.roomName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.roomCode, { color: theme.subtext }]}>{item.code}</Text>
        </View>
        <View style={styles.roomMeta}>
          {submitted && <Text style={[styles.badge, { color: '#16a34a' }]}>Submitted</Text>}
          <Text style={[styles.chevron, { color: theme.subtext }]}>›</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Rooms</Text>
      </View>

      <ServerBanner />
      <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={() => { setRoomName(''); setDisplayName(savedName); setSheet('create') }}>
          <Text style={styles.btnText}>+ Create Room</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.accent }]}
          onPress={() => { setCode('WC2026-'); setDisplayName(savedName); setSheet('join') }}>
          <Text style={[styles.btnText, { color: theme.accent }]}>Join Room</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={r => r.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.subtext }]}>No rooms yet. Create or join one.</Text>
        }
      />

      {/* Join sheet */}
      <Modal visible={sheet === 'join'} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Join a Room</Text>

            <Text style={[styles.label, { color: theme.subtext }]}>Room Code</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              placeholder="WC2026-XXXX"
              placeholderTextColor={theme.subtext}
            />

            <Text style={[styles.label, { color: theme.subtext }]}>Your Name</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={theme.subtext}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}
              onPress={handleJoin}
              disabled={loading}>
              <Text style={styles.primaryBtnText}>Join with Code</Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.orText, { color: theme.subtext }]}>or</Text>
              <View style={[styles.orLine, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.accent }]}
              onPress={handleScanQR}>
              <Text style={[styles.secondaryBtnText, { color: theme.accent }]}>Scan QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSheet('none')}>
              <Text style={[styles.cancelText, { color: theme.subtext }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create sheet */}
      <Modal visible={sheet === 'create'} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Create a Room</Text>

            <Text style={[styles.label, { color: theme.subtext }]}>Room Name</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="e.g. Friends Cup 2026"
              placeholderTextColor={theme.subtext}
            />

            <Text style={[styles.label, { color: theme.subtext }]}>Your Name</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={theme.subtext}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}
              onPress={handleCreate}
              disabled={loading}>
              <Text style={styles.primaryBtnText}>Create Room</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSheet('none')}>
              <Text style={[styles.cancelText, { color: theme.subtext }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: '800' },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, gap: 10 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: '700' },
  roomCode: { fontSize: 12, marginTop: 2 },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 20 },
  // Sheet
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  primaryBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12 },
  secondaryBtn: { paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  secondaryBtnText: { fontWeight: '700', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14 },
})
