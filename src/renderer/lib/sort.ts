import type { FileEntry } from '../components/FileList/useDirectory'
import type { SortKey, SortDir } from '../store/paneStore'

export function sortEntries(entries: FileEntry[], key: SortKey, dir: SortDir): FileEntry[] {
  const mult = dir === 'asc' ? 1 : -1
  const sorted = [...entries].sort((a, b) => {
    // Folders always first
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1

    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * mult
      case 'size':
        return (a.size - b.size) * mult
      case 'modified':
        return (a.modified - b.modified) * mult
      case 'kind':
        return a.ext.localeCompare(b.ext) * mult || a.name.localeCompare(b.name) * mult
      default:
        return 0
    }
  })
  return sorted
}
