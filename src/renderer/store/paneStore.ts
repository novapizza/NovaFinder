import { create } from 'zustand'

export type SortKey = 'name' | 'size' | 'modified' | 'kind'
export type SortDir = 'asc' | 'desc'
export type ViewMode = 'icon' | 'list' | 'column' | 'gallery'
export type PaneId = 'left' | 'right'

type PaneState = {
  path: string
  selection: string[]
  lastSelected: string | null
  history: string[]
  historyIndex: number
  sortKey: SortKey
  sortDir: SortDir
  tagFilter: string | null
}

export type Tab = PaneState & { id: string }

type PaneStore = {
  activePaneId: PaneId
  panes: { left: PaneState; right: PaneState }   // mirror of the active tab for easy reads
  tabs: { left: Tab[]; right: Tab[] }
  activeTabId: { left: string; right: string }
  showHidden: boolean
  syncPanes: boolean
  viewMode: ViewMode

  setSyncPanes: (v: boolean) => void
  setActivePaneId: (id: PaneId) => void

  navigateTo: (id: PaneId, newPath: string) => void
  navigateBack: (id: PaneId) => void
  navigateForward: (id: PaneId) => void
  navigateUp: (id: PaneId) => void
  setSelection: (id: PaneId, paths: string[], lastSelected?: string | null) => void
  setSort: (id: PaneId, key: SortKey) => void
  setViewMode: (mode: ViewMode) => void
  setTagFilter: (id: PaneId, tag: string | null) => void
  toggleHidden: () => void

  newTab: (id: PaneId, path?: string) => void
  closeTab: (id: PaneId, tabId: string) => void
  switchTab: (id: PaneId, tabId: string) => void
}

let _tabSeq = 0
function nextTabId(): string { _tabSeq += 1; return `t${_tabSeq}` }

function makeTab(p: string): Tab {
  return {
    id: nextTabId(),
    path: p,
    selection: [],
    lastSelected: null,
    history: [p],
    historyIndex: 0,
    sortKey: 'name',
    sortDir: 'asc',
    tagFilter: null,
  }
}

// Replace the active tab's contents in-place and re-mirror to panes[id].
function writeActive(state: PaneStore, id: PaneId, mutate: (cur: Tab) => Tab): Partial<PaneStore> {
  const list = state.tabs[id]
  const activeId = state.activeTabId[id]
  const idx = list.findIndex((t) => t.id === activeId)
  if (idx < 0) return {}
  const nextTab = mutate(list[idx])
  const newList = list.slice()
  newList[idx] = nextTab
  return {
    panes: { ...state.panes, [id]: nextTab },
    tabs: { ...state.tabs, [id]: newList },
  }
}

function paneFromTab(t: Tab): PaneState {
  const { id: _id, ...rest } = t
  return rest
}

export const usePaneStore = create<PaneStore>((set) => {
  const left0 = makeTab('/')
  const right0 = makeTab('/')
  return {
    activePaneId: 'left',
    panes: { left: paneFromTab(left0), right: paneFromTab(right0) },
    tabs: { left: [left0], right: [right0] },
    activeTabId: { left: left0.id, right: right0.id },
    showHidden: false,
    syncPanes: false,
    viewMode: 'icon',

    setViewMode: (mode) => set({ viewMode: mode }),
    setSyncPanes: (v) => set({ syncPanes: v }),
    setActivePaneId: (id) => set({ activePaneId: id }),

    navigateTo: (id, newPath) =>
      set((s) => {
        const navigated = (cur: Tab): Tab => {
          const newHistory = [...cur.history.slice(0, cur.historyIndex + 1), newPath]
          return { ...cur, path: newPath, selection: [], lastSelected: null, history: newHistory, historyIndex: newHistory.length - 1 }
        }
        const updates = writeActive(s, id, navigated)
        if (s.syncPanes) {
          const otherId: PaneId = id === 'left' ? 'right' : 'left'
          const merged = { ...s, ...updates } as PaneStore
          const otherUpd = writeActive(merged, otherId, navigated)
          return { activePaneId: id, ...updates, ...otherUpd }
        }
        return { activePaneId: id, ...updates }
      }),

    navigateBack: (id) =>
      set((s) => writeActive(s, id, (cur) => {
        if (cur.historyIndex <= 0) return cur
        const newIndex = cur.historyIndex - 1
        return { ...cur, path: cur.history[newIndex], selection: [], lastSelected: null, historyIndex: newIndex }
      })),

    navigateForward: (id) =>
      set((s) => writeActive(s, id, (cur) => {
        if (cur.historyIndex >= cur.history.length - 1) return cur
        const newIndex = cur.historyIndex + 1
        return { ...cur, path: cur.history[newIndex], selection: [], lastSelected: null, historyIndex: newIndex }
      })),

    navigateUp: (id) =>
      set((s) => writeActive(s, id, (cur) => {
        const parent = cur.path.split('/').slice(0, -1).join('/') || '/'
        if (parent === cur.path) return cur
        const newHistory = [...cur.history.slice(0, cur.historyIndex + 1), parent]
        return { ...cur, path: parent, selection: [], lastSelected: null, history: newHistory, historyIndex: newHistory.length - 1 }
      })),

    setSelection: (id, paths, lastSelected) =>
      set((s) => ({
        activePaneId: id,
        ...writeActive(s, id, (cur) => ({
          ...cur,
          selection: paths,
          lastSelected: lastSelected !== undefined ? lastSelected : (paths[paths.length - 1] ?? null),
        })),
      })),

    setSort: (id, key) =>
      set((s) => writeActive(s, id, (cur) => {
        const dir: SortDir = cur.sortKey === key && cur.sortDir === 'asc' ? 'desc' : 'asc'
        return { ...cur, sortKey: key, sortDir: dir }
      })),

    setTagFilter: (id, tag) =>
      set((s) => writeActive(s, id, (cur) => ({ ...cur, tagFilter: tag }))),

    toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),

    newTab: (id, p) =>
      set((s) => {
        const seedPath = p ?? s.panes[id].path
        const tab = makeTab(seedPath)
        const tabsForPane = [...s.tabs[id], tab]
        return {
          activePaneId: id,
          tabs: { ...s.tabs, [id]: tabsForPane },
          activeTabId: { ...s.activeTabId, [id]: tab.id },
          panes: { ...s.panes, [id]: paneFromTab(tab) },
        }
      }),

    closeTab: (id, tabId) =>
      set((s) => {
        const list = s.tabs[id]
        if (list.length <= 1) return s
        const idx = list.findIndex((t) => t.id === tabId)
        if (idx < 0) return s
        const tabsForPane = list.slice(0, idx).concat(list.slice(idx + 1))
        const wasActive = s.activeTabId[id] === tabId
        const nextActive = wasActive ? tabsForPane[Math.min(idx, tabsForPane.length - 1)] : list.find((t) => t.id === s.activeTabId[id])!
        return {
          tabs: { ...s.tabs, [id]: tabsForPane },
          activeTabId: { ...s.activeTabId, [id]: nextActive.id },
          panes: { ...s.panes, [id]: paneFromTab(nextActive) },
        }
      }),

    switchTab: (id, tabId) =>
      set((s) => {
        const list = s.tabs[id]
        const tab = list.find((t) => t.id === tabId)
        if (!tab) return s
        return {
          activePaneId: id,
          activeTabId: { ...s.activeTabId, [id]: tabId },
          panes: { ...s.panes, [id]: paneFromTab(tab) },
        }
      }),
  }
})
