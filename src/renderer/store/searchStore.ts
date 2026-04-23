import { create } from 'zustand'
import type { FileEntry } from '../components/FileList/useDirectory'

export type SearchMode = 'name' | 'content' | 'kind' | 'size' | null

type State = {
  query: string
  mode: SearchMode
  scope: string | null
  results: FileEntry[]
  searching: boolean
  focusTrigger: number
  setQuery: (q: string) => void
  setMode: (m: SearchMode) => void
  setResults: (scope: string, results: FileEntry[]) => void
  setSearching: (v: boolean) => void
  clear: () => void
  focusSearch: () => void
}

export const useSearchStore = create<State>((set) => ({
  query: '',
  mode: null,
  scope: null,
  results: [],
  searching: false,
  focusTrigger: 0,
  setQuery: (q) => set({ query: q }),
  setMode: (m) => set({ mode: m }),
  setResults: (scope, results) => set({ scope, results }),
  setSearching: (v) => set({ searching: v }),
  clear: () => set({ query: '', mode: null, scope: null, results: [], searching: false }),
  focusSearch: () => set((s) => ({ focusTrigger: s.focusTrigger + 1 })),
}))
