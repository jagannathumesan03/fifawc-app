import { useState, useRef, useMemo, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  PanResponder, Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { TEAMS, getTeamById } from '../../../src/data/tournamentSeeds'
import { useBracketStore } from '../../../src/stores/bracketStore'
import { useRoomStore } from '../../../src/stores/roomStore'
import type { Team } from '../../../src/types/contract'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
const ROW_H = 66

function positionStyle(index: number, theme: ReturnType<typeof useTheme>) {
  if (index === 0) return { bg: theme.accent + '33', border: theme.accent + '88', badgeBg: '#14532d', badgeColor: '#4ade80', label: '1st' }
  if (index === 1) return { bg: theme.accent + '22', border: theme.accent + '66', badgeBg: '#14532d', badgeColor: '#4ade80', label: '2nd' }
  if (index === 2) return { bg: '#78350f22', border: '#78350f55', badgeBg: '#78350f', badgeColor: '#fbbf24', label: '3rd' }
  return { bg: theme.surface, border: theme.border, badgeBg: theme.surface, badgeColor: theme.subtext, label: '4th' }
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const out = [...arr]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item)
  return out
}

export default function GroupSeedingScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { groupOrder, setGroupOrder, lockGroup, lockedGroups } = useBracketStore()
  const { rooms, memberProgressByRoomId, loadMemberProgress } = useRoomStore()
  const activeRoomId = rooms.find(r => r.status === 'active')?.id ?? null
  const [activeGroup, setActiveGroup] = useState('A')

  const baseTeams: Team[] = (groupOrder[activeGroup] ?? [])
    .map(id => TEAMS.find(t => t.id === id))
    .filter((t): t is Team => !!t)

  const isLocked = lockedGroups.includes(activeGroup)

  const teamsRef = useRef(baseTeams)
  teamsRef.current = baseTeams
  const activeGroupRef = useRef(activeGroup)
  activeGroupRef.current = activeGroup

  const drag = useRef<{ from: number; to: number } | null>(null)
  const [dragUI, setDragUI] = useState<{ from: number; to: number } | null>(null)
  const dragAnim = useRef(new Animated.Value(1)).current
  const listPageY = useRef(0)

  useEffect(() => {
    drag.current = null
    setDragUI(null)
  }, [activeGroup])

  useEffect(() => {
    if (!activeRoomId) return
    loadMemberProgress(activeRoomId)
    const id = setInterval(() => loadMemberProgress(activeRoomId), 10000)
    return () => clearInterval(id)
  }, [activeRoomId])

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isLocked,
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
  }), [isLocked])

  const displayTeams = useMemo(
    () => dragUI && dragUI.from !== dragUI.to ? reorder(baseTeams, dragUI.from, dragUI.to) : baseTeams,
    [baseTeams, dragUI],
  )

  const friendGroupPicks = activeRoomId
    ? (memberProgressByRoomId[activeRoomId] ?? []).filter(
        mb => mb.snapshot.lockedGroups.includes(activeGroup)
      ).map(mb => ({
        displayName: mb.displayName,
        teamIds: mb.snapshot.groupOrder[activeGroup] ?? [],
      }))
    : []

  function handleLock() {
    lockGroup(activeGroup)
    const nextIndex = GROUP_LETTERS.indexOf(activeGroup) + 1
    if (nextIndex < GROUP_LETTERS.length) {
      setActiveGroup(GROUP_LETTERS[nextIndex])
    } else {
      router.push('/(tabs)/simulate/bracket')
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={[styles.topBtnText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Group Stage</Text>
        <View style={styles.topBtn} />
      </View>

      {/* 12-dot progress strip */}
      <View style={styles.dotStrip}>
        {GROUP_LETTERS.map(g => {
          const locked = lockedGroups.includes(g)
          const active = g === activeGroup
          return (
            <TouchableOpacity key={g} onPress={() => setActiveGroup(g)}>
              <View style={[
                styles.dot,
                locked && { backgroundColor: theme.accent },
                active && !locked && { backgroundColor: '#f59e0b', width: 10, height: 10, borderRadius: 5 },
                !active && !locked && { backgroundColor: theme.border },
              ]} />
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.groupHeader}>
        <Text style={[styles.groupTitle, { color: theme.text }]}>GROUP {activeGroup}</Text>
        <Text style={[styles.groupSub, { color: theme.subtext }]}>
          {isLocked ? 'Locked ✓' : 'Drag ⠿ to reorder'}
        </Text>
      </View>

      <View
        {...pan.panHandlers}
        onLayout={() => {}}
        ref={v => {
          if (v) (v as any).measure?.((_x: number, _y: number, _w: number, _h: number, _px: number, py: number) => {
            if (py) listPageY.current = py
          })
        }}
        style={styles.listArea}
      >
        {displayTeams.map((team, i) => {
          const pos = positionStyle(i, theme)
          const isDragged = dragUI != null && displayTeams[dragUI.to]?.id === team.id && dragUI.from !== dragUI.to
          return (
            <Animated.View
              key={team.id}
              style={[
                styles.row,
                {
                  backgroundColor: isDragged ? theme.accent + '18' : pos.bg,
                  borderColor: isDragged ? theme.accent : pos.border,
                  transform: isDragged ? [{ scale: dragAnim }] : [],
                  elevation: isDragged ? 4 : 0,
                },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: pos.badgeBg }]}>
                <Text style={[styles.badgeText, { color: pos.badgeColor }]}>{pos.label}</Text>
              </View>
              <Text style={styles.flag}>{team.flag}</Text>
              <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1}>{team.name}</Text>
              {!isLocked && <Text style={[styles.handle, { color: theme.subtext }]}>⠿</Text>}
              {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
            </Animated.View>
          )
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        {!isLocked ? (
          <TouchableOpacity style={[styles.lockBtn, { backgroundColor: theme.accent }]} onPress={handleLock}>
            <Text style={styles.lockBtnText}>
              Lock Group {activeGroup} {GROUP_LETTERS.indexOf(activeGroup) < GROUP_LETTERS.length - 1 ? '→' : '→ Bracket'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pillNav}>
            <TouchableOpacity onPress={() => {
              const i = GROUP_LETTERS.indexOf(activeGroup)
              if (i > 0) setActiveGroup(GROUP_LETTERS[i - 1])
            }}>
              <Text style={[styles.pillText, { color: theme.subtext }]}>← {GROUP_LETTERS[GROUP_LETTERS.indexOf(activeGroup) - 1] ?? ''}</Text>
            </TouchableOpacity>
            <Text style={[styles.pillActive, { color: theme.accent }]}>{activeGroup} ●</Text>
            <TouchableOpacity onPress={() => {
              const i = GROUP_LETTERS.indexOf(activeGroup)
              if (i < GROUP_LETTERS.length - 1) setActiveGroup(GROUP_LETTERS[i + 1])
            }}>
              <Text style={[styles.pillText, { color: theme.accent }]}>{GROUP_LETTERS[GROUP_LETTERS.indexOf(activeGroup) + 1] ?? ''} →</Text>
            </TouchableOpacity>
          </View>
        )}
        {friendGroupPicks.length > 0 && (
          <View style={styles.friendSection}>
            <Text style={[styles.friendLabel, { color: theme.subtext }]}>FRIENDS' PICKS</Text>
            {friendGroupPicks.map((fp, i) => {
              const myOrder = groupOrder[activeGroup] ?? []
              const matches = fp.teamIds.length === myOrder.length && fp.teamIds.every((id, idx) => id === myOrder[idx])
              return (
                <View key={i} style={[styles.friendChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.friendName, { color: theme.text }]}>{fp.displayName}</Text>
                  <View style={styles.friendFlags}>
                    {fp.teamIds.map(id => (
                      <Text key={id} style={styles.friendFlag}>{getTeamById(id)?.flag ?? '?'}</Text>
                    ))}
                  </View>
                  {matches && <Text style={[styles.friendMatch, { color: theme.accent }]}>Matches ✓</Text>}
                </View>
              )
            })}
          </View>
        )}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  topBtn: { width: 64 },
  topBtnText: { fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700' },
  dotStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  groupHeader: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' },
  groupTitle: { fontSize: 18, fontWeight: '800' },
  groupSub: { fontSize: 11, marginTop: 2 },
  listArea: { paddingHorizontal: 12, paddingTop: 10, gap: 6 },
  row: { height: ROW_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 36, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  flag: { fontSize: 24 },
  teamName: { flex: 1, fontSize: 15, fontWeight: '600' },
  handle: { fontSize: 18 },
  lockIcon: { fontSize: 14 },
  footer: { borderTopWidth: 1, padding: 12 },
  lockBtn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  lockBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pillNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  pillText: { fontSize: 13 },
  pillActive: { fontSize: 13, fontWeight: '700' },
  friendSection: { marginTop: 12, gap: 6 },
  friendLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  friendChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  friendName: { fontSize: 12, fontWeight: '700', minWidth: 44 },
  friendFlags: { flexDirection: 'row', gap: 4, flex: 1 },
  friendFlag: { fontSize: 16 },
  friendMatch: { fontSize: 10, fontWeight: '600' },
})
