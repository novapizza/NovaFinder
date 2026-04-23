import { create } from 'zustand'

const KEY = 'nova_pinned'

export type PinnedEntry = { path: string; label: string }

function load(): PinnedEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

type State = {
  pinned: PinnedEntry[]
  add: (path: string, label: string) => void
  remove: (path: string) => void
}

export const usePinnedStore = create<State>((set, get) => ({
  pinned: load(),
  add: (path, label) => {
    if (get().pinned.some((p) => p.path === path)) return
    const next = [...get().pinned, { path, label }]
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ pinned: next })
  },
  remove: (path) => {
    const next = get().pinned.filter((p) => p.path !== path)
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ pinned: next })
  },
}))
