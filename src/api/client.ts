import type { BracketSnapshot, Room, ConsensusBracket } from '../types/contract'

export function createApiClient(baseUrl: string, deviceId: string) {
  const base = baseUrl.replace(/\/$/, '')

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    if (res.status === 204) return undefined as T
    return res.json()
  }

  return {
    health: () => request<{ status: string; version: string }>('/api/health'),

    pushSnapshot: (snapshot: BracketSnapshot) =>
      request<void>('/api/sync/push', { method: 'POST', body: JSON.stringify({ snapshot, deviceId }) }),

    pullSnapshot: () =>
      request<BracketSnapshot>(`/api/sync/pull?deviceId=${deviceId}`),

    createRoom: (name: string, displayName: string) =>
      request<{ room: Room; adminToken: string; joinUrl: string }>('/api/rooms', {
        method: 'POST', body: JSON.stringify({ name, deviceId, displayName })
      }),

    joinRoom: (code: string, displayName: string) =>
      request<{ room: Room }>('/api/rooms/join', {
        method: 'POST', body: JSON.stringify({ code, deviceId, displayName })
      }),

    getRoom: (roomId: string) =>
      request<Room>(`/api/rooms/${roomId}`),

    submitBracket: (roomId: string, snapshot: BracketSnapshot) =>
      request<void>(`/api/rooms/${roomId}/submit`, {
        method: 'POST', body: JSON.stringify({ snapshot, deviceId })
      }),

    getConsensus: (roomId: string) =>
      request<ConsensusBracket>(`/api/rooms/${roomId}/consensus`),

    forceVote: (roomId: string, matchId: string, adminToken: string) =>
      request<void>(`/api/rooms/${roomId}/force-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ matchId })
      }),

    skipMatch: (roomId: string, matchId: string, adminToken: string) =>
      request<void>(`/api/rooms/${roomId}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ matchId })
      }),
  }
}
