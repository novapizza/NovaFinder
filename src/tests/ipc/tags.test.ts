// @vitest-environment node
import { vi, describe, it, expect, beforeAll } from 'vitest'

// Capture IPC handlers as they're registered
const handlers: Record<string, (...args: any[]) => any> = {}

const { mockFsModule } = vi.hoisted(() => ({
  mockFsModule: {
    readFile: vi.fn().mockResolvedValue('{}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handlers[channel] = handler
    }),
  },
  app: { getPath: vi.fn().mockReturnValue('/tmp/test-nova-tags') },
}))

vi.mock('fs/promises', () => ({ default: mockFsModule }))

import { registerTagsHandlers } from '../../main/ipc/tags'

describe('tags IPC handlers', () => {
  beforeAll(() => {
    registerTagsHandlers()
  })

  it('loadAll returns empty object from fresh file', async () => {
    const result = await handlers['tags:loadAll'](null)
    expect(result).toEqual({})
  })

  it('toggle adds a color to a file', async () => {
    const result = await handlers['tags:toggle'](null, '/docs/report.pdf', 'red')
    expect(result).toEqual(['red'])
  })

  it('toggle adds a second color to a file', async () => {
    const result = await handlers['tags:toggle'](null, '/docs/report.pdf', 'blue')
    expect(result).toEqual(['red', 'blue'])
  })

  it('toggle removes an existing color', async () => {
    const result = await handlers['tags:toggle'](null, '/docs/report.pdf', 'red')
    expect(result).toEqual(['blue'])
  })

  it('loadAll reflects accumulated in-memory state', async () => {
    const all = await handlers['tags:loadAll'](null)
    expect(all['/docs/report.pdf']).toEqual(['blue'])
  })

  it('clear removes all tags for a file', async () => {
    await handlers['tags:clear'](null, '/docs/report.pdf')
    const all = await handlers['tags:loadAll'](null)
    expect(all['/docs/report.pdf']).toBeUndefined()
  })

  it('rename moves tags from old path to new path', async () => {
    await handlers['tags:toggle'](null, '/old/file.txt', 'green')
    await handlers['tags:rename'](null, '/old/file.txt', '/new/file.txt')
    const all = await handlers['tags:loadAll'](null)
    expect(all['/old/file.txt']).toBeUndefined()
    expect(all['/new/file.txt']).toEqual(['green'])
  })

  it('rename is a no-op when old path has no tags', async () => {
    const before = await handlers['tags:loadAll'](null)
    await handlers['tags:rename'](null, '/no/such/file.txt', '/dest.txt')
    const after = await handlers['tags:loadAll'](null)
    expect(after['/dest.txt']).toBeUndefined()
    expect(after).toEqual(before)
  })

  it('persists to disk via writeFile after every mutation', async () => {
    mockFsModule.writeFile.mockClear()
    await handlers['tags:toggle'](null, '/persist/test.txt', 'purple')
    expect(mockFsModule.writeFile).toHaveBeenCalledOnce()
    await handlers['tags:clear'](null, '/persist/test.txt')
    expect(mockFsModule.writeFile).toHaveBeenCalledTimes(2)
  })
})
