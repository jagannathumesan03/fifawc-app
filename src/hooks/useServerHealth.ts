import { useState, useEffect, useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

export type ServerStatus = 'checking' | 'connected' | 'disconnected'

export function useServerHealth(intervalMs = 15000): ServerStatus {
  const { serverUrl, ready } = useSettingsStore()
  const [status, setStatus] = useState<ServerStatus>('checking')

  const check = useCallback(async () => {
    if (!ready || !serverUrl) { setStatus('disconnected'); return }
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/health`, { signal: controller.signal })
      clearTimeout(timeout)
      setStatus(res.ok ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    }
  }, [serverUrl, ready])

  useEffect(() => {
    check()
    const id = setInterval(check, intervalMs)
    return () => clearInterval(id)
  }, [check, intervalMs])

  return status
}
