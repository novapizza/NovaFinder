import { describe, it, expect } from 'vitest'
import { formatSize, novaFileUrl } from '../../renderer/lib/formatters'

describe('formatSize', () => {
  it('returns "Zero bytes" for 0', () => {
    expect(formatSize(0)).toBe('Zero bytes')
  })

  it('returns "1 byte" for exactly 1', () => {
    expect(formatSize(1)).toBe('1 byte')
  })

  it('returns bytes label for values under 1 KB', () => {
    expect(formatSize(512)).toBe('512 bytes')
    expect(formatSize(1023)).toBe('1023 bytes')
  })

  it('returns KB for values between 1 KB and 1 MB', () => {
    expect(formatSize(1024)).toBe('1 KB')
    expect(formatSize(10 * 1024)).toBe('10 KB')
    expect(formatSize(1023 * 1024)).toBe('1,023 KB')
  })

  it('returns MB with one decimal for values between 1 MB and 1 GB', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })

  it('returns GB with two decimals for values >= 1 GB', () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.00 GB')
    expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB')
  })
})

describe('novaFileUrl', () => {
  it('prepends file:// to the path', () => {
    expect(novaFileUrl('/Users/test/photo.jpg')).toBe('file:///Users/test/photo.jpg')
  })

  it('handles paths with spaces', () => {
    expect(novaFileUrl('/Users/test/my file.pdf')).toBe('file:///Users/test/my file.pdf')
  })
})
