import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHistoryStore } from '../../renderer/store/historyStore'

const mockFs = {
  exists: vi.fn(),
  move: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).fs = mockFs
  useHistoryStore.setState({ past: [], future: [] })
})

describe('historyStore', () => {
  describe('trash undo', () => {
    it('moves each file from trash back to its original path', async () => {
      mockFs.exists.mockResolvedValue(false)
      useHistoryStore.getState().push({
        kind: 'trash',
        pairs: [
          { src: '/home/a.txt', dst: '/Users/u/.Trash/a.txt' },
          { src: '/home/b.txt', dst: '/Users/u/.Trash/b.txt' },
        ],
      })

      await useHistoryStore.getState().undo()

      expect(mockFs.move).toHaveBeenCalledTimes(2)
      expect(mockFs.move).toHaveBeenCalledWith('/Users/u/.Trash/a.txt', '/home/a.txt')
      expect(mockFs.move).toHaveBeenCalledWith('/Users/u/.Trash/b.txt', '/home/b.txt')
    })

    it('skips restore when original path already exists (avoid clobber)', async () => {
      mockFs.exists.mockImplementation(async (p: string) => p === '/home/a.txt')
      useHistoryStore.getState().push({
        kind: 'trash',
        pairs: [
          { src: '/home/a.txt', dst: '/Users/u/.Trash/a.txt' },
          { src: '/home/b.txt', dst: '/Users/u/.Trash/b.txt' },
        ],
      })

      await useHistoryStore.getState().undo()

      // a.txt skipped because path is occupied; b.txt restored
      expect(mockFs.move).toHaveBeenCalledTimes(1)
      expect(mockFs.move).toHaveBeenCalledWith('/Users/u/.Trash/b.txt', '/home/b.txt')
    })

    it('keeps undoing through history; one trash op per call', async () => {
      mockFs.exists.mockResolvedValue(false)
      const h = useHistoryStore.getState()
      h.push({ kind: 'trash', pairs: [{ src: '/a', dst: '/t/a' }] })
      h.push({ kind: 'trash', pairs: [{ src: '/b', dst: '/t/b' }] })

      await h.undo()
      expect(mockFs.move).toHaveBeenLastCalledWith('/t/b', '/b')
      expect(useHistoryStore.getState().past).toHaveLength(1)

      await h.undo()
      expect(mockFs.move).toHaveBeenLastCalledWith('/t/a', '/a')
      expect(useHistoryStore.getState().past).toHaveLength(0)
    })

    it('does not produce a redoable op for trash (delete is one-way)', async () => {
      mockFs.exists.mockResolvedValue(false)
      useHistoryStore.getState().push({
        kind: 'trash',
        pairs: [{ src: '/home/a.txt', dst: '/Users/u/.Trash/a.txt' }],
      })

      await useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })

    it('swallows individual move failures and continues the batch', async () => {
      mockFs.exists.mockResolvedValue(false)
      mockFs.move
        .mockRejectedValueOnce(new Error('fs unavailable'))
        .mockResolvedValueOnce(undefined)
      useHistoryStore.getState().push({
        kind: 'trash',
        pairs: [
          { src: '/home/a.txt', dst: '/Users/u/.Trash/a.txt' },
          { src: '/home/b.txt', dst: '/Users/u/.Trash/b.txt' },
        ],
      })

      await expect(useHistoryStore.getState().undo()).resolves.not.toThrow()
      expect(mockFs.move).toHaveBeenCalledTimes(2)
    })
  })

  describe('move undo / redo', () => {
    it('undo reverses each pair in reverse order then redo restores', async () => {
      const h = useHistoryStore.getState()
      h.push({ kind: 'move', pairs: [{ src: '/a', dst: '/b' }, { src: '/c', dst: '/d' }] })

      await h.undo()
      // reversed order
      expect(mockFs.move).toHaveBeenNthCalledWith(1, '/d', '/c')
      expect(mockFs.move).toHaveBeenNthCalledWith(2, '/b', '/a')

      // Future should now contain the inverse so redo works
      expect(useHistoryStore.getState().future).toHaveLength(1)
      await h.redo()
      expect(mockFs.move).toHaveBeenCalledTimes(4)
    })
  })

  describe('rename undo / redo', () => {
    it('rename undo swaps from/to then redo restores', async () => {
      const h = useHistoryStore.getState()
      h.push({ kind: 'rename', from: '/old.txt', to: '/new.txt' })

      await h.undo()
      expect(mockFs.rename).toHaveBeenCalledWith('/new.txt', '/old.txt')
      expect(useHistoryStore.getState().future).toHaveLength(1)

      await h.redo()
      expect(mockFs.rename).toHaveBeenCalledWith('/old.txt', '/new.txt')
    })
  })

  describe('canUndo / canRedo', () => {
    it('reports correct availability', () => {
      const h = useHistoryStore.getState()
      expect(h.canUndo()).toBe(false)
      expect(h.canRedo()).toBe(false)
      h.push({ kind: 'create', path: '/foo' })
      expect(useHistoryStore.getState().canUndo()).toBe(true)
    })
  })

  describe('push clears future', () => {
    it('any new op invalidates the redo stack', () => {
      const h = useHistoryStore.getState()
      h.push({ kind: 'create', path: '/a' })
      useHistoryStore.setState({ future: [{ kind: 'create', path: '/redo-me' }] })
      h.push({ kind: 'create', path: '/b' })
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })
  })
})
