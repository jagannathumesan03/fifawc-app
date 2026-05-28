import { useState, useRef, useMemo, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, PanResponder, Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { TEAMS } from '../../../src/data/tournamentSeeds'
import { useBracketStore } from '../../../src/stores/bracketStore'
import type { Team } from '../../../src/types/contract'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const ROW_H = 66 // must match row height in styles

function badge(i: number) {
  if (i === 0) return { label: '1st', color: '#fff', bg: '#16a34a' }
  if (i === 1) return { label: '2nd', color: '#fff', bg: '#16a34a' }
  if (i === 2) return { label: '3rd', color: '#92400e', bg: '#fde68a' }
  return { label: '4th', color: '#6b7280', bg: '#e5e7eb' }
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const out = [...arr]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item)
  return out
}

export default function StandingsScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { groupOrder, setGroupOrder } = useBracketStore()
  const [activeGroup, setActiveGroup] = useState('A')

  const baseTeams: Team[] = (groupOrder[activeGroup] ?? [])
    .map(id => TEAMS.find(t => t.id === id))
    .filter((t): t is Team => !!t)

  // ---- drag state (all in refs to avoid stale closures in PanResponder) ----
  const teamsRef = useRef(baseTeams)
  teamsRef.current = baseTeams

  const activeGroupRef = useRef(activeGroup)
  activeGroupRef.current = activeGroup

  const drag = useRef<{ from: number; to: number } | null>(null)
  const [dragUI, setDragUI] = useState<{ from: number; to: number } | null>(null)
  const dragAnim = useRef(new Animated.Value(1)).current   // scale for lift
  const listPageY = useRef(0)

  useEffect(() => {
    drag.current = null
    setDragUI(null)
  }, [activeGroup])

  // Single PanResponder on the list container
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const relY = e.nativeEvent.pageY - listPageY.current
      const from = Math.max(0, Math.min(teamsRef.current.length - 1, Math.floor(relY / ROW_H)))
      drag.current = { from, to: from }
      setDragUI({ from, to: from })
      Animated.spring(dragAnim, { toValue: 1.04, useNativeDriver: true, speed: 30 }).start()
    },
    onPanResponderMove: (e) => {
      if (!drag.current) return
      const relY = e.nativeEvent.pageY - listPageY.current
      const to = Math.max(0, Math.min(teamsRef.current.length - 1, Math.floor(relY / ROW_H)))
      drag.current.to = to
      setDragUI({ from: drag.current.from, to })
    },
    onPanResponderRelease: () => {
      const d = drag.current
      drag.current = null
      Animated.spring(dragAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start()
      if (!d) return
      if (d.from !== d.to) {
        const ids = reorder(teamsRef.current, d.from, d.to).map(t => t.id)
        setGroupOrder(activeGroupRef.current, ids)
      }
      setDragUI(null)
    },
    onPanResponderTerminate: () => {
      drag.current = null
      Animated.spring(dragAnim, { toValue: 1, useNativeDriver: true }).start()
      setDragUI(null)
    },
  }), [])

  const displayTeams = useMemo(
    () => dragUI && dragUI.from !== dragUI.to ? reorder(baseTeams, dragUI.from, dragUI.to) : baseTeams,
    [baseTeams, dragUI],
  )

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={[styles.topBtnText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Standings</Text>
        <View style={styles.topBtn} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.tabs, { borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabsContent}>
        {GROUP_LETTERS.map(g => {
          const active = g === activeGroup
          return (
            <TouchableOpacity key={g} onPress={() => setActiveGroup(g)}
              style={[styles.tab, active && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabText, { color: active ? theme.accent : theme.subtext }]}>{g}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View style={styles.hint}>
        <Text style={[styles.hintText, { color: theme.subtext }]}>Drag ⠿ to reorder finishing position</Text>
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
        <Text style={[styles.legendText, { color: theme.subtext }]}>Advances to R32  </Text>
        <View style={[styles.legendDot, { backgroundColor: '#fde68a', borderWidth: 1, borderColor: '#d97706' }]} />
        <Text style={[styles.legendText, { color: theme.subtext }]}>Best-3rd pool</Text>
      </View>

      {/* The entire list area is the PanResponder target */}
      <View
        {...pan.panHandlers}
        onLayout={e => {
          // Measure absolute Y each layout in case scroll has changed
          ;(e.currentTarget as any)?.measure?.((x: number, y: number, w: number, h: number, px: number, py: number) => {
            if (py) listPageY.current = py
          })
        }}
        ref={v => {
          if (v) (v as any).measure?.((x: number, y: number, w: number, h: number, px: number, py: number) => {
            if (py) listPageY.current = py
          })
        }}
        style={styles.listArea}
      >
        {displayTeams.map((team, i) => {
          const b = badge(i)
          // The dragged team: original position = dragUI.from, now at dragUI.to
          const isDragged = dragUI != null && displayTeams[dragUI.to]?.id === team.id && dragUI.from !== dragUI.to
          return (
            <Animated.View
              key={team.id}
              style={[
                styles.row,
                {
                  backgroundColor: isDragged ? theme.accent + '18' : theme.surface,
                  borderColor: isDragged ? theme.accent : theme.border,
                  transform: isDragged ? [{ scale: dragAnim }] : [],
                  elevation: isDragged ? 4 : 0,
                  shadowColor: isDragged ? '#000' : 'transparent',
                  shadowOpacity: isDragged ? 0.15 : 0,
                  shadowRadius: isDragged ? 6 : 0,
                  shadowOffset: { width: 0, height: isDragged ? 3 : 0 },
                },
              ]}>
              <View style={[styles.badge, { backgroundColor: b.bg }]}>
                <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
              </View>
              <Text style={styles.flag}>{team.flag}</Text>
              <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1}>{team.name}</Text>
              <Text style={[styles.handle, { color: theme.subtext }]}>⠿</Text>
            </Animated.View>
          )
        })}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  topBtn: { width: 64 },
  topBtnText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  tabs: { borderBottomWidth: 1, flexGrow: 0 },
  tabsContent: { paddingHorizontal: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '700' },
  hint: { paddingHorizontal: 16, paddingTop: 10 },
  hintText: { fontSize: 12, textAlign: 'center' },
  legend: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  listArea: { paddingHorizontal: 12, paddingTop: 10, gap: 6 },
  row: {
    height: ROW_H,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 10,
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 36, alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  flag: { fontSize: 24 },
  teamName: { flex: 1, fontSize: 15, fontWeight: '600' },
  handle: { fontSize: 18 },
})
