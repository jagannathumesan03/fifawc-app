import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { useBracketStore } from '../../../src/stores/bracketStore'

export default function HomeScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { initBracket } = useBracketStore()

  function handleStart() {
    initBracket()
    router.push('/(tabs)/simulate/standings')
  }

  const actions = [
    { icon: '▶️', title: 'Start Bracket', subtitle: 'Predict group seeds & knockout picks', onPress: handleStart },
    { icon: '🚪', title: 'Join a Room', subtitle: 'Enter code or scan QR to compete with friends', onPress: () => router.push('/(tabs)/rooms') },
  ]

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.hero, { backgroundColor: theme.accent }]}>
        <Text style={styles.heroEmoji}>🏆</Text>
        <Text style={styles.heroSub}>FIFA WORLD CUP</Text>
        <Text style={styles.heroTitle}>2026 Simulator</Text>
        <Text style={styles.heroHosts}>USA · Canada · Mexico</Text>
      </View>
      <ScrollView contentContainerStyle={styles.actions}>
        {actions.map(a => (
          <TouchableOpacity key={a.title} onPress={a.onPress}
            style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>{a.title}</Text>
              <Text style={[styles.actionSub, { color: theme.subtext }]}>{a.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 2 },
  heroHosts: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 },
  actions: { padding: 16, gap: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 14 },
  actionIcon: { fontSize: 28 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700' },
  actionSub: { fontSize: 12, marginTop: 2 },
})
