import { describe, it, expect, beforeEach } from 'vitest'
import { useClipboardStore } from '../../renderer/store/clipboardStore'

beforeEach(() => {
  useClipboardStore.setState({ files: [], operation: null })
})

describe('clipboardStore', () => {
  it('starts with empty state', () => {
    const { files, operation } = useClipboardStore.getState()
    expect(files).toEqual([])
    expect(operation).toBeNull()
  })

  it('setCut sets files and operation=cut', () => {
    useClipboardStore.getState().setCut(['/a/file.txt', '/b/doc.pdf'])
    const { files, operation } = useClipboardStore.getState()
    expect(files).toEqual(['/a/file.txt', '/b/doc.pdf'])
    expect(operation).toBe('cut')
  })

  it('setCopy sets files and operation=copy', () => {
    useClipboardStore.getState().setCopy(['/img/photo.jpg'])
    const { files, operation } = useClipboardStore.getState()
    expect(files).toEqual(['/img/photo.jpg'])
    expect(operation).toBe('copy')
  })

  it('clear resets files and operation', () => {
    useClipboardStore.getState().setCut(['/tmp/x.txt'])
    useClipboardStore.getState().clear()
    const { files, operation } = useClipboardStore.getState()
    expect(files).toEqual([])
    expect(operation).toBeNull()
  })

  it('overwrites a previous operation with a new one', () => {
    useClipboardStore.getState().setCut(['/a.txt'])
    useClipboardStore.getState().setCopy(['/b.txt'])
    expect(useClipboardStore.getState().operation).toBe('copy')
    expect(useClipboardStore.getState().files).toEqual(['/b.txt'])
  })
})
