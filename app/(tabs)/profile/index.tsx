import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert
} from 'react-native'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import { useBracketStore } from '../../../src/stores/bracketStore'

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ProfileScreen() {
  const theme = useTheme()
  const { serverUrl, deviceId, displayName, theme: colorTheme, lastSyncAt,
    setServerUrl, setDisplayName, setTheme } = useSettingsStore()
  const { savedSnapshots, saveSnapshot, loadSnapshot, loadSavedSnapshots } = useBracketStore()

  const [urlDraft, setUrlDraft] = useState(serverUrl)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [saveLabel, setSaveLabel] = useState('')

  useEffect(() => { loadSavedSnapshots() }, [])

  function handleSaveUrl() {
    setServerUrl(urlDraft.trim())
    Alert.alert('Saved', 'Server URL updated.')
  }

  function handleSaveName() {
    setDisplayName(nameDraft.trim())
    Alert.alert('Saved', 'Display name updated.')
  }

  function handleSaveBracket() {
    const label = saveLabel.trim() || `Bracket ${new Date().toLocaleDateString()}`
    saveSnapshot(label)
    setSaveLabel('')
    Alert.alert('Saved', `"${label}" saved.`)
  }

  function handleLoadSnapshot(id: string, label: string) {
    Alert.alert('Load Bracket', `Replace your current bracket with "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Load', onPress: () => loadSnapshot(id) },
    ])
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity */}
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Identity</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.rowLabel, { color: theme.subtext }]}>Display Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, flex: 1 }]}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Your name"
              placeholderTextColor={theme.subtext}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={handleSaveName}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.subtext }]}>Device ID</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>{deviceId.slice(0, 8)}…</Text>
          </View>
        </View>

        {/* Server */}
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Server</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.rowLabel, { color: theme.subtext }]}>Server URL</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, flex: 1 }]}
              value={urlDraft}
              onChangeText={setUrlDraft}
              placeholder="http://192.168.x.x:3000"
              placeholderTextColor={theme.subtext}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={handleSaveUrl}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.subtext }]}>Last synced</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>{timeAgo(lastSyncAt)}</Text>
          </View>
        </View>

        {/* Theme */}
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.subtext }]}>Theme</Text>
            <View style={styles.themePicker}>
              {(['light', 'dark'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTheme(t)}
                  style={[
                    styles.themeBtn,
                    { borderColor: colorTheme === t ? theme.accent : theme.border },
                    colorTheme === t && { backgroundColor: theme.accent + '22' },
                  ]}>
                  <Text style={[styles.themeBtnText, { color: colorTheme === t ? theme.accent : theme.subtext }]}>
                    {t === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Saved Brackets */}
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Saved Brackets</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, flex: 1 }]}
              value={saveLabel}
              onChangeText={setSaveLabel}
              placeholder={`Bracket ${new Date().toLocaleDateString()}`}
              placeholderTextColor={theme.subtext}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              onPress={handleSaveBracket}>
              <Text style={styles.saveBtnText}>+ Save</Text>
            </TouchableOpacity>
          </View>

          {savedSnapshots.length > 0 && (
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          )}

          {savedSnapshots.map(s => (
            <View key={s.id} style={styles.snapshotRow}>
              <View style={styles.snapshotInfo}>
                <Text style={[styles.snapshotLabel, { color: theme.text }]}>{s.label}</Text>
                <Text style={[styles.snapshotStage, { color: theme.subtext }]}>{s.snapshot.stage}</Text>
              </View>
              <TouchableOpacity
                style={[styles.loadBtn, { borderColor: theme.accent }]}
                onPress={() => handleLoadSnapshot(s.id, s.label)}>
                <Text style={[styles.loadBtnText, { color: theme.accent }]}>Load</Text>
              </TouchableOpacity>
            </View>
          ))}

          {savedSnapshots.length === 0 && (
            <Text style={[styles.empty, { color: theme.subtext }]}>No saved brackets yet.</Text>
          )}
        </View>
      </ScrollView>
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
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  rowValue: { fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  divider: { height: 1 },
  themePicker: { flexDirection: 'row', gap: 8 },
  themeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  themeBtnText: { fontSize: 13, fontWeight: '600' },
  snapshotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  snapshotInfo: { flex: 1 },
  snapshotLabel: { fontSize: 14, fontWeight: '600' },
  snapshotStage: { fontSize: 11, marginTop: 2 },
  loadBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  loadBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 4 },
})
