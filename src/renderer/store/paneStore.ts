import { create } from 'zustand'

export type SortKey = 'name' | 'size' | 'modified' | 'kind'
export type SortDir = 'asc' | 'desc'
export type ViewMode = 'icon' | 'list' | 'column' | 'gallery'

type PaneState = {
  path: string
  selection: string[]
  lastSelected: string | null   // anchor for shift-range selection
  history: string[]
  historyIndex: number
  sortKey: SortKey
  sortDir: SortDir
  tagFilter: string | null
}

type PaneStore = {
  activePaneId: 'left' | 'right'
  panes: { left: PaneState; right: PaneState }
  showHidden: boolean
  syncPanes: boolean
  setSyncPanes: (v: boolean) => void
  setActivePaneId: (id: 'left' | 'right') => void
  navigateTo: (id: 'left' | 'right', newPath: string) => void
  navigateBack: (id: 'left' | 'right') => void
  navigateForward: (id: 'left' | 'right') => void
  navigateUp: (id: 'left' | 'right') => void
  setSelection: (id: 'left' | 'right', paths: string[], lastSelected?: string | null) => void
  setSort: (id: 'left' | 'right', key: SortKey) => void
  setViewMode: (mode: ViewMode) => void
  setTagFilter: (id: 'left' | 'right', tag: string | null) => void
  toggleHidden: () => void
  viewMode: ViewMode
}

function makePane(path: string): PaneState {
  return {
    path,
    selection: [],
    lastSelected: null,
    history: [path],
    historyIndex: 0,
    sortKey: 'name',
    sortDir: 'asc',
    tagFilter: null,
  }
}

export const usePaneStore = create<PaneStore>((set) => ({
  activePaneId: 'left',
  panes: { left: makePane('/'), right: makePane('/') },
  showHidden: false,
  syncPanes: false,
  viewMode: 'icon',

  setViewMode: (mode) => set({ viewMode: mode }),
  setSyncPanes: (v) => set({ syncPanes: v }),

  setActivePaneId: (id) => set({ activePaneId: id }),

  navigateTo: (id, newPath) =>
    set((s) => {
      function updatePane(pane: PaneState) {
        const newHistory = [...pane.history.slice(0, pane.historyIndex + 1), newPath]
        return { ...pane, path: newPath, selection: [], lastSelected: null, history: newHistory, historyIndex: newHistory.length - 1 }
      }
      const otherId = id === 'left' ? 'right' : 'left'
      return {
        activePaneId: id,
        panes: {
          ...s.panes,
          [id]: updatePane(s.panes[id]),
          ...(s.syncPanes ? { [otherId]: updatePane(s.panes[otherId]) } : {}),
        },
      }
    }),

  navigateBack: (id) =>
    set((s) => {
      const pane = s.panes[id]
      if (pane.historyIndex <= 0) return s
      const newIndex = pane.historyIndex - 1
      return {
        panes: {
          ...s.panes,
          [id]: { ...pane, path: pane.history[newIndex], selection: [], lastSelected: null, historyIndex: newIndex },
        },
      }
    }),

  navigateForward: (id) =>
    set((s) => {
      const pane = s.panes[id]
      if (pane.historyIndex >= pane.history.length - 1) return s
      const newIndex = pane.historyIndex + 1
      return {
        panes: {
          ...s.panes,
          [id]: { ...pane, path: pane.history[newIndex], selection: [], lastSelected: null, historyIndex: newIndex },
        },
      }
    }),

  navigateUp: (id) =>
    set((s) => {
      const pane = s.panes[id]
      const parent = pane.path.split('/').slice(0, -1).join('/') || '/'
      if (parent === pane.path) return s
      const newHistory = [...pane.history.slice(0, pane.historyIndex + 1), parent]
      return {
        panes: {
          ...s.panes,
          [id]: {
            ...pane,
            path: parent,
            selection: [],
            lastSelected: null,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
        },
      }
    }),

  setSelection: (id, paths, lastSelected) =>
    set((s) => ({
      activePaneId: id,
      panes: {
        ...s.panes,
        [id]: {
          ...s.panes[id],
          selection: paths,
          lastSelected: lastSelected !== undefined ? lastSelected : (paths[paths.length - 1] ?? null),
        },
      },
    })),

  setSort: (id, key) =>
    set((s) => {
      const pane = s.panes[id]
      const dir: SortDir = pane.sortKey === key && pane.sortDir === 'asc' ? 'desc' : 'asc'
      return { panes: { ...s.panes, [id]: { ...pane, sortKey: key, sortDir: dir } } }
    }),

  setTagFilter: (id, tag) =>
    set((s) => ({
      panes: { ...s.panes, [id]: { ...s.panes[id], tagFilter: tag } },
    })),

  toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
}))
