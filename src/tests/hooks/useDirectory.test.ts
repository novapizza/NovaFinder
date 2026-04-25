import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDirectory } from '../../renderer/components/FileList/useDirectory'
import type { FileEntry } from '../../renderer/components/FileList/useDirectory'

const mockEntry = (name: string, isDirectory = false): FileEntry => ({
  name,
  path: `/tmp/${name}`,
  isDirectory,
  size: 100,
  modified: Date.now(),
  ext: isDirectory ? '' : name.split('.').pop() ?? '',
})

const mockFs = {
  readdir: vi.fn(),
  watchStart: vi.fn(),
  watchStop: vi.fn(),
  onWatchEvent: vi.fn().mockReturnValue(() => {}),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).fs = mockFs
})

describe('useDirectory', () => {
  it('loads entries on mount', async () => {
    const entries = [mockEntry('alpha.txt'), mockEntry('beta.txt')]
    mockFs.readdir.mockResolvedValue(entries)

    const { result } = renderHook(() => useDirectory('/tmp', false))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFs.readdir).toHaveBeenCalledWith('/tmp', false)
    expect(result.current.entries).toEqual(entries)
    expect(result.current.error).toBeNull()
  })

  it('starts with loading=true before data arrives', () => {
    mockFs.readdir.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useDirectory('/tmp', false))
    expect(result.current.loading).toBe(true)
  })

  it('sets error when readdir rejects', async () => {
    mockFs.readdir.mockRejectedValue(new Error('PERMISSION_DENIED'))
    const { result } = renderHook(() => useDirectory('/tmp', false))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('PERMISSION_DENIED')
    expect(result.current.entries).toEqual([])
  })

  it('calls watchStart with the directory path', async () => {
    mockFs.readdir.mockResolvedValue([])
    renderHook(() => useDirectory('/home/user', false))
    await waitFor(() => expect(mockFs.watchStart).toHaveBeenCalledWith('/home/user'))
  })

  it('registers an onWatchEvent listener', async () => {
    mockFs.readdir.mockResolvedValue([])
    renderHook(() => useDirectory('/tmp', false))
    await waitFor(() => expect(mockFs.onWatchEvent).toHaveBeenCalled())
  })

  it('passes showHidden flag to readdir', async () => {
    mockFs.readdir.mockResolvedValue([])
    renderHook(() => useDirectory('/tmp', true))
    await waitFor(() => expect(mockFs.readdir).toHaveBeenCalledWith('/tmp', true))
  })

  it('reload re-fetches entries', async () => {
    const first = [mockEntry('a.txt')]
    const second = [mockEntry('a.txt'), mockEntry('b.txt')]
    mockFs.readdir.mockResolvedValueOnce(first).mockResolvedValueOnce(second)

    const { result } = renderHook(() => useDirectory('/tmp', false))
    await waitFor(() => expect(result.current.entries).toHaveLength(1))

    result.current.reload()
    await waitFor(() => expect(result.current.entries).toHaveLength(2))
  })
})
