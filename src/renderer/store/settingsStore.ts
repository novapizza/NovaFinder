import { create } from 'zustand'

const KEY = 'nova_settings'

type Settings = {
  // ON = folders shown before files (Windows Explorer style, current default).
  // OFF = folders sorted inline with files (classic macOS Finder style).
  windowsStyleSort: boolean
}

const DEFAULTS: Settings = {
  windowsStyleSort: true,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

type State = Settings & {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void
}

export const useSettingsStore = create<State>((set) => ({
  ...load(),
  set: (k, v) => set((s) => {
    const next = { ...s, [k]: v }
    try { localStorage.setItem(KEY, JSON.stringify({ windowsStyleSort: next.windowsStyleSort })) } catch {}
    return next
  }),
}))
