import { create } from 'zustand'
import { db } from '../db/database'
import { createApiClient } from '../api/client'
import { useSettingsStore } from './settingsStore'
import type { Room, BracketSnapshot } from '../types/contract'

type MemberBracket = { memberId: string; displayName: string; snapshot: BracketSnapshot }

type RoomStore = {
  rooms: Room[]
  adminTokenByRoomId: Record<string, string>
  memberBracketsByRoomId: Record<string, MemberBracket[]>
  memberProgressByRoomId: Record<string, MemberBracket[]>
  loadRooms(): void
  refreshRoom(roomId: string): Promise<void>
  createRoom(name: string, displayName: string): Promise<Room>
  joinRoom(code: string, displayName: string): Promise<Room>
  startRoom(roomId: string): Promise<void>
  submitBracket(roomId: string, snapshot: BracketSnapshot): Promise<void>
  loadMemberBrackets(roomId: string): Promise<void>
  pushProgress(roomId: string, snapshot: BracketSnapshot): Promise<void>
  loadMemberProgress(roomId: string): Promise<void>
  exportBracket(roomId: string, snapshot: BracketSnapshot): Promise<{ imageUrl: string; signedKey: string }>
}

function api() {
  const { serverUrl, deviceId } = useSettingsStore.getState()
  return createApiClient(serverUrl, deviceId)
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: [],
  adminTokenByRoomId: {},
  memberBracketsByRoomId: {},
  memberProgressByRoomId: {},

  loadRooms() {
    const rows = db.getAllSync<{ data: string }>('SELECT data FROM rooms_cache ORDER BY updated_at DESC')
    set({ rooms: rows.map(r => JSON.parse(r.data)) })
  },

  async refreshRoom(roomId) {
    const room = await api().getRoom(roomId)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      room.id, JSON.stringify(room), new Date().toISOString())
    set(s => ({ rooms: s.rooms.map(r => r.id === roomId ? room : r) }))
  },

  async createRoom(name, displayName) {
    const { room, adminToken } = await api().createRoom(name, displayName)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      room.id, JSON.stringify(room), new Date().toISOString())
    set(s => ({
      rooms: [room, ...s.rooms.filter(r => r.id !== room.id)],
      adminTokenByRoomId: { ...s.adminTokenByRoomId, [room.id]: adminToken },
    }))
    return room
  },

  async joinRoom(code, displayName) {
    const { room } = await api().joinRoom(code, displayName)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      room.id, JSON.stringify(room), new Date().toISOString())
    set(s => ({ rooms: [room, ...s.rooms.filter(r => r.id !== room.id)] }))
    return room
  },

  async startRoom(roomId) {
    const adminToken = get().adminTokenByRoomId[roomId]
    if (!adminToken) throw new Error('Not the host')
    const { room } = await api().startRoom(roomId, adminToken)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      room.id, JSON.stringify(room), new Date().toISOString())
    set(s => ({ rooms: s.rooms.map(r => r.id === roomId ? room : r) }))
  },

  async submitBracket(roomId, snapshot) {
    await api().submitBracket(roomId, snapshot)
  },

  async loadMemberBrackets(roomId) {
    const brackets = await api().getMemberBrackets(roomId)
    set(s => ({ memberBracketsByRoomId: { ...s.memberBracketsByRoomId, [roomId]: brackets } }))
  },

  async pushProgress(roomId, snapshot) {
    try {
      await api().postProgress(roomId, snapshot)
    } catch { /* fire-and-forget */ }
  },

  async loadMemberProgress(roomId) {
    try {
      const progress = await api().getMemberProgress(roomId)
      set(s => ({ memberProgressByRoomId: { ...s.memberProgressByRoomId, [roomId]: progress } }))
    } catch { /* ignore network errors */ }
  },

  async exportBracket(roomId, snapshot) {
    return api().exportBracket(roomId, snapshot)
  },
}))
