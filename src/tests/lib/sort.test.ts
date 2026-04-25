import { describe, it, expect } from 'vitest'
import { sortEntries } from '../../renderer/lib/sort'
import type { FileEntry } from '../../renderer/components/FileList/useDirectory'

function entry(overrides: Partial<FileEntry> & { name: string }): FileEntry {
  return {
    path: `/tmp/${overrides.name}`,
    isDirectory: false,
    size: 0,
    modified: 0,
    ext: '',
    ...overrides,
  }
}

const file = (name: string, size = 0, modified = 0, ext = '') =>
  entry({ name, size, modified, ext, isDirectory: false })
const dir = (name: string) => entry({ name, isDirectory: true })

describe('sortEntries', () => {
  describe('folders first', () => {
    it('always places directories before files regardless of name order', () => {
      const input = [file('apple.txt'), dir('zFolder'), file('banana.txt'), dir('aFolder')]
      const result = sortEntries(input, 'name', 'asc')
      expect(result[0].isDirectory).toBe(true)
      expect(result[1].isDirectory).toBe(true)
      expect(result[2].isDirectory).toBe(false)
      expect(result[3].isDirectory).toBe(false)
    })
  })

  describe('sort by name', () => {
    it('sorts asc case-insensitively', () => {
      const input = [file('Zebra.txt'), file('apple.txt'), file('Mango.txt')]
      const result = sortEntries(input, 'name', 'asc')
      expect(result.map((e) => e.name)).toEqual(['apple.txt', 'Mango.txt', 'Zebra.txt'])
    })

    it('sorts desc', () => {
      const input = [file('apple.txt'), file('Zebra.txt'), file('Mango.txt')]
      const result = sortEntries(input, 'name', 'desc')
      expect(result.map((e) => e.name)).toEqual(['Zebra.txt', 'Mango.txt', 'apple.txt'])
    })

    it('does not mutate the original array', () => {
      const input = [file('b.txt'), file('a.txt')]
      const original = [...input]
      sortEntries(input, 'name', 'asc')
      expect(input.map((e) => e.name)).toEqual(original.map((e) => e.name))
    })
  })

  describe('sort by size', () => {
    it('sorts asc by byte size', () => {
      const input = [file('big.bin', 3000), file('tiny.bin', 10), file('mid.bin', 500)]
      const result = sortEntries(input, 'size', 'asc')
      expect(result.map((e) => e.size)).toEqual([10, 500, 3000])
    })

    it('sorts desc by byte size', () => {
      const input = [file('big.bin', 3000), file('tiny.bin', 10), file('mid.bin', 500)]
      const result = sortEntries(input, 'size', 'desc')
      expect(result.map((e) => e.size)).toEqual([3000, 500, 10])
    })
  })

  describe('sort by modified', () => {
    it('sorts asc by timestamp', () => {
      const input = [
        file('c.txt', 0, 3000),
        file('a.txt', 0, 1000),
        file('b.txt', 0, 2000),
      ]
      const result = sortEntries(input, 'modified', 'asc')
      expect(result.map((e) => e.modified)).toEqual([1000, 2000, 3000])
    })
  })

  describe('sort by kind', () => {
    it('groups by extension asc', () => {
      const input = [file('note.md', 0, 0, 'md'), file('image.png', 0, 0, 'png'), file('doc.md', 0, 0, 'md')]
      const result = sortEntries(input, 'kind', 'asc')
      expect(result[0].ext).toBe('md')
      expect(result[1].ext).toBe('md')
      expect(result[2].ext).toBe('png')
    })

    it('secondary sorts by name within the same extension', () => {
      const input = [file('z.md', 0, 0, 'md'), file('a.md', 0, 0, 'md')]
      const result = sortEntries(input, 'kind', 'asc')
      expect(result.map((e) => e.name)).toEqual(['a.md', 'z.md'])
    })
  })

  it('returns empty array for empty input', () => {
    expect(sortEntries([], 'name', 'asc')).toEqual([])
  })

  it('handles a single entry', () => {
    const input = [file('solo.txt')]
    expect(sortEntries(input, 'name', 'asc')).toHaveLength(1)
  })
})
