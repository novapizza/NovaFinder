import path from 'path-browserify'
import { usePaneStore } from '../store/paneStore'
import { useClipboardStore } from '../store/clipboardStore'
import { useHistoryStore } from '../store/historyStore'

export function useFileOps(onReload?: () => void) {
  const { panes, activePaneId, setSelection } = usePaneStore()
  const { files: clipFiles, operation, setCut, setCopy, clear } = useClipboardStore()
  const pushHistory = useHistoryStore((s) => s.push)

  const activePane = panes[activePaneId]

  async function cut(paths: string[]) {
    setCut(paths)
    setSelection(activePaneId, paths)
  }

  async function copy(paths: string[]) {
    setCopy(paths)
    setSelection(activePaneId, paths)
  }

  // Build a name that doesn't collide: "file.txt" → "file 2.txt", "file 3.txt", etc.
  async function uniqueName(dir: string, name: string): Promise<string> {
    if (!(await window.fs.exists(path.join(dir, name)))) return name
    const ext = path.extname(name)
    const base = path.basename(name, ext)
    for (let n = 2; n < 1000; n++) {
      const candidate = `${base} ${n}${ext}`
      if (!(await window.fs.exists(path.join(dir, candidate)))) return candidate
    }
    return `${base}-${Date.now()}${ext}`
  }

  async function paste(destDir?: string) {
    const dest = destDir ?? activePane.path
    if (!clipFiles.length || !operation) return
    const movePairs: { src: string; dst: string }[] = []
    const copied: string[] = []
    for (const src of clipFiles) {
      const srcDir = path.dirname(src)
      const srcName = path.basename(src)
      const targetName = (operation === 'copy' && srcDir === dest)
        ? await uniqueName(dest, srcName)
        : srcName
      const destPath = path.join(dest, targetName)
      if (src === destPath) continue
      try {
        if (operation === 'cut') {
          await window.fs.rename(src, destPath)
          movePairs.push({ src, dst: destPath })
        } else {
          await window.fs.copy(src, destPath)
          copied.push(destPath)
        }
      } catch (e) {
        alert(`Failed to paste ${srcName}: ${e}`)
      }
    }
    if (operation === 'cut') {
      clear()
      if (movePairs.length) pushHistory({ kind: 'move', pairs: movePairs })
    } else if (copied.length) {
      pushHistory({ kind: 'copy', created: copied })
    }
    onReload?.()
  }

  async function duplicate(paths: string[]) {
    const created: string[] = []
    for (const src of paths) {
      const dir = path.dirname(src)
      const ext = path.extname(src)
      const base = path.basename(src, ext)
      const newName = await uniqueName(dir, `${base} copy${ext}`)
      try {
        const dest = path.join(dir, newName)
        await window.fs.copy(src, dest)
        created.push(dest)
      } catch (e) {
        alert(`Duplicate failed: ${e}`)
      }
    }
    if (created.length) pushHistory({ kind: 'copy', created })
    onReload?.()
  }

  async function copyPath(paths: string[]) {
    await window.fs.writeClipboardText(paths.join('\n'))
  }

async function deleteFiles(paths: string[]) {
    for (const p of paths) {
      try { await window.fs.delete(p) } catch (e) { alert(`Delete failed: ${e}`) }
    }
    setSelection(activePaneId, [])
    onReload?.()
  }

  async function newFolder(parentDir: string, name: string) {
    const finalName = await uniqueName(parentDir, name)
    const full = path.join(parentDir, finalName)
    await window.fs.mkdir(full)
    pushHistory({ kind: 'create', path: full })
    onReload?.()
  }

  async function newFile(parentDir: string, name: string) {
    const finalName = await uniqueName(parentDir, name)
    const full = path.join(parentDir, finalName)
    await window.fs.writeFile(full, '')
    pushHistory({ kind: 'create', path: full })
    onReload?.()
  }

  async function rename(filePath: string, newName: string) {
    const dir = path.dirname(filePath)
    const dest = path.join(dir, newName)
    await window.fs.rename(filePath, dest)
    pushHistory({ kind: 'rename', from: filePath, to: dest })
    onReload?.()
  }

  return { cut, copy, paste, duplicate, copyPath, deleteFiles, newFolder, newFile, rename }
}
