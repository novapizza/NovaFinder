import { ipcMain, shell, clipboard, dialog } from 'electron'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'

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

  ipcMain.handle('fs:statBatch', async (_e, paths: string[]): Promise<FileEntry[]> => {
    const results = await Promise.all(
      paths.map(async (p): Promise<FileEntry | null> => {
        try {
          const stat = await fs.stat(p)
          const name = path.basename(p)
          return {
            name,
            path: p,
            isDirectory: stat.isDirectory(),
            size: stat.size,
            modified: stat.mtimeMs,
            ext: stat.isDirectory() ? '' : (path.extname(name).slice(1).toLowerCase() ?? ''),
          }
        } catch {
          return null
        }
      })
    )
    return results.filter((e): e is FileEntry => e !== null)
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

  ipcMain.handle('fs:move', async (_e, src: string, dest: string) => {
    try {
      await fs.rename(src, dest)
    } catch (err: any) {
      if (err?.code === 'EXDEV') {
        const stat = await fs.stat(src)
        if (stat.isDirectory()) await fs.cp(src, dest, { recursive: true })
        else await fs.copyFile(src, dest)
        await fs.rm(src, { recursive: true, force: true })
      } else {
        throw err
      }
    }
  })

  ipcMain.handle('fs:trashPath', () => path.join(os.homedir(), '.Trash'))

  ipcMain.handle('fs:emptyTrash', async () => {
    await new Promise<void>((resolve, reject) => {
      execFile('osascript', ['-e', 'tell application "Finder" to empty trash'], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  ipcMain.handle('fs:mkdir', async (_e, dirPath: string) => {
    await fs.mkdir(dirPath, { recursive: true })
  })

  ipcMain.handle('fs:open', async (_e, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('fs:homedir', () => os.homedir())

  ipcMain.handle('fs:diskUsage', async (_e, p: string) => {
    const stats = await fs.statfs(p)
    const total = stats.blocks * stats.bsize
    const free = stats.bavail * stats.bsize
    const used = total - free
    return { total, free, used }
  })

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

  ipcMain.handle('shell:openInTerminal', (_e, dirPath: string) => {
    execFile('open', ['-a', 'Terminal', dirPath])
  })

  ipcMain.handle('fs:zip', async (_e, filePaths: string[]) => {
    if (!filePaths.length) return
    const dir = path.dirname(filePaths[0])
    const names = filePaths.map((f) => path.basename(f))
    const baseName = names.length === 1 ? names[0] : 'Archive'
    let archiveName = `${baseName}.zip`
    let count = 2
    while (fsSync.existsSync(path.join(dir, archiveName))) {
      archiveName = `${baseName} ${count}.zip`
      count++
    }
    const destPath = path.join(dir, archiveName)
    await new Promise<void>((resolve, reject) => {
      execFile('zip', ['-r', destPath, ...names], { cwd: dir }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    return destPath
  })

  ipcMain.handle('fs:unzip', async (_e, zipPath: string) => {
    const dir = path.dirname(zipPath)
    await new Promise<void>((resolve, reject) => {
      execFile('unzip', ['-o', zipPath, '-d', dir], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  ipcMain.handle('apps:list', async () => {
    const home = os.homedir()
    const dirs = ['/Applications', '/System/Applications', path.join(home, 'Applications')]
    const apps: { name: string; path: string }[] = []
    const seen = new Set<string>()
    for (const d of dirs) {
      try {
        const entries = await fs.readdir(d, { withFileTypes: true })
        for (const e of entries) {
          if (!e.name.endsWith('.app')) continue
          const full = path.join(d, e.name)
          if (seen.has(e.name)) continue
          seen.add(e.name)
          apps.push({ name: e.name.replace(/\.app$/, ''), path: full })
        }
      } catch {}
    }
    apps.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return apps
  })

  ipcMain.handle('apps:openWith', async (_e, appPath: string, filePaths: string[]) => {
    if (!filePaths.length) return
    await new Promise<void>((resolve, reject) => {
      execFile('open', ['-a', appPath, ...filePaths], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  ipcMain.handle('apps:chooseAndOpen', async (_e, filePaths: string[]) => {
    const result = await dialog.showOpenDialog({
      defaultPath: '/Applications',
      properties: ['openFile'],
      filters: [{ name: 'Applications', extensions: ['app'] }],
    })
    if (result.canceled || !result.filePaths.length) return null
    const appPath = result.filePaths[0]
    await new Promise<void>((resolve, reject) => {
      execFile('open', ['-a', appPath, ...filePaths], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    return appPath
  })

  ipcMain.handle('fs:gitStatus', (_e, dirPath: string) => {
    return new Promise<Record<string, string>>((resolve) => {
      execFile('git', ['-C', dirPath, 'status', '--porcelain'], (err, stdout) => {
        if (err) { resolve({}); return }
        const result: Record<string, string> = {}
        for (const line of stdout.split('\n')) {
          if (!line.trim()) continue
          const xy = line.substring(0, 2).trim()
          const filePart = line.substring(3).trim().split(' -> ').pop() ?? ''
          const name = filePart.split('/').pop() ?? filePart
          if (name) result[name] = xy === '??' ? '?' : (xy[0] && xy[0] !== ' ' ? xy[0] : xy[1]) || '?'
        }
        resolve(result)
      })
    })
  })
}
