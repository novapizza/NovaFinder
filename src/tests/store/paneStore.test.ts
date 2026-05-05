import { describe, it, expect, beforeEach } from 'vitest'
import { usePaneStore } from '../../renderer/store/paneStore'

const pane = (path = '/') => ({
  path,
  selection: [],
  lastSelected: null,
  history: [path],
  historyIndex: 0,
  sortKey: 'name' as const,
  sortDir: 'asc' as const,
  tagFilter: null,
})

beforeEach(() => {
  const left0 = { id: 'L0', ...pane('/') }
  const right0 = { id: 'R0', ...pane('/') }
  usePaneStore.setState({
    activePaneId: 'left',
    panes: { left: pane('/'), right: pane('/') },
    tabs: { left: [left0], right: [right0] },
    activeTabId: { left: left0.id, right: right0.id },
    showHidden: false,
    syncPanes: false,
    viewMode: 'icon',
  })
})

describe('paneStore', () => {
  describe('navigateTo', () => {
    it('updates the path and appends to history', () => {
      usePaneStore.getState().navigateTo('left', '/Users/test')
      const { panes } = usePaneStore.getState()
      expect(panes.left.path).toBe('/Users/test')
      expect(panes.left.history).toEqual(['/', '/Users/test'])
      expect(panes.left.historyIndex).toBe(1)
    })

    it('clears selection on navigate', () => {
      usePaneStore.getState().setSelection('left', ['/file.txt'])
      usePaneStore.getState().navigateTo('left', '/Users/test')
      expect(usePaneStore.getState().panes.left.selection).toEqual([])
    })

    it('truncates forward history when navigating from mid-point', () => {
      const { navigateTo, navigateBack } = usePaneStore.getState()
      navigateTo('left', '/a')
      navigateTo('left', '/b')
      navigateBack('left')
      navigateTo('left', '/c')
      const { history, historyIndex } = usePaneStore.getState().panes.left
      expect(history).toEqual(['/', '/a', '/c'])
      expect(historyIndex).toBe(2)
    })

    it('sets activePaneId to the navigated pane', () => {
      usePaneStore.getState().navigateTo('right', '/tmp')
      expect(usePaneStore.getState().activePaneId).toBe('right')
    })

    it('mirrors navigation to other pane when syncPanes=true', () => {
      usePaneStore.setState({ syncPanes: true })
      usePaneStore.getState().navigateTo('left', '/synced')
      expect(usePaneStore.getState().panes.right.path).toBe('/synced')
    })
  })

  describe('navigateBack', () => {
    it('goes back in history', () => {
      usePaneStore.getState().navigateTo('left', '/step1')
      usePaneStore.getState().navigateTo('left', '/step2')
      usePaneStore.getState().navigateBack('left')
      expect(usePaneStore.getState().panes.left.path).toBe('/step1')
      expect(usePaneStore.getState().panes.left.historyIndex).toBe(1)
    })

    it('is a no-op at the beginning of history', () => {
      usePaneStore.getState().navigateBack('left')
      expect(usePaneStore.getState().panes.left.path).toBe('/')
    })
  })

  describe('navigateForward', () => {
    it('goes forward in history', () => {
      usePaneStore.getState().navigateTo('left', '/forward')
      usePaneStore.getState().navigateBack('left')
      usePaneStore.getState().navigateForward('left')
      expect(usePaneStore.getState().panes.left.path).toBe('/forward')
    })

    it('is a no-op at the end of history', () => {
      usePaneStore.getState().navigateTo('left', '/only')
      usePaneStore.getState().navigateForward('left')
      expect(usePaneStore.getState().panes.left.path).toBe('/only')
    })
  })

  describe('navigateUp', () => {
    it('navigates to parent directory', () => {
      usePaneStore.getState().navigateTo('left', '/Users/test/projects')
      usePaneStore.getState().navigateUp('left')
      expect(usePaneStore.getState().panes.left.path).toBe('/Users/test')
    })

    it('is a no-op at root', () => {
      usePaneStore.getState().navigateUp('left')
      expect(usePaneStore.getState().panes.left.path).toBe('/')
    })
  })

  describe('setSelection', () => {
    it('sets selection and lastSelected to the last path', () => {
      usePaneStore.getState().setSelection('left', ['/a.txt', '/b.txt'])
      const pane = usePaneStore.getState().panes.left
      expect(pane.selection).toEqual(['/a.txt', '/b.txt'])
      expect(pane.lastSelected).toBe('/b.txt')
    })

    it('accepts an explicit lastSelected override', () => {
      usePaneStore.getState().setSelection('left', ['/a.txt', '/b.txt'], '/a.txt')
      expect(usePaneStore.getState().panes.left.lastSelected).toBe('/a.txt')
    })

    it('sets lastSelected to null for empty selection', () => {
      usePaneStore.getState().setSelection('left', [])
      expect(usePaneStore.getState().panes.left.lastSelected).toBeNull()
    })
  })

  describe('setSort', () => {
    it('sets the sort key and defaults to asc', () => {
      usePaneStore.getState().setSort('left', 'size')
      const pane = usePaneStore.getState().panes.left
      expect(pane.sortKey).toBe('size')
      expect(pane.sortDir).toBe('asc')
    })

    it('toggles to desc when the same key is selected while already asc', () => {
      // initial state already has sortKey='name', sortDir='asc'
      usePaneStore.getState().setSort('left', 'name')
      expect(usePaneStore.getState().panes.left.sortDir).toBe('desc')
    })

    it('resets to asc when switching to a different key', () => {
      usePaneStore.getState().setSort('left', 'name') // name, asc → name, desc
      usePaneStore.getState().setSort('left', 'modified') // different key → asc
      expect(usePaneStore.getState().panes.left.sortDir).toBe('asc')
    })
  })

  describe('toggleHidden', () => {
    it('flips showHidden', () => {
      expect(usePaneStore.getState().showHidden).toBe(false)
      usePaneStore.getState().toggleHidden()
      expect(usePaneStore.getState().showHidden).toBe(true)
      usePaneStore.getState().toggleHidden()
      expect(usePaneStore.getState().showHidden).toBe(false)
    })
  })

  describe('setViewMode', () => {
    it('updates the view mode', () => {
      usePaneStore.getState().setViewMode('list')
      expect(usePaneStore.getState().viewMode).toBe('list')
      usePaneStore.getState().setViewMode('column')
      expect(usePaneStore.getState().viewMode).toBe('column')
    })
  })

  describe('setTagFilter', () => {
    it('sets a tag filter on the pane', () => {
      usePaneStore.getState().setTagFilter('left', 'red')
      expect(usePaneStore.getState().panes.left.tagFilter).toBe('red')
    })

    it('clears the tag filter when set to null', () => {
      usePaneStore.getState().setTagFilter('left', 'blue')
      usePaneStore.getState().setTagFilter('left', null)
      expect(usePaneStore.getState().panes.left.tagFilter).toBeNull()
    })
  })
})
