import { ipcMain, shell, clipboard } from 'electron'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'

export type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: number
  ext: string
}

async function readdir(dirPath: string, showHidden = false): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const results: FileEntry[] = []
  for (const entry of entries) {
    if (!showHidden && entry.name.startsWith('.')) continue
    const fullPath = path.join(dirPath, entry.name)
    try {
      const stat = await fs.stat(fullPath)
      results.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modified: stat.mtimeMs,
        ext: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase().slice(1),
      })
    } catch {
      // skip unreadable entries
    }
  }
  results.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return results
}

export function registerFsHandlers() {
  ipcMain.handle('fs:readdir', async (_e, dirPath: string, showHidden = false) => {
    try {
      return await readdir(dirPath, showHidden)
    } catch (err: any) {
      if (err?.code === 'EPERM' || err?.code === 'EACCES') {
        const e = new Error(`PERMISSION_DENIED: ${dirPath}`) as Error & { code: string }
        e.code = 'PERMISSION_DENIED'
        throw e
      }
      throw err
    }
  })

  ipcMain.handle('fs:stat', async (_e, filePath: string) => {
    const stat = await fs.stat(filePath)
    return {
      size: stat.size,
      modified: stat.mtimeMs,
      created: stat.birthtimeMs,
      isDirectory: stat.isDirectory(),
    }
  })

  ipcMain.handle('fs:readTextFile', async (_e, filePath: string) => {
    const stat = await fs.stat(filePath)
    if (stat.size > 2 * 1024 * 1024) return null // skip files > 2MB
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('fs:readBinaryFile', async (_e, filePath: string) => {
    const stat = await fs.stat(filePath)
    if (stat.size > 50 * 1024 * 1024) return null // skip files > 50MB
    const buf = await fs.readFile(filePath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  ipcMain.handle('fs:rename', async (_e, src: string, dest: string) => {
    await fs.rename(src, dest)
  })

  ipcMain.handle('fs:copy', async (_e, src: string, dest: string) => {
    const stat = await fs.stat(src)
    if (stat.isDirectory()) {
      await fs.cp(src, dest, { recursive: true })
    } else {
      await fs.copyFile(src, dest)
    }
  })

  ipcMain.handle('fs:delete', async (_e, filePath: string) => {
    await shell.trashItem(filePath)
  })

  ipcMain.handle('fs:mkdir', async (_e, dirPath: string) => {
    await fs.mkdir(dirPath, { recursive: true })
  })

  ipcMain.handle('fs:open', async (_e, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('fs:homedir', () => os.homedir())

  ipcMain.handle('fs:specialPaths', () => {
    const home = os.homedir()
    return {
      home,
      desktop: path.join(home, 'Desktop'),
      documents: path.join(home, 'Documents'),
      downloads: path.join(home, 'Downloads'),
      pictures: path.join(home, 'Pictures'),
      movies: path.join(home, 'Movies'),
      music: path.join(home, 'Music'),
      applications: '/Applications',
      volumes: '/Volumes',
      root: '/',
      icloud: path.join(home, 'Library/Mobile Documents/com~apple~CloudDocs'),
    }
  })

  ipcMain.handle('fs:showItemInFolder', (_e, p: string) => {
    shell.showItemInFolder(p)
  })

  ipcMain.handle('shell:openPrivacySettings', () => {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles')
  })

  ipcMain.handle('clipboard:writeText', (_e, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('fs:writeFile', async (_e, filePath: string, content = '') => {
    await fs.writeFile(filePath, content, { flag: 'wx' }) // wx fails if exists
  })

  const TEXT_EXTS = new Set([
    'txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ini', 'csv', 'xml', 'html', 'css',
    'ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'cpp', 'c', 'h',
    'sh', 'bash', 'zsh', 'log', 'env', 'conf',
  ])

  const SKIP_DIRS = new Set([
    'node_modules', '.git', '.cache', 'Library', '.Trash',
    'Cache', 'Caches', '.npm', '.yarn', '.cargo', '.rustup',
  ])

  async function walkSearch(
    dir: string,
    predicate: (entry: FileEntry) => boolean | Promise<boolean>,
    maxResults: number,
    maxDepth: number,
    depth = 0,
    results: FileEntry[] = [],
  ): Promise<FileEntry[]> {
    if (results.length >= maxResults || depth > maxDepth) return results
    let entries: fsSync.Dirent[] = []
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as unknown as fsSync.Dirent[]
    } catch { return results }

    for (const entry of entries) {
      if (results.length >= maxResults) break
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue

      const full = path.join(dir, entry.name)
      let stat
      try { stat = await fs.stat(full) } catch { continue }

      const fileEntry: FileEntry = {
        name: entry.name,
        path: full,
        isDirectory: entry.isDirectory(),
        size: stat.size,
        modified: stat.mtimeMs,
        ext: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase().slice(1),
      }

      try {
        if (await predicate(fileEntry)) {
          results.push(fileEntry)
          if (results.length >= maxResults) break
        }
      } catch {}

      if (entry.isDirectory()) {
        await walkSearch(full, predicate, maxResults, maxDepth, depth + 1, results)
      }
    }
    return results
  }

  ipcMain.handle('fs:searchRecursive', async (
    _e,
    dirPath: string,
    query: string,
    mode: 'name' | 'content' | 'kind' | 'size',
  ): Promise<FileEntry[]> => {
    if (!query) return []
    const q = query.toLowerCase()
    const maxResults = 500
    const maxDepth = 8

    if (mode === 'name') {
      return walkSearch(dirPath, (e) => e.name.toLowerCase().includes(q), maxResults, maxDepth)
    }
    if (mode === 'kind') {
      return walkSearch(dirPath, (e) => !e.isDirectory && e.ext.toLowerCase().includes(q), maxResults, maxDepth)
    }
    if (mode === 'size') {
      const KB = 1024, MB = 1024 * KB, GB = 1024 * MB
      const SIZE_RANGES: Record<string, [number, number]> = {
        tiny:   [0,       16 * KB],
        small:  [16 * KB, 1 * MB],
        medium: [1 * MB,  128 * MB],
        large:  [128 * MB, 1 * GB],
        huge:   [1 * GB,  Infinity],
      }
      const range = SIZE_RANGES[q]
      if (!range) return []
      const [min, max] = range
      return walkSearch(dirPath, (e) => !e.isDirectory && e.size >= min && e.size <= max, maxResults, maxDepth)
    }
    // content
    return walkSearch(dirPath, async (e) => {
      if (e.isDirectory) return false
      if (!TEXT_EXTS.has(e.ext)) return false
      if (e.size > 2 * 1024 * 1024) return false
      try {
        const text = await fs.readFile(e.path, 'utf-8')
        return text.toLowerCase().includes(q)
      } catch {
        return false
      }
    }, maxResults, maxDepth)
  })

  ipcMain.handle('fs:exists', async (_e, filePath: string) => {
    return fsSync.existsSync(filePath)
  })

  ipcMain.handle('fs:readdirsOnly', async (_e, dirPath: string) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const dirs: FileEntry[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const fullPath = path.join(dirPath, entry.name)
      dirs.push({ name: entry.name, path: fullPath, isDirectory: true, size: 0, modified: 0, ext: '' })
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return dirs
  })
}
