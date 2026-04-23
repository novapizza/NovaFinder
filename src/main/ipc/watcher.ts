import { ipcMain, BrowserWindow } from 'electron'
import fsSync from 'fs'

const watchers = new Map<string, fsSync.FSWatcher>()

export function registerWatcherHandlers(win: BrowserWindow) {
  ipcMain.on('fs:watch:start', (_e, dirPath: string) => {
    if (watchers.has(dirPath)) return
    try {
      const watcher = fsSync.watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (!win.isDestroyed()) {
          win.webContents.send('fs:watch:event', { dirPath, eventType, filename })
        }
      })
      watchers.set(dirPath, watcher)
    } catch {
      // directory may not exist or be inaccessible
    }
  })

  ipcMain.on('fs:watch:stop', (_e, dirPath: string) => {
    const w = watchers.get(dirPath)
    if (w) {
      w.close()
      watchers.delete(dirPath)
    }
  })
}

export function stopAllWatchers() {
  for (const w of watchers.values()) w.close()
  watchers.clear()
}
