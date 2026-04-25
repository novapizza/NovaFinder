import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileOps } from '../../renderer/hooks/useFileOps'
import { usePaneStore } from '../../renderer/store/paneStore'
import { useClipboardStore } from '../../renderer/store/clipboardStore'

const paneState = (path = '/home') => ({
  path,
  selection: [],
  lastSelected: null,
  history: [path],
  historyIndex: 0,
  sortKey: 'name' as const,
  sortDir: 'asc' as const,
  tagFilter: null,
})

const mockFs = {
  exists: vi.fn().mockResolvedValue(false),
  rename: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  writeClipboardText: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).fs = mockFs
  usePaneStore.setState({
    activePaneId: 'left',
    panes: { left: paneState('/home'), right: paneState('/home') },
    showHidden: false,
    syncPanes: false,
    viewMode: 'icon',
  })
  useClipboardStore.setState({ files: [], operation: null })
})

describe('useFileOps', () => {
  describe('cut / copy', () => {
    it('cut sets clipboard to cut operation', async () => {
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.cut(['/home/a.txt']))
      expect(useClipboardStore.getState().operation).toBe('cut')
      expect(useClipboardStore.getState().files).toEqual(['/home/a.txt'])
    })

    it('copy sets clipboard to copy operation', async () => {
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.copy(['/home/b.txt']))
      expect(useClipboardStore.getState().operation).toBe('copy')
      expect(useClipboardStore.getState().files).toEqual(['/home/b.txt'])
    })
  })

  describe('paste', () => {
    it('calls fs.rename for a cut operation', async () => {
      useClipboardStore.setState({ files: ['/tmp/file.txt'], operation: 'cut' })
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.paste('/home'))
      expect(mockFs.rename).toHaveBeenCalledWith('/tmp/file.txt', '/home/file.txt')
    })

    it('calls fs.copy for a copy operation to a different dir', async () => {
      useClipboardStore.setState({ files: ['/tmp/photo.jpg'], operation: 'copy' })
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.paste('/home/pics'))
      expect(mockFs.copy).toHaveBeenCalledWith('/tmp/photo.jpg', '/home/pics/photo.jpg')
    })

    it('generates a unique name when copying to the same dir', async () => {
      useClipboardStore.setState({ files: ['/home/note.txt'], operation: 'copy' })
      mockFs.exists.mockResolvedValueOnce(true).mockResolvedValue(false)
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.paste('/home'))
      expect(mockFs.copy).toHaveBeenCalledWith('/home/note.txt', '/home/note 2.txt')
    })

    it('clears clipboard after a cut-paste', async () => {
      useClipboardStore.setState({ files: ['/tmp/x.txt'], operation: 'cut' })
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.paste('/home'))
      expect(useClipboardStore.getState().operation).toBeNull()
    })

    it('does not clear clipboard after a copy-paste', async () => {
      useClipboardStore.setState({ files: ['/tmp/x.txt'], operation: 'copy' })
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.paste('/home'))
      expect(useClipboardStore.getState().operation).toBe('copy')
    })

    it('is a no-op when clipboard is empty', async () => {
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.paste('/home'))
      expect(mockFs.rename).not.toHaveBeenCalled()
      expect(mockFs.copy).not.toHaveBeenCalled()
    })
  })

  describe('deleteFiles', () => {
    it('calls fs.delete for each path', async () => {
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.deleteFiles(['/home/a.txt', '/home/b.txt']))
      expect(mockFs.delete).toHaveBeenCalledTimes(2)
      expect(mockFs.delete).toHaveBeenCalledWith('/home/a.txt')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/b.txt')
    })

    it('clears selection after delete', async () => {
      usePaneStore.getState().setSelection('left', ['/home/a.txt'])
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.deleteFiles(['/home/a.txt']))
      expect(usePaneStore.getState().panes.left.selection).toEqual([])
    })
  })

  describe('copyPath', () => {
    it('writes paths joined by newline to the system clipboard', async () => {
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.copyPath(['/a.txt', '/b.txt']))
      expect(mockFs.writeClipboardText).toHaveBeenCalledWith('/a.txt\n/b.txt')
    })
  })

  describe('rename', () => {
    it('calls fs.rename with the new full path', async () => {
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.rename('/home/old.txt', 'new.txt'))
      expect(mockFs.rename).toHaveBeenCalledWith('/home/old.txt', '/home/new.txt')
    })
  })

  describe('newFolder', () => {
    it('calls fs.mkdir with the given name when no collision', async () => {
      mockFs.exists.mockResolvedValue(false)
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.newFolder('/home', 'Projects'))
      expect(mockFs.mkdir).toHaveBeenCalledWith('/home/Projects')
    })

    it('uses a numbered name when the folder already exists', async () => {
      mockFs.exists.mockResolvedValueOnce(true).mockResolvedValue(false)
      const { result } = renderHook(() => useFileOps())
      await act(() => result.current.newFolder('/home', 'Projects'))
      expect(mockFs.mkdir).toHaveBeenCalledWith('/home/Projects 2')
    })
  })
})
