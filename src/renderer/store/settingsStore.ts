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
  // List-view column widths in px. All columns are fixed-width so that
  // resizing one shifts the others — Finder-style. A trailing minmax(0,1fr)
  // is appended in the grid template to absorb leftover space when the
  // total is narrower than the container.
  listColumnWidths: { name: number; modified: number; size: number; kind: number }
}

export const LIST_COL_MIN = 60
export const LIST_COL_MAX = 1200
export const LIST_COL_GAP = 8 // matches Tailwind gap-2 used on the row grid

export function listGridTemplate(w: Settings['listColumnWidths']): string {
  return `32px ${w.name}px ${w.modified}px ${w.kind}px ${w.size}px minmax(0,1fr)`
}

const DEFAULTS: Settings = {
  windowsStyleSort: true,
  terminalApp: '',
  defaultSortKey: 'modified',
  defaultSortDir: 'desc',
  listColumnWidths: { name: 360, modified: 170, size: 100, kind: 110 },
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
      listColumnWidths: s.listColumnWidths,
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
