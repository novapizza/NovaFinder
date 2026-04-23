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
  readTextFile: (p: string) => ipcRenderer.invoke('fs:readTextFile', p),
  readBinaryFile: (p: string) => ipcRenderer.invoke('fs:readBinaryFile', p),
  rename: (src: string, dest: string) => ipcRenderer.invoke('fs:rename', src, dest),
  copy: (src: string, dest: string) => ipcRenderer.invoke('fs:copy', src, dest),
  delete: (p: string) => ipcRenderer.invoke('fs:delete', p),
  mkdir: (p: string) => ipcRenderer.invoke('fs:mkdir', p),
  open: (p: string) => ipcRenderer.invoke('fs:open', p),
  homedir: () => ipcRenderer.invoke('fs:homedir'),
  specialPaths: () => ipcRenderer.invoke('fs:specialPaths'),
  exists: (p: string) => ipcRenderer.invoke('fs:exists', p),
  showItemInFolder: (p: string) => ipcRenderer.invoke('fs:showItemInFolder', p),
  openPrivacySettings: () => ipcRenderer.invoke('shell:openPrivacySettings'),
  writeClipboardText: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
  writeFile: (p: string, content?: string) => ipcRenderer.invoke('fs:writeFile', p, content),
  searchRecursive: (dir: string, query: string, mode: 'name' | 'content' | 'kind' | 'size') =>
    ipcRenderer.invoke('fs:searchRecursive', dir, query, mode),
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
      readTextFile(p: string): Promise<string | null>
      readBinaryFile(p: string): Promise<ArrayBuffer | null>
      rename(src: string, dest: string): Promise<void>
      copy(src: string, dest: string): Promise<void>
      delete(p: string): Promise<void>
      mkdir(p: string): Promise<void>
      open(p: string): Promise<void>
      homedir(): Promise<string>
      specialPaths(): Promise<SpecialPaths>
      exists(p: string): Promise<boolean>
      showItemInFolder(p: string): Promise<void>
      openPrivacySettings(): Promise<void>
      writeClipboardText(text: string): Promise<void>
      writeFile(p: string, content?: string): Promise<void>
      searchRecursive(dir: string, query: string, mode: 'name' | 'content' | 'kind' | 'size'): Promise<FileEntry[]>
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
