import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ENV_SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? ''

function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function load(key: string) {
  return AsyncStorage.getItem(key)
}

function save(key: string, value: string) {
  AsyncStorage.setItem(key, value)
}

type Theme = 'light' | 'dark'

type SettingsStore = {
  serverUrl: string
  deviceId: string
  displayName: string
  theme: Theme
  lastSyncAt: string | null
  ready: boolean
  setServerUrl(url: string): void
  setDisplayName(name: string): void
  setTheme(theme: Theme): void
  setLastSyncAt(ts: string): void
  initSettings(): Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  serverUrl: ENV_SERVER_URL,
  deviceId: '',
  displayName: '',
  theme: 'light',
  lastSyncAt: null,
  ready: false,

  setServerUrl(url) {
    save('serverUrl', url)
    set({ serverUrl: url })
  },
  setDisplayName(name) {
    save('displayName', name)
    set({ displayName: name })
  },
  setTheme(theme) {
    save('theme', theme)
    set({ theme })
  },
  setLastSyncAt(ts) {
    save('lastSyncAt', ts)
    set({ lastSyncAt: ts })
  },

  async initSettings() {
    const [deviceIdStored, displayName, serverUrl, theme, lastSyncAt] =
      await Promise.all([
        load('deviceId'),
        load('displayName'),
        load('serverUrl'),
        load('theme'),
        load('lastSyncAt'),
      ])

    let deviceId = deviceIdStored
    if (!deviceId) {
      deviceId = generateDeviceId()
      save('deviceId', deviceId)
    }

    set({
      deviceId,
      displayName: displayName ?? '',
      serverUrl: serverUrl ?? ENV_SERVER_URL,
      theme: (theme as Theme) ?? 'light',
      lastSyncAt: lastSyncAt ?? null,
      ready: true,
    })
  },
}))
