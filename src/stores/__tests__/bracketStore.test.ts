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
