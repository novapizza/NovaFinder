import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore } from '../../renderer/store/searchStore'
import type { FileEntry } from '../../renderer/components/FileList/useDirectory'

const emptyState = {
  query: '',
  mode: null,
  scope: null,
  results: [],
  searching: false,
  focusTrigger: 0,
}

beforeEach(() => {
  useSearchStore.setState(emptyState)
})

const mockEntry = (name: string): FileEntry => ({
  name,
  path: `/tmp/${name}`,
  isDirectory: false,
  size: 100,
  modified: Date.now(),
  ext: 'txt',
})

describe('searchStore', () => {
  it('starts with empty state', () => {
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.mode).toBeNull()
    expect(s.results).toEqual([])
    expect(s.searching).toBe(false)
  })

  it('setQuery updates the query', () => {
    useSearchStore.getState().setQuery('hello')
    expect(useSearchStore.getState().query).toBe('hello')
  })

  it('setMode updates the mode', () => {
    useSearchStore.getState().setMode('content')
    expect(useSearchStore.getState().mode).toBe('content')
  })

  it('setResults updates scope and results', () => {
    const entries = [mockEntry('report.txt')]
    useSearchStore.getState().setResults('/home/docs', entries)
    const s = useSearchStore.getState()
    expect(s.scope).toBe('/home/docs')
    expect(s.results).toEqual(entries)
  })

  it('setSearching toggles the searching flag', () => {
    useSearchStore.getState().setSearching(true)
    expect(useSearchStore.getState().searching).toBe(true)
    useSearchStore.getState().setSearching(false)
    expect(useSearchStore.getState().searching).toBe(false)
  })

  it('clear resets all fields', () => {
    useSearchStore.getState().setQuery('test')
    useSearchStore.getState().setMode('name')
    useSearchStore.getState().setSearching(true)
    useSearchStore.getState().clear()
    const s = useSearchStore.getState()
    expect(s.query).toBe('')
    expect(s.mode).toBeNull()
    expect(s.scope).toBeNull()
    expect(s.results).toEqual([])
    expect(s.searching).toBe(false)
  })

  it('focusSearch increments focusTrigger each call', () => {
    useSearchStore.getState().focusSearch()
    expect(useSearchStore.getState().focusTrigger).toBe(1)
    useSearchStore.getState().focusSearch()
    expect(useSearchStore.getState().focusTrigger).toBe(2)
  })
})
