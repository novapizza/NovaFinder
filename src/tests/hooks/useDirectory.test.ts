import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDirectory } from '../../renderer/components/FileList/useDirectory'
import type { FileEntry } from '../../renderer/components/FileList/useDirectory'

const mockEntry = (name: string, isDirectory = false): FileEntry => ({
  name,
  path: `/tmp/${name}`,
  isDirectory,
  // useDirectory now returns the lite list first (no stat) and merges
  // size/modified/created from streamed batches, so tests should start
  // with zeros and assert on the lite shape unless a batch is simulated.
  size: 0,
  modified: 0,
  created: 0,
  ext: isDirectory ? '' : name.split('.').pop() ?? '',
})

// Simulates the preload streaming bridge. We immediately resolve the
// lite list and then fire the done callback synchronously so the
// loading flag flips back to false the way the production wiring does.
function makeStreamMock(initial: FileEntry[] | Promise<FileEntry[]>, batches: { path: string; size: number; modified: number; created: number }[][] = []) {
  return (
    _p: string,
    _showHidden: boolean | undefined,
    onStats: (b: { path: string; size: number; modified: number; created: number }[]) => void,
    onDone?: () => void,
  ) => {
    const promise = Promise.resolve(initial).then((lite) => {
      // Schedule stat batches + done after the lite list resolves so
      // the hook has a chance to commit it first. setTimeout (not
      // queueMicrotask) so React flushes its commit phase in between.
      setTimeout(() => {
        for (const b of batches) onStats(b)
        onDone?.()
      }, 0)
      return lite
    })
    return { promise, cancel: () => {} }
  }
}

const mockFs = {
  readdir: vi.fn(),
  readdirStream: vi.fn(),
  watchStart: vi.fn(),
  watchStop: vi.fn(),
  onWatchEvent: vi.fn().mockReturnValue(() => {}),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).fs = mockFs
})

describe('useDirectory', () => {
  it('loads lite entries on mount', async () => {
    const entries = [mockEntry('alpha.txt'), mockEntry('beta.txt')]
    mockFs.readdirStream.mockImplementation(makeStreamMock(entries))

    const { result } = renderHook(() => useDirectory('/tmp', false))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFs.readdirStream).toHaveBeenCalled()
    expect(result.current.entries).toEqual(entries)
    expect(result.current.error).toBeNull()
  })

  it('merges stat batches into the lite list as they stream in', async () => {
    const entries = [mockEntry('a.txt')]
    mockFs.readdirStream.mockImplementation(makeStreamMock(entries, [
      [{ path: '/tmp/a.txt', size: 4096, modified: 1234, created: 99 }],
    ]))

    const { result } = renderHook(() => useDirectory('/tmp', false))

    await waitFor(() => expect(result.current.entries[0]?.size).toBe(4096))
    expect(result.current.entries[0]?.modified).toBe(1234)
  })

  it('starts with loading=true before data arrives', () => {
    mockFs.readdirStream.mockImplementation(makeStreamMock(new Promise<FileEntry[]>(() => {})))
    const { result } = renderHook(() => useDirectory('/tmp', false))
    expect(result.current.loading).toBe(true)
  })

  it('sets error when readdirStream rejects', async () => {
    mockFs.readdirStream.mockImplementation(() => ({
      promise: Promise.reject(new Error('PERMISSION_DENIED')),
      cancel: () => {},
    }))
    const { result } = renderHook(() => useDirectory('/tmp', false))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('PERMISSION_DENIED')
    expect(result.current.entries).toEqual([])
  })

  it('calls watchStart with the directory path', async () => {
    mockFs.readdirStream.mockImplementation(makeStreamMock([]))
    renderHook(() => useDirectory('/home/user', false))
    await waitFor(() => expect(mockFs.watchStart).toHaveBeenCalledWith('/home/user'))
  })

  it('registers an onWatchEvent listener', async () => {
    mockFs.readdirStream.mockImplementation(makeStreamMock([]))
    renderHook(() => useDirectory('/tmp', false))
    await waitFor(() => expect(mockFs.onWatchEvent).toHaveBeenCalled())
  })

  it('passes showHidden flag to readdirStream', async () => {
    mockFs.readdirStream.mockImplementation(makeStreamMock([]))
    renderHook(() => useDirectory('/tmp', true))
    await waitFor(() =>
      expect(mockFs.readdirStream).toHaveBeenCalledWith('/tmp', true, expect.any(Function), expect.any(Function)),
    )
  })

  it('reload re-fetches entries', async () => {
    const first = [mockEntry('a.txt')]
    const second = [mockEntry('a.txt'), mockEntry('b.txt')]
    mockFs.readdirStream
      .mockImplementationOnce(makeStreamMock(first))
      .mockImplementationOnce(makeStreamMock(second))

    const { result } = renderHook(() => useDirectory('/tmp', false))
    await waitFor(() => expect(result.current.entries).toHaveLength(1))

    result.current.reload()
    await waitFor(() => expect(result.current.entries).toHaveLength(2))
  })
})
