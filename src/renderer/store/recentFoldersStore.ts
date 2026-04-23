import { create } from 'zustand'

const KEY = 'nova_recent_folders'
const MAX = 5

export type RecentFolder = { path: string; name: string; visitedAt: number }

function load(): RecentFolder[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

type State = {
  folders: RecentFolder[]
  add: (path: string) => void
  clear: () => void
}

export const useRecentFoldersStore = create<State>((set, get) => ({
  folders: load(),
  add: (path) => {
    if (!path || path === '/' || path.startsWith('__nova:')) return
    const name = path.split('/').pop() || path
    const next = [
      { path, name, visitedAt: Date.now() },
      ...get().folders.filter((f) => f.path !== path),
    ].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ folders: next })
  },
  clear: () => { localStorage.removeItem(KEY); set({ folders: [] }) },
}))
