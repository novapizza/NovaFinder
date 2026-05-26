import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import fs from 'fs'
import path from 'path'

const AUTO_INSTALL_GRACE_MS = 30_000
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

let updateDownloaded = false
let installTimer: ReturnType<typeof setTimeout> | null = null

function getWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

function push(status: string, payload?: Record<string, unknown>) {
  getWindow()?.webContents.send('update:status', { status, ...payload })
}

function cancelAutoInstall() {
  if (installTimer !== null) {
    clearTimeout(installTimer)
    installTimer = null
  }
}

function scheduleAutoInstall() {
  cancelAutoInstall()
  const win = getWindow()
  if (!win || win.isVisible()) return
  installTimer = setTimeout(() => {
    autoUpdater.quitAndInstall(true, true)
  }, AUTO_INSTALL_GRACE_MS)
}

export function setupUpdater() {
  const exeDir = path.dirname(app.getPath('exe'))

  fs.access(exeDir, fs.constants.W_OK, (err) => {
    if (err) return

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://pub-de252b6499d04b519a15bbeb1b89f4ec.r2.dev',
    })

    autoUpdater.on('checking-for-update', () => push('checking'))
    autoUpdater.on('update-available', (info) => push('available', { version: info.version }))
    autoUpdater.on('update-not-available', () => push('not-available'))
    autoUpdater.on('download-progress', (p) => push('downloading', { percent: p.percent }))
    autoUpdater.on('update-downloaded', (info) => {
      updateDownloaded = true
      push('downloaded', { version: info.version })
      getWindow()?.webContents.send('update:downloaded', info.version)
      scheduleAutoInstall()
    })
    autoUpdater.on('error', (err) => push('error', { message: err.message }))

    ipcMain.on('update:install', () => autoUpdater.quitAndInstall(true, true))
    ipcMain.on('update:check', () => { autoUpdater.checkForUpdates().catch(() => {}) })
    ipcMain.handle('update:available', () => updateDownloaded)

    const attachWindowListeners = (w: BrowserWindow) => {
      w.on('show', cancelAutoInstall)
      w.on('hide', () => { if (updateDownloaded) scheduleAutoInstall() })
    }
    BrowserWindow.getAllWindows().forEach(attachWindowListeners)
    app.on('browser-window-created', (_e, w) => attachWindowListeners(w))

    autoUpdater.checkForUpdates().catch(() => {})
    setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}) }, CHECK_INTERVAL_MS)
  })
}
