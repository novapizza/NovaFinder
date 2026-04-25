import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTagStore, EMPTY_TAGS } from '../../renderer/store/tagStore'

const mockTags = {
  loadAll: vi.fn(),
  toggle: vi.fn(),
  clear: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).tags = mockTags
  useTagStore.setState({ map: {}, loaded: false })
})

describe('tagStore', () => {
  describe('load', () => {
    it('calls window.tags.loadAll and populates the map', async () => {
      mockTags.loadAll.mockResolvedValue({ '/a/file.txt': ['red', 'blue'] })
      await useTagStore.getState().load()
      expect(mockTags.loadAll).toHaveBeenCalledOnce()
      expect(useTagStore.getState().map['/a/file.txt']).toEqual(['red', 'blue'])
      expect(useTagStore.getState().loaded).toBe(true)
    })

    it('does not call window.tags.loadAll a second time if already loaded', async () => {
      mockTags.loadAll.mockResolvedValue({})
      await useTagStore.getState().load()
      await useTagStore.getState().load()
      expect(mockTags.loadAll).toHaveBeenCalledOnce()
    })
  })

  describe('get', () => {
    it('returns EMPTY_TAGS for unknown paths', () => {
      expect(useTagStore.getState().get('/nonexistent.txt')).toBe(EMPTY_TAGS)
    })

    it('returns the stored tag list for a known path', () => {
      useTagStore.setState({ map: { '/known.txt': ['green'] } })
      expect(useTagStore.getState().get('/known.txt')).toEqual(['green'])
    })
  })

  describe('toggle', () => {
    it('adds a tag when not present', async () => {
      mockTags.toggle.mockResolvedValue(['red'])
      await useTagStore.getState().toggle('/file.txt', 'red')
      expect(useTagStore.getState().map['/file.txt']).toEqual(['red'])
    })

    it('removes a tag when window.tags.toggle returns empty array', async () => {
      useTagStore.setState({ map: { '/file.txt': ['red'] } })
      mockTags.toggle.mockResolvedValue([])
      await useTagStore.getState().toggle('/file.txt', 'red')
      expect(useTagStore.getState().map['/file.txt']).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('removes all tags for a path', async () => {
      useTagStore.setState({ map: { '/file.txt': ['blue', 'green'] } })
      mockTags.clear.mockResolvedValue(undefined)
      await useTagStore.getState().clear('/file.txt')
      expect(useTagStore.getState().map['/file.txt']).toBeUndefined()
    })

    it('calls window.tags.clear with the path', async () => {
      mockTags.clear.mockResolvedValue(undefined)
      await useTagStore.getState().clear('/some/path.txt')
      expect(mockTags.clear).toHaveBeenCalledWith('/some/path.txt')
    })
  })
})
