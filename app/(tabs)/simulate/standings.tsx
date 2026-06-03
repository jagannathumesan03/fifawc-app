import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import { ThemedView, useTheme } from '../../../src/components/ThemedView'
import { TEAMS } from '../../../src/data/tournamentSeeds'
import { useBracketStore } from '../../../src/stores/bracketStore'
import type { Team } from '../../../src/types/contract'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

function positionStyle(index: number, theme: ReturnType<typeof useTheme>) {
  if (index === 0) return { bg: theme.accent + '33', border: theme.accent + '88', badgeBg: '#14532d', badgeColor: '#4ade80', label: '1st' }
  if (index === 1) return { bg: theme.accent + '22', border: theme.accent + '66', badgeBg: '#14532d', badgeColor: '#4ade80', label: '2nd' }
  if (index === 2) return { bg: '#78350f22', border: '#78350f55', badgeBg: '#78350f', badgeColor: '#fbbf24', label: '3rd' }
  return { bg: theme.surface, border: theme.border, badgeBg: theme.surface, badgeColor: theme.subtext, label: '4th' }
}

export default function GroupSeedingScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { groupOrder, setGroupOrder, lockGroup, lockedGroups } = useBracketStore()
  const [activeGroup, setActiveGroup] = useState('A')

  const teams: Team[] = (groupOrder[activeGroup] ?? [])
    .map(id => TEAMS.find(t => t.id === id))
    .filter((t): t is Team => !!t)

  const isLocked = lockedGroups.includes(activeGroup)

  const handleDragEnd = useCallback(({ data }: { data: Team[] }) => {
    setGroupOrder(activeGroup, data.map(t => t.id))
  }, [activeGroup, setGroupOrder])

  const handleLock = useCallback(() => {
    lockGroup(activeGroup)
    const nextIndex = GROUP_LETTERS.indexOf(activeGroup) + 1
    if (nextIndex < GROUP_LETTERS.length) {
      setActiveGroup(GROUP_LETTERS[nextIndex])
    } else {
      router.push('/(tabs)/simulate/bracket')
    }
  }, [activeGroup, lockGroup, router])

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Team>) => {
    const index = getIndex() ?? 0
    const pos = positionStyle(index, theme)
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={isLocked ? undefined : drag}
          disabled={isLocked}
          activeOpacity={0.8}
          style={[styles.row, { backgroundColor: pos.bg, borderColor: pos.border, elevation: isActive ? 4 : 0 }]}
        >
          <View style={[styles.badge, { backgroundColor: pos.badgeBg }]}>
            <Text style={[styles.badgeText, { color: pos.badgeColor }]}>{pos.label}</Text>
          </View>
          <Text style={styles.flag}>{item.flag}</Text>
          <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          {!isLocked && <Text style={[styles.handle, { color: theme.subtext }]}>⠿</Text>}
          {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
        </TouchableOpacity>
      </ScaleDecorator>
    )
  }, [isLocked, theme])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Header */}
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

        {/* Group header */}
        <View style={styles.groupHeader}>
          <Text style={[styles.groupTitle, { color: theme.text }]}>GROUP {activeGroup}</Text>
          <Text style={[styles.groupSub, { color: theme.subtext }]}>
            {isLocked ? 'Locked ✓' : 'Long press ⠿ to reorder'}
          </Text>
        </View>

        {/* Draggable list */}
        <DraggableFlatList
          data={teams}
          keyExtractor={item => item.id}
          onDragEnd={handleDragEnd}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />

        {/* Lock button + pill nav */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          {!isLocked ? (
            <TouchableOpacity
              style={[styles.lockBtn, { backgroundColor: theme.accent }]}
              onPress={handleLock}
            >
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
        </View>
      </ThemedView>
    </GestureHandlerRootView>
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
  list: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 4 },
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
})
