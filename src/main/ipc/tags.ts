import { ipcMain, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export type TagColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'

let cache: Record<string, TagColor[]> | null = null

function tagsFile() {
  return path.join(app.getPath('userData'), 'tags.json')
}

async function load(): Promise<Record<string, TagColor[]>> {
  if (cache) return cache
  try {
    const txt = await fs.readFile(tagsFile(), 'utf-8')
    cache = JSON.parse(txt)
  } catch {
    cache = {}
  }
  return cache!
}

async function save() {
  if (!cache) return
  try { await fs.writeFile(tagsFile(), JSON.stringify(cache)) } catch {}
}

export function registerTagsHandlers() {
  ipcMain.handle('tags:loadAll', async () => await load())

  ipcMain.handle('tags:toggle', async (_e, filePath: string, color: TagColor) => {
    const all = await load()
    const cur = all[filePath] ?? []
    const next = cur.includes(color) ? cur.filter((c) => c !== color) : [...cur, color]
    if (next.length === 0) delete all[filePath]
    else all[filePath] = next
    await save()
    return next
  })

  ipcMain.handle('tags:clear', async (_e, filePath: string) => {
    const all = await load()
    delete all[filePath]
    await save()
  })

  ipcMain.handle('tags:rename', async (_e, oldPath: string, newPath: string) => {
    const all = await load()
    if (all[oldPath]) {
      all[newPath] = all[oldPath]
      delete all[oldPath]
      await save()
    }
  })
}
