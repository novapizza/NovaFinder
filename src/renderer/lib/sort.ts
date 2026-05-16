import type { FileEntry } from '../components/FileList/useDirectory'
import type { SortKey, SortDir } from '../store/paneStore'

// macOS Finder name-sort defaults: case-insensitive, diacritic-insensitive,
// natural numeric ordering (`file2` before `file10`), localized collation.
// Windows Explorer matches all of these except that it also keeps folders
// grouped at the top — that part is controlled separately by `foldersFirst`.
const NAME_COMPARE_OPTS: Intl.CollatorOptions = { sensitivity: 'base', numeric: true }

export function sortEntries(
  entries: FileEntry[],
  key: SortKey,
  dir: SortDir,
  options: { foldersFirst?: boolean } = {},
): FileEntry[] {
  const { foldersFirst = true } = options
  const mult = dir === 'asc' ? 1 : -1
  const sorted = [...entries].sort((a, b) => {
    if (foldersFirst && a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1

    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name, undefined, NAME_COMPARE_OPTS) * mult
      case 'size':
        return (a.size - b.size) * mult
      case 'modified':
        return (a.modified - b.modified) * mult
      case 'kind':
        // Primary by extension, then by name (using the same locale-aware,
        // natural-numeric comparison Finder uses).
        return a.ext.localeCompare(b.ext, undefined, NAME_COMPARE_OPTS) * mult
          || a.name.localeCompare(b.name, undefined, NAME_COMPARE_OPTS) * mult
      default:
        return 0
    }
  })
  return sorted
}
