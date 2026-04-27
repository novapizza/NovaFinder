import { create } from 'zustand'
import type { SearchMode } from './searchStore'

export const SMART_PATH_PREFIX = '__nova:smart:'
const KEY = 'nova_smart_folders'

export type SmartFolder = {
  id: string
  name: string
  scope: string
  mode: Exclude<SearchMode, null>
  query: string
}

export function smartFolderPath(id: string) {
  return `${SMART_PATH_PREFIX}${id}__`
}

export function parseSmartFolderId(p: string): string | null {
  if (!p.startsWith(SMART_PATH_PREFIX)) return null
  return p.slice(SMART_PATH_PREFIX.length, -2)
}

function load(): SmartFolder[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

type State = {
  folders: SmartFolder[]
  add: (f: Omit<SmartFolder, 'id'>) => SmartFolder
  remove: (id: string) => void
  get: (id: string) => SmartFolder | undefined
}

export const useSmartFoldersStore = create<State>((set, getState) => ({
  folders: load(),
  add: (f) => {
    const id = `sf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const entry: SmartFolder = { id, ...f }
    const next = [...getState().folders, entry]
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ folders: next })
    return entry
  },
  remove: (id) => {
    const next = getState().folders.filter((f) => f.id !== id)
    localStorage.setItem(KEY, JSON.stringify(next))
    set({ folders: next })
  },
  get: (id) => getState().folders.find((f) => f.id === id),
}))
