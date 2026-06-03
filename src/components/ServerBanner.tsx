import { View, Text, StyleSheet } from 'react-native'
import { useServerHealth } from '../hooks/useServerHealth'

export function ServerBanner() {
  const status = useServerHealth()
  if (status !== 'disconnected') return null
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ Server disconnected — room features unavailable</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#78350f',
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  text: {
    color: '#fef3c7',
    fontSize: 11,
    fontWeight: '600',
  },
})
