import { Text } from 'react-native'
import { Tabs } from 'expo-router'

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="simulate" options={{ title: 'Simulate', tabBarIcon: () => <Icon label="🏆" /> }} />
      <Tabs.Screen name="rooms" options={{ title: 'Rooms', tabBarIcon: () => <Icon label="🚪" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <Icon label="👤" /> }} />
    </Tabs>
  )
}
