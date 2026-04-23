import { create } from 'zustand'

export const RECENTS_PATH = '__nova:recents__'

export type RecentEntry = { path: string; name: string; ext: string; openedAt: number }

const MAX = 15
const KEY = 'nova_recents'

function load(): RecentEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

type State = {
  recents: RecentEntry[]
  add: (entry: Omit<RecentEntry, 'openedAt'>) => void
  clear: () => void
}

export const useRecentsStore = create<State>((set, get) => ({
  recents: load(),
  add: (entry) => {
    const next = [
      { ...entry, openedAt: Date.now() },
      ...get().recents.filter((r) => r.path !== entry.path),
    ].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ recents: next })
  },
  clear: () => { localStorage.removeItem(KEY); set({ recents: [] }) },
}))
