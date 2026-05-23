import { create } from 'zustand'
import type { SortKey, SortDir } from './paneStore'

const KEY = 'nova_settings'

type Settings = {
  // ON = folders shown before files (Windows Explorer style, current default).
  // OFF = folders sorted inline with files (classic macOS Finder style).
  windowsStyleSort: boolean
  // App name passed to `open -a <name>` when launching a folder in a
  // terminal. Empty string falls back to macOS's stock Terminal.app.
  terminalApp: string
  // Last sort the user picked, applied to new panes / next session.
  // Defaults match the natural-direction rule from setSort: newest
  // modified first.
  defaultSortKey: SortKey
  defaultSortDir: SortDir
}

const DEFAULTS: Settings = {
  windowsStyleSort: true,
  terminalApp: '',
  defaultSortKey: 'modified',
  defaultSortDir: 'desc',
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

function persist(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      windowsStyleSort: s.windowsStyleSort,
      terminalApp: s.terminalApp,
      defaultSortKey: s.defaultSortKey,
      defaultSortDir: s.defaultSortDir,
    }))
  } catch {}
}

type State = Settings & {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void
}

export const useSettingsStore = create<State>((set) => ({
  ...load(),
  set: (k, v) => set((s) => {
    const next = { ...s, [k]: v }
    persist(next)
    return next
  }),
}))
