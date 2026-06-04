import type { BracketSnapshot, Room } from '../types/contract'

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
    health: () =>
      request<{ status: string; version: string }>('/api/health'),

    createRoom: (name: string, displayName: string) =>
      request<{ room: Room; adminToken: string }>('/api/rooms', {
        method: 'POST', body: JSON.stringify({ name, deviceId, displayName }),
      }),

    joinRoom: (code: string, displayName: string) =>
      request<{ room: Room }>('/api/rooms/join', {
        method: 'POST', body: JSON.stringify({ code, deviceId, displayName }),
      }),

    getRoom: (roomId: string) =>
      request<Room>(`/api/rooms/${roomId}`),

    startRoom: (roomId: string, adminToken: string) =>
      request<{ room: Room }>(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({}),
      }),

    submitBracket: (roomId: string, snapshot: BracketSnapshot) =>
      request<void>(`/api/rooms/${roomId}/submit`, {
        method: 'POST', body: JSON.stringify({ snapshot, deviceId }),
      }),

    postProgress: (roomId: string, snapshot: BracketSnapshot) =>
      request<void>(`/api/rooms/${roomId}/progress`, {
        method: 'POST', body: JSON.stringify({ snapshot, deviceId }),
      }),

    getMemberProgress: (roomId: string) =>
      request<{ memberId: string; displayName: string; snapshot: BracketSnapshot }[]>(
        `/api/rooms/${roomId}/progress?deviceId=${encodeURIComponent(deviceId)}`
      ),

    getMemberBrackets: (roomId: string) =>
      request<{ memberId: string; displayName: string; snapshot: BracketSnapshot }[]>(
        `/api/rooms/${roomId}/brackets`
      ),

    exportBracket: (roomId: string, snapshot: BracketSnapshot) =>
      request<{ imageUrl: string; signedKey: string }>(`/api/rooms/${roomId}/export`, {
        method: 'POST', body: JSON.stringify({ snapshot, deviceId }),
      }),
  }
}
