import { contextBridge, ipcRenderer } from 'electron'
import type { FileEntry } from '../main/ipc/fs'
import type { TagColor } from '../main/ipc/tags'

export type SpecialPaths = {
  home: string
  desktop: string
  documents: string
  downloads: string
  pictures: string
  movies: string
  music: string
  applications: string
  volumes: string
  root: string
  icloud: string
}

contextBridge.exposeInMainWorld('fs', {
  readdir: (p: string, showHidden?: boolean) => ipcRenderer.invoke('fs:readdir', p, showHidden),
  readdirsOnly: (p: string) => ipcRenderer.invoke('fs:readdirsOnly', p),
  stat: (p: string) => ipcRenderer.invoke('fs:stat', p),
  statBatch: (paths: string[]) => ipcRenderer.invoke('fs:statBatch', paths),
  readTextFile: (p: string) => ipcRenderer.invoke('fs:readTextFile', p),
  readBinaryFile: (p: string) => ipcRenderer.invoke('fs:readBinaryFile', p),
  rename: (src: string, dest: string) => ipcRenderer.invoke('fs:rename', src, dest),
  copy: (src: string, dest: string) => ipcRenderer.invoke('fs:copy', src, dest),
  delete: (p: string) => ipcRenderer.invoke('fs:delete', p),
  move: (src: string, dest: string) => ipcRenderer.invoke('fs:move', src, dest),
  trashPath: () => ipcRenderer.invoke('fs:trashPath'),
  eject: (volumePath: string) => ipcRenderer.invoke('fs:eject', volumePath),
  emptyTrash: () => ipcRenderer.invoke('fs:emptyTrash'),
  mkdir: (p: string) => ipcRenderer.invoke('fs:mkdir', p),
  open: (p: string) => ipcRenderer.invoke('fs:open', p),
  homedir: () => ipcRenderer.invoke('fs:homedir'),
  diskUsage: (p: string) => ipcRenderer.invoke('fs:diskUsage', p),
  specialPaths: () => ipcRenderer.invoke('fs:specialPaths'),
  exists: (p: string) => ipcRenderer.invoke('fs:exists', p),
  showItemInFolder: (p: string) => ipcRenderer.invoke('fs:showItemInFolder', p),
  openPrivacySettings: () => ipcRenderer.invoke('shell:openPrivacySettings'),
  openAppleIdSettings: () => ipcRenderer.invoke('shell:openAppleIdSettings'),
  writeClipboardText: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
  writeFile: (p: string, content?: string) => ipcRenderer.invoke('fs:writeFile', p, content),
  searchRecursive: (dir: string, query: string, mode: 'name' | 'content' | 'kind' | 'size') =>
    ipcRenderer.invoke('fs:searchRecursive', dir, query, mode),
  zip: (filePaths: string[]) => ipcRenderer.invoke('fs:zip', filePaths),
  unzip: (zipPath: string) => ipcRenderer.invoke('fs:unzip', zipPath),
  gitStatus: (dirPath: string) => ipcRenderer.invoke('fs:gitStatus', dirPath),
  openInTerminal: (dirPath: string) => ipcRenderer.invoke('shell:openInTerminal', dirPath),
  listApps: () => ipcRenderer.invoke('apps:list'),
  openWith: (appPath: string, filePaths: string[]) => ipcRenderer.invoke('apps:openWith', appPath, filePaths),
  chooseAppAndOpen: (filePaths: string[]) => ipcRenderer.invoke('apps:chooseAndOpen', filePaths),
  watchStart: (p: string) => ipcRenderer.send('fs:watch:start', p),
  watchStop: (p: string) => ipcRenderer.send('fs:watch:stop', p),
  onWatchEvent: (cb: (e: { dirPath: string; eventType: string; filename: string }) => void) => {
    ipcRenderer.on('fs:watch:event', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('fs:watch:event')
  },
})

contextBridge.exposeInMainWorld('tags', {
  loadAll: () => ipcRenderer.invoke('tags:loadAll'),
  toggle: (p: string, color: TagColor) => ipcRenderer.invoke('tags:toggle', p, color),
  clear: (p: string) => ipcRenderer.invoke('tags:clear', p),
  rename: (oldP: string, newP: string) => ipcRenderer.invoke('tags:rename', oldP, newP),
})

declare global {
  interface Window {
    fs: {
      readdir(p: string, showHidden?: boolean): Promise<FileEntry[]>
      readdirsOnly(p: string): Promise<FileEntry[]>
      stat(p: string): Promise<{ size: number; modified: number; created: number; isDirectory: boolean }>
      statBatch(paths: string[]): Promise<FileEntry[]>
      readTextFile(p: string): Promise<string | null>
      readBinaryFile(p: string): Promise<ArrayBuffer | null>
      rename(src: string, dest: string): Promise<void>
      copy(src: string, dest: string): Promise<void>
      delete(p: string): Promise<void>
      move(src: string, dest: string): Promise<void>
      trashPath(): Promise<string>
      eject(volumePath: string): Promise<void>
      emptyTrash(): Promise<void>
      mkdir(p: string): Promise<void>
      open(p: string): Promise<void>
      homedir(): Promise<string>
      diskUsage(p: string): Promise<{ total: number; free: number; used: number }>
      specialPaths(): Promise<SpecialPaths>
      exists(p: string): Promise<boolean>
      showItemInFolder(p: string): Promise<void>
      openPrivacySettings(): Promise<void>
      openAppleIdSettings(): Promise<void>
      writeClipboardText(text: string): Promise<void>
      writeFile(p: string, content?: string): Promise<void>
      searchRecursive(dir: string, query: string, mode: 'name' | 'content' | 'kind' | 'size'): Promise<FileEntry[]>
      zip(filePaths: string[]): Promise<string>
      unzip(zipPath: string): Promise<void>
      gitStatus(dirPath: string): Promise<Record<string, string>>
      openInTerminal(dirPath: string): Promise<void>
      listApps(): Promise<{ name: string; path: string }[]>
      openWith(appPath: string, filePaths: string[]): Promise<void>
      chooseAppAndOpen(filePaths: string[]): Promise<string | null>
      watchStart(p: string): void
      watchStop(p: string): void
      onWatchEvent(cb: (e: { dirPath: string; eventType: string; filename: string }) => void): () => void
    }
    tags: {
      loadAll(): Promise<Record<string, TagColor[]>>
      toggle(p: string, color: TagColor): Promise<TagColor[]>
      clear(p: string): Promise<void>
      rename(oldP: string, newP: string): Promise<void>
    }
  }
}
