import { useBracketStore } from '../bracketStore'

beforeEach(() => {
  useBracketStore.getState().initBracket()
})

test('no groups locked on init', () => {
  const { lockedGroups } = useBracketStore.getState()
  expect(lockedGroups).toEqual([])
})

test('lockGroup adds group to lockedGroups', () => {
  useBracketStore.getState().lockGroup('A')
  expect(useBracketStore.getState().lockedGroups).toContain('A')
})

test('lockGroup is idempotent', () => {
  useBracketStore.getState().lockGroup('A')
  useBracketStore.getState().lockGroup('A')
  expect(useBracketStore.getState().lockedGroups.filter(g => g === 'A')).toHaveLength(1)
})

test('allGroupsLocked returns false when not all 12 locked', () => {
  'ABCDEFGHIJK'.split('').forEach(g => useBracketStore.getState().lockGroup(g))
  expect(useBracketStore.getState().allGroupsLocked()).toBe(false)
})

test('allGroupsLocked returns true when all 12 locked', () => {
  'ABCDEFGHIJKL'.split('').forEach(g => useBracketStore.getState().lockGroup(g))
  expect(useBracketStore.getState().allGroupsLocked()).toBe(true)
})

test('isComplete false before final picked', () => {
  expect(useBracketStore.getState().isComplete()).toBe(false)
})

test('isComplete true after all groups locked and final picked', () => {
  // Lock all 12 groups
  'ABCDEFGHIJKL'.split('').forEach(g => useBracketStore.getState().lockGroup(g))
  expect(useBracketStore.getState().allGroupsLocked()).toBe(true)

  // Pick winners for all matches until final is complete
  const pickAllInStage = (stage: string) => {
    const { matches, setWinner } = useBracketStore.getState()
    matches
      .filter(m => m.stage === stage && !m.completed && m.homeTeamId)
      .forEach(m => setWinner(m.id, m.homeTeamId!))
  }

  pickAllInStage('r32')
  pickAllInStage('r16')
  pickAllInStage('qf')
  pickAllInStage('sf')
  pickAllInStage('third')
  pickAllInStage('final')

  expect(useBracketStore.getState().isComplete()).toBe(true)
})
