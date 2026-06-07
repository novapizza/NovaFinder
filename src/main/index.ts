import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'path'
import { registerFsHandlers } from './ipc/fs'
import { registerWatcherHandlers, stopAllWatchers } from './ipc/watcher'
import { registerTagsHandlers } from './ipc/tags'
import { setupUpdater } from './update'
import { COMMANDS, resolveAccel, type CommandId, type ShortcutOverrides } from '../shared/commands'

app.setName('NovaFinder')

// Latest shortcut overrides pushed from the renderer; used to label the File
// menu's accelerators so they match the user's remapped in-app shortcuts.
let shortcutOverrides: ShortcutOverrides = {}
let mainWin: BrowserWindow | null = null

ipcMain.on('menu:setShortcuts', (_e, overrides: ShortcutOverrides) => {
  shortcutOverrides = overrides || {}
  if (mainWin) buildMenu(mainWin)
})

function buildMenu(win: BrowserWindow) {
  const isMac = process.platform === 'darwin'

  // A File-menu item for a remappable command. The accelerator is shown for
  // discoverability but NOT registered (registerAccelerator: false) — the
  // renderer's keyboard handler owns the actual key, so it can't double-fire.
  const cmd = (id: CommandId): Electron.MenuItemConstructorOptions => {
    const def = COMMANDS.find((c) => c.id === id)!
    const accel = resolveAccel(id, shortcutOverrides)
    return {
      label: def.label,
      ...(accel ? { accelerator: accel, registerAccelerator: false } : {}),
      click: () => { win.webContents.send('app:command', id) },
    }
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            {
              label: 'Settings…',
              accelerator: 'Cmd+,',
              click: () => { win.webContents.send('app:open-settings') },
            },
            {
              label: 'Check for Updates…',
              click: () => { win.webContents.send('app:check-update') },
            },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        cmd('newFolder'), cmd('newFile'),
        { type: 'separator' },
        cmd('getInfo'), cmd('rename'), cmd('duplicate'),
        { type: 'separator' },
        cmd('moveToTrash'),
        { type: 'separator' },
        cmd('openInTerminal'), cmd('quickLook'), cmd('copyPath'), cmd('refresh'),
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        ...(!app.isPackaged ? [{
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => { win.webContents.toggleDevTools() },
        } as Electron.MenuItemConstructorOptions] : []),
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }, { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : [{ role: 'close' as const }]),
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow() {
  // In production the .app bundle icon is used; dock.setIcon is only useful in dev.
  // Wrapped in try/catch because the icon path doesn't resolve when the built
  // bundle is launched outside its packaged location (e.g. e2e tests).
  if (!app.isPackaged && process.platform === 'darwin') {
    try {
      app.dock.setIcon(path.join(app.getAppPath(), 'assets', 'icon.png'))
    } catch (e) {
      console.warn('dock.setIcon failed:', e)
    }
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      // Disable webSecurity only in dev (localhost renderer can't load file:// otherwise).
      // Production renderer loads from file:// so same-origin policy works natively.
      webSecurity: !process.env['ELECTRON_RENDERER_URL'],
    },
  })

  registerWatcherHandlers(win)
  mainWin = win
  buildMenu(win)

  win.once('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.on('closed', () => stopAllWatchers())
}

app.whenReady().then(() => {
  registerFsHandlers()
  registerTagsHandlers()
  createWindow()
  setupUpdater()
})

app.on('window-all-closed', () => {
  stopAllWatchers()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
