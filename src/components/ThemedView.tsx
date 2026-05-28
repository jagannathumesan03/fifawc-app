import { View, type ViewProps } from 'react-native'
import { useSettingsStore } from '../stores/settingsStore'

const LIGHT = {
  bg: '#f5f7fa',
  surface: '#ffffff',
  border: '#e0e6ef',
  text: '#1a1a1a',
  subtext: '#888888',
  accent: '#1565c0',
}

const DARK = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#ffffff',
  subtext: '#8b949e',
  accent: '#4fc3f7',
}

export function useTheme() {
  const { theme } = useSettingsStore()
  return theme === 'dark' ? DARK : LIGHT
}

export function ThemedView({ style, ...props }: ViewProps) {
  const theme = useTheme()
  return <View style={[{ backgroundColor: theme.bg }, style]} {...props} />
}
