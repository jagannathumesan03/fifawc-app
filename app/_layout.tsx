import 'react-native-gesture-handler'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { useSettingsStore } from '../src/stores/settingsStore'

export default function RootLayout() {
  const initSettings = useSettingsStore(s => s.initSettings)

  useEffect(() => {
    initSettings()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  )
}
