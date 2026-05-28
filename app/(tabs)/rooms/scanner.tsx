import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useRoomStore } from '../../../src/stores/roomStore'
import { useSettingsStore } from '../../../src/stores/settingsStore'

export default function ScannerScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const { joinRoom } = useRoomStore()
  const storedName = useSettingsStore(s => s.deviceId)

  useEffect(() => { requestPermission() }, [])

  async function handleBarcode({ data }: { data: string }) {
    if (scanned) return
    setScanned(true)

    // Extract code from URL (?code=WC2026-XXXX) or use raw value if it looks like a code
    let code = data
    try {
      const url = new URL(data)
      code = url.searchParams.get('code') ?? data
    } catch {
      // not a URL, use data directly
    }

    if (!code.startsWith('WC2026-')) {
      Alert.alert('Invalid QR', 'This QR code is not a WC2026 room code.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
        { text: 'Cancel', onPress: () => router.back() },
      ])
      return
    }

    try {
      const name = displayName.trim() || `Player-${storedName.slice(0, 4)}`
      const room = await joinRoom(code, name)
      router.replace(`/(tabs)/rooms/${room.id}`)
    } catch {
      Alert.alert('Error', 'Could not join room.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
        { text: 'Cancel', onPress: () => router.back() },
      ])
    }
  }

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permText}>Camera access is needed to scan QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanFrame} />
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.hint}>Point at a WC2026 room QR code</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const FRAME = 240

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  permText: { color: '#fff', fontSize: 15, textAlign: 'center' },
  permBtn: { backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  permBtnText: { color: '#fff', fontWeight: '700' },
  cancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  middleRow: { flexDirection: 'row', height: FRAME },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrame: {
    width: FRAME,
    height: FRAME,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 24,
    gap: 20,
  },
  hint: { color: '#fff', fontSize: 14 },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelBtnText: { color: '#fff', fontWeight: '700' },
})
