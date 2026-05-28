import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useBracketStore } from '../stores/bracketStore'
import { useSettingsStore } from '../stores/settingsStore'
import { createApiClient } from '../api/client'

export function useSync() {
  const { serverUrl, deviceId, lastSyncAt, setLastSyncAt } = useSettingsStore()
  const { pendingSyncMatchIds, exportSnapshot, importSnapshot } = useBracketStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!serverUrl || pendingSyncMatchIds.length === 0) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const api = createApiClient(serverUrl, deviceId)
        await api.pushSnapshot(exportSnapshot())
        setLastSyncAt(new Date().toISOString())
      } catch { /* offline — will retry next change */ }
    }, 3000)
  }, [pendingSyncMatchIds])

  useEffect(() => {
    if (!serverUrl) return
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return
      try {
        const api = createApiClient(serverUrl, deviceId)
        const remote = await api.pullSnapshot()
        if (!lastSyncAt || remote.exportedAt > lastSyncAt) {
          importSnapshot(remote)
          setLastSyncAt(remote.exportedAt)
        }
      } catch { /* offline */ }
    })
    return () => sub.remove()
  }, [serverUrl, lastSyncAt])
}
