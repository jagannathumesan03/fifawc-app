import { useState, useEffect, useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export type ServerStatus = 'checking' | 'connected' | 'disconnected'

export function useServerHealth(intervalMs = 15000): ServerStatus {
  const { serverUrl } = useSettingsStore()
  const [status, setStatus] = useState<ServerStatus>('checking')

  const check = useCallback(async () => {
    if (!serverUrl) { setStatus('disconnected'); return }
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(4000) })
      setStatus(res.ok ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    }
  }, [serverUrl])

  useEffect(() => {
    check()
    const id = setInterval(check, intervalMs)
    return () => clearInterval(id)
  }, [check, intervalMs])

  return status
}
