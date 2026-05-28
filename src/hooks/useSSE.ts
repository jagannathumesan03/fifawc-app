import { useEffect } from 'react'
import EventSource from 'react-native-sse'
import { useRoomStore } from '../stores/roomStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { ConsensusBracket } from '../types/contract'

export function useSSE(roomId: string) {
  const { serverUrl } = useSettingsStore()
  const { setConsensus, setForcedMatchId } = useRoomStore()

  useEffect(() => {
    if (!serverUrl || !roomId) return
    // @ts-ignore - react-native-sse type compatibility
    const es = new EventSource(`${serverUrl}/api/rooms/${roomId}/stream`)

    // @ts-ignore - EventSourceListener type mismatch
    es.addEventListener('message', (e: { data: string }) => {
      const data = JSON.parse(e.data)
      if (data.type === 'consensus_updated') setConsensus(roomId, data.consensus as ConsensusBracket)
      if (data.type === 'force_vote') setForcedMatchId(data.matchId as string)
    })

    return () => es.close()
  }, [serverUrl, roomId])
}
