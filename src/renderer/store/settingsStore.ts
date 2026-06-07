import { create } from 'zustand'
import type { SortKey, SortDir } from './paneStore'
import { TAG_COLORS } from './tagStore'
import type { ShortcutOverrides } from '../../shared/commands'

const KEY = 'nova_settings'

// Finder-style sidebar items the user can show/hide. The `id` is the stable
// key stored in settings; `icon` keys also double as ids for Favorites so the
// Sidebar can look them up directly. Visibility is opt-out: a missing key means
// "visible", so new items appear by default without a settings migration.
export type SidebarItemId =
  | 'recents' | 'desktop' | 'documents' | 'downloads' | 'movies' | 'music' | 'pictures' | 'home'
  | 'harddisks' | 'externalDisks' | 'icloud' | 'trash'

export const SIDEBAR_ITEMS: { id: SidebarItemId; label: string; group: 'Favorites' | 'Locations' }[] = [
  { id: 'recents',       label: 'Recents',       group: 'Favorites' },
  { id: 'desktop',       label: 'Desktop',       group: 'Favorites' },
  { id: 'documents',     label: 'Documents',     group: 'Favorites' },
  { id: 'downloads',     label: 'Downloads',     group: 'Favorites' },
  { id: 'movies',        label: 'Movies',        group: 'Favorites' },
  { id: 'music',         label: 'Music',         group: 'Favorites' },
  { id: 'pictures',      label: 'Pictures',      group: 'Favorites' },
  { id: 'home',          label: 'Home',          group: 'Favorites' },
  { id: 'harddisks',     label: 'Hard disks',    group: 'Locations' },
  { id: 'externalDisks', label: 'External disks', group: 'Locations' },
  { id: 'icloud',        label: 'iCloud Drive',  group: 'Locations' },
  { id: 'trash',         label: 'Trash',         group: 'Locations' },
]

// A user-created tag definition (stored in settings, not the built-in palette).
export type CustomTag = { id: string; label: string; hex: string }

type Settings = {
  windowsStyleSort: boolean
  terminalApp: string
  defaultSortKey: SortKey
  defaultSortDir: SortDir
  listColumnWidths: { name: number; modified: number; size: number; kind: number }
  // Finder-style sidebar visibility. Opt-out maps: an id/color absent from the
  // record (or set to anything but `false`) is treated as visible.
  sidebarItems: Partial<Record<SidebarItemId, boolean>>
  sidebarTags: Partial<Record<string, boolean>>
  // User-defined labels for built-in tag colors. Missing key = use the default.
  tagLabels: Partial<Record<string, string>>
  // User-created tags beyond the 7 built-ins.
  customTags: CustomTag[]
  // Per-command keyboard shortcut overrides. Missing key = use the command's
  // default accelerator. An empty string means the user explicitly unbound it.
  shortcuts: ShortcutOverrides
}

export const LIST_COL_MIN = 60
export const LIST_COL_MAX = 1200
export const LIST_COL_GAP = 8

export function listGridTemplate(w: Settings['listColumnWidths']): string {
  return `32px ${w.name}px ${w.modified}px ${w.kind}px ${w.size}px minmax(0,1fr)`
}

const DEFAULTS: Settings = {
  windowsStyleSort: true,
  terminalApp: '',
  defaultSortKey: 'modified',
  defaultSortDir: 'desc',
  listColumnWidths: { name: 360, modified: 170, size: 100, kind: 110 },
  sidebarItems: {},
  sidebarTags: {},
  tagLabels: {},
  customTags: [],
  shortcuts: {},
}

// Visibility helpers — opt-out: missing key = visible.
export function isSidebarItemHidden(items: Settings['sidebarItems'], id: SidebarItemId): boolean {
  return items[id] === false
}
export function isSidebarTagHidden(tags: Settings['sidebarTags'], id: string): boolean {
  return tags[id] === false
}

// Resolved label for any tag ID (built-in or custom).
export function getTagLabel(
  id: string,
  labels: Settings['tagLabels'],
  allDefs: { name: string; label: string }[],
): string {
  const custom = labels[id]
  if (custom && custom.trim()) return custom.trim()
  return allDefs.find((d) => d.name === id)?.label ?? id
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
      sidebarItems: s.sidebarItems,
      sidebarTags: s.sidebarTags,
      tagLabels: s.tagLabels,
      customTags: s.customTags,
      shortcuts: s.shortcuts,
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

// Returns the merged list of all tag definitions (built-ins with custom labels
// applied, followed by user-created tags). Use this everywhere instead of
// importing TAG_COLORS directly, so custom tags appear throughout the UI.
export function useAllTagDefs(): { name: string; hex: string; label: string; builtin: boolean }[] {
  const tagLabels = useSettingsStore((s) => s.tagLabels)
  const customTags = useSettingsStore((s) => s.customTags)
  const builtins = TAG_COLORS.map((t) => ({
    name: t.name,
    hex: t.hex,
    label: getTagLabel(t.name, tagLabels, TAG_COLORS),
    builtin: true,
  }))
  const customs = customTags.map((t) => ({
    name: t.id,
    hex: t.hex,
    label: getTagLabel(t.id, tagLabels, customTags.map((c) => ({ name: c.id, label: c.label }))),
    builtin: false,
  }))
  return [...builtins, ...customs]
}
