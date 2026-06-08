import { create } from 'zustand'

// TagColor is now any string — the 7 built-in names are kept as constants but
// custom tags can use any unique ID (e.g. "custom_1718000000000").
export type TagColor = string

// Stable reference for files with no tags — prevents React infinite loop
// when used as a selector fallback in useSyncExternalStore.
export const EMPTY_TAGS: TagColor[] = []

// Virtual path for a tag view (Finder-style: shows every tagged file machine-wide).
export const TAG_PATH_PREFIX = '__nova:tag:'
export function tagPath(color: TagColor) { return `${TAG_PATH_PREFIX}${color}__` }

// Returns the tag ID from a virtual tag path, or null if the path isn't a tag view.
// No longer validates against the built-in list — custom tag IDs are also valid.
export function parseTagColor(p: string): TagColor | null {
  if (!p.startsWith(TAG_PATH_PREFIX) || !p.endsWith('__')) return null
  const id = p.slice(TAG_PATH_PREFIX.length, -2)
  return id.length > 0 ? id : null
}

// The 7 built-in tag colors. These are always present and cannot be deleted.
export const TAG_COLORS: { name: TagColor; hex: string; label: string }[] = [
  { name: 'red',    hex: '#FF5E58', label: 'Red' },
  { name: 'orange', hex: '#FFA04D', label: 'Orange' },
  { name: 'yellow', hex: '#FFD04A', label: 'Yellow' },
  { name: 'green',  hex: '#59D067', label: 'Green' },
  { name: 'blue',   hex: '#4DA8FF', label: 'Blue' },
  { name: 'purple', hex: '#C974E2', label: 'Purple' },
  { name: 'gray',   hex: '#B0B0B0', label: 'Gray' },
]

type State = {
  map: Record<string, TagColor[]>
  loaded: boolean
  load: () => Promise<void>
  get: (path: string) => TagColor[]
  toggle: (path: string, color: TagColor) => Promise<void>
  clear: (path: string) => Promise<void>
}

export const useTagStore = create<State>((set, get) => ({
  map: {},
  loaded: false,
  load: async () => {
    if (get().loaded) return
    const map = await window.tags.loadAll()
    set({ map, loaded: true })
  },
  get: (p) => get().map[p] ?? EMPTY_TAGS,
  toggle: async (p, color) => {
    const next = await window.tags.toggle(p, color)
    set((s) => {
      const m = { ...s.map }
      if (next.length === 0) delete m[p]
      else m[p] = next
      return { map: m }
    })
  },
  clear: async (p) => {
    await window.tags.clear(p)
    set((s) => {
      const m = { ...s.map }
      delete m[p]
      return { map: m }
    })
  },
}))
