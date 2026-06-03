import { Stack } from 'expo-router'

export default function SimulateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="standings" />
      <Stack.Screen name="bracket" />
      <Stack.Screen name="complete" />
    </Stack>
  )
}
