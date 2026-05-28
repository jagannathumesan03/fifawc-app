import { create } from 'zustand'
import { db } from '../db/database'
import { createApiClient } from '../api/client'
import { useSettingsStore } from './settingsStore'
import type { Room, ConsensusBracket, BracketSnapshot } from '../types/contract'

type RoomStore = {
  rooms: Room[]
  consensusByRoomId: Record<string, ConsensusBracket>
  forcedMatchId: string | null
  setConsensus(roomId: string, consensus: ConsensusBracket): void
  setForcedMatchId(matchId: string | null): void
  loadRooms(): void
  joinRoom(code: string, displayName: string): Promise<Room>
  createRoom(name: string, displayName: string): Promise<{ room: Room; adminToken: string; joinUrl: string }>
  submitBracket(roomId: string, snapshot: BracketSnapshot): Promise<void>
  forceVote(roomId: string, matchId: string, adminToken: string): Promise<void>
  skipMatch(roomId: string, matchId: string, adminToken: string): Promise<void>
}

function api() {
  const { serverUrl, deviceId } = useSettingsStore.getState()
  return createApiClient(serverUrl, deviceId)
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: [],
  consensusByRoomId: {},
  forcedMatchId: null,

  setConsensus(roomId, consensus) {
    set(s => ({ consensusByRoomId: { ...s.consensusByRoomId, [roomId]: consensus } }))
  },

  setForcedMatchId(matchId) {
    set({ forcedMatchId: matchId })
  },

  loadRooms() {
    const rows = db.getAllSync<{ data: string }>('SELECT data FROM rooms_cache ORDER BY updated_at DESC')
    set({ rooms: rows.map(r => JSON.parse(r.data)) })
  },

  async joinRoom(code, displayName) {
    const { room } = await api().joinRoom(code, displayName)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      room.id, JSON.stringify(room), new Date().toISOString())
    get().loadRooms()
    return room
  },

  async createRoom(name, displayName) {
    const result = await api().createRoom(name, displayName)
    db.runSync('INSERT OR REPLACE INTO rooms_cache (id, data, updated_at) VALUES (?,?,?)',
      result.room.id, JSON.stringify(result.room), new Date().toISOString())
    get().loadRooms()
    return result
  },

  async submitBracket(roomId, snapshot) {
    await api().submitBracket(roomId, snapshot)
  },

  async forceVote(roomId, matchId, adminToken) {
    await api().forceVote(roomId, matchId, adminToken)
  },

  async skipMatch(roomId, matchId, adminToken) {
    await api().skipMatch(roomId, matchId, adminToken)
  },
}))
