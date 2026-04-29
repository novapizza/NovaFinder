import { useEffect, useMemo, useRef, useState } from 'react'
import { usePaneStore, type SortKey } from '../../store/paneStore'
import { useDirectory } from './useDirectory'
import { FileRow } from './FileRow'
import { FileGrid } from './FileGrid'
import { ColumnView } from './ColumnView'
import { GalleryView } from './GalleryView'
import { parseSmartFolderId, useSmartFoldersStore } from '../../store/smartFoldersStore'
import { useFileOps } from '../../hooks/useFileOps'
import { sortEntries } from '../../lib/sort'
import { useFileMenu } from '../../hooks/useFileMenu'
import { useHistoryStore } from '../../store/historyStore'
import { useSearchStore } from '../../store/searchStore'
import { useTagStore, type TagColor, EMPTY_TAGS } from '../../store/tagStore'
import { useRecentsStore, RECENTS_PATH } from '../../store/recentsStore'
import { useRecentFoldersStore } from '../../store/recentFoldersStore'
import { useGitStatus } from '../../hooks/useGitStatus'
import { FileIcon } from '../FileIcon'

type Props = {
  paneId: 'left' | 'right'
  onPreview: (path: string, ext: string) => void
  onClearPreview?: () => void
  registerReload?: (fn: () => void) => void
  registerNewFolder?: (fn: () => void) => void
  registerNewFile?: (fn: () => void) => void
}

type PendingNew = { type: 'folder' | 'file' }

export function FileList({ paneId, onPreview, onClearPreview, registerReload, registerNewFolder, registerNewFile }: Props) {
  const { panes, activePaneId, showHidden, viewMode, setActivePaneId, navigateTo, navigateUp, setSelection, setSort } = usePaneStore()
  const pane = panes[paneId]
  const addRecent = useRecentsStore((s) => s.add)
  const recentEntries = useRecentsStore((s) => s.recents)
  const isRecentsMode = pane.path === RECENTS_PATH
  const smartId = parseSmartFolderId(pane.path)
  const smartFolder = useSmartFoldersStore((s) => smartId ? s.folders.find((f) => f.id === smartId) : undefined)
  const isSmartMode = !!smartFolder
  const isVirtualMode = isRecentsMode || isSmartMode
  const { entries: dirEntries, loading, error, reload } = useDirectory(isVirtualMode ? '' : pane.path, showHidden)
  const [smartResults, setSmartResults] = useState<typeof dirEntries>([])
  const [smartLoading, setSmartLoading] = useState(false)
  useEffect(() => {
    if (!smartFolder) { setSmartResults([]); return }
    setSmartLoading(true)
    let cancelled = false
    window.fs.searchRecursive(smartFolder.scope, smartFolder.query, smartFolder.mode)
      .then((r) => { if (!cancelled) setSmartResults(r as typeof dirEntries) })
      .catch(() => { if (!cancelled) setSmartResults([]) })
      .finally(() => { if (!cancelled) setSmartLoading(false) })
    return () => { cancelled = true }
  }, [smartFolder?.id, smartFolder?.scope, smartFolder?.mode, smartFolder?.query])
  const entries = isRecentsMode
    ? recentEntries.map((r) => ({ name: r.name, path: r.path, isDirectory: false, size: 0, modified: r.openedAt, ext: r.ext }))
    : isSmartMode
    ? smartResults
    : dirEntries
  const { rename, paste, newFolder, newFile } = useFileOps(reload)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [pendingNew, setPendingNew] = useState<PendingNew | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const addRecentFolder = useRecentFoldersStore((s) => s.add)
  const gitStatus = useGitStatus(isVirtualMode ? '' : pane.path)

  const { query: searchQuery, mode: searchMode, results: searchResults, scope: searchScope, searching } = useSearchStore()
  const tagMap = useTagStore((s) => s.map)
  const isSearching = !!(searchQuery && searchMode && searchScope === pane.path) && !isVirtualMode

  const sorted = useMemo(() => {
    const list = isSearching ? searchResults : entries
    const base = sortEntries(list, pane.sortKey, pane.sortDir)
    if (pane.tagFilter) {
      const f = pane.tagFilter as TagColor
      return base.filter((e) => (tagMap[e.path] ?? EMPTY_TAGS).includes(f))
    }
    return base
  }, [entries, pane.sortKey, pane.sortDir, isSearching, searchResults, pane.tagFilter, tagMap])

  useEffect(() => {
    window.fs.homedir().then((home) => {
      if (pane.path === '/') navigateTo(paneId, home)
    })
  }, [])

  useEffect(() => { registerReload?.(reload) }, [reload])

  useEffect(() => {
    registerNewFolder?.(() => { setPendingNew({ type: 'folder' }) })
    registerNewFile?.(() => { setPendingNew({ type: 'file' }) })
  }, [])

  useEffect(() => {
    if (!isVirtualMode && pane.path) addRecentFolder(pane.path)
  }, [pane.path])

  useEffect(() => {
    function colCount() {
      if (viewMode !== 'icon') return 1
      const grid = scrollRef.current?.querySelector('.grid')
      if (!grid) return 1
      const items = grid.querySelectorAll<HTMLElement>(':scope > button, :scope > div')
      if (items.length < 2) return items.length || 1
      const firstTop = items[0].getBoundingClientRect().top
      let cols = 0
      for (const item of items) {
        if (item.getBoundingClientRect().top === firstTop) cols++
        else break
      }
      return Math.max(1, cols)
    }

    function selectIdx(idx: number) {
      const entry = sorted[idx]
      if (!entry) return
      setSelection(paneId, [entry.path], entry.path)
      if (!entry.isDirectory) {
        addRecent({ path: entry.path, name: entry.name, ext: entry.ext })
        onPreview(entry.path, entry.ext)
      } else {
        onClearPreview?.()
      }
    }

    function onKey(e: KeyboardEvent) {
      if (activePaneId !== paneId) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const cols = colCount()
      const anchor = pane.lastSelected ?? pane.selection[pane.selection.length - 1]
      const idx = anchor ? sorted.findIndex((en) => en.path === anchor) : -1

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (!sorted.length) return
        selectIdx(Math.max(0, idx < 0 ? 0 : idx - cols))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!sorted.length) return
        selectIdx(Math.min(sorted.length - 1, idx < 0 ? 0 : idx + cols))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (viewMode === 'icon') {
          if (!sorted.length) return
          selectIdx(Math.max(0, idx < 0 ? 0 : idx - 1))
        } else {
          navigateUp(paneId)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (viewMode === 'icon') {
          if (!sorted.length) return
          selectIdx(Math.min(sorted.length - 1, idx < 0 ? 0 : idx + 1))
        } else if (pane.selection.length === 1) {
          const entry = sorted.find((en) => en.path === pane.selection[0])
          if (entry?.isDirectory) navigateTo(paneId, entry.path)
        }
      } else if (e.key === 'Enter' && pane.selection.length === 1) {
        e.preventDefault()
        const entry = sorted.find((en) => en.path === pane.selection[0])
        if (entry) handleOpen(entry)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activePaneId, paneId, sorted, pane.selection, pane.lastSelected, viewMode])

  async function commitPending(name: string) {
    if (!pendingNew) return
    setPendingNew(null)
    try {
      if (pendingNew.type === 'folder') await newFolder(pane.path, name)
      else await newFile(pane.path, name)
    } catch (e) {
      alert(String(e))
    }
  }

  function handleSelect(path: string, mods: { meta: boolean; shift: boolean }) {
    setActivePaneId(paneId)

    if (mods.shift && pane.lastSelected) {
      const idxA = sorted.findIndex((e) => e.path === pane.lastSelected)
      const idxB = sorted.findIndex((e) => e.path === path)
      if (idxA >= 0 && idxB >= 0) {
        const [start, end] = idxA < idxB ? [idxA, idxB] : [idxB, idxA]
        const range = sorted.slice(start, end + 1).map((e) => e.path)
        setSelection(paneId, range, pane.lastSelected)
        return
      }
    }

    if (mods.meta) {
      const cur = pane.selection
      const next = cur.includes(path) ? cur.filter((p) => p !== path) : [...cur, path]
      setSelection(paneId, next, path)
    } else {
      setSelection(paneId, [path], path)
      const entry = sorted.find((e) => e.path === path)
      if (entry && !entry.isDirectory) {
        addRecent({ path: entry.path, name: entry.name, ext: entry.ext })
        onPreview(entry.path, entry.ext)
      } else {
        onClearPreview?.()
      }
    }
  }

  function handleOpen(entry: { path: string; name: string; isDirectory: boolean; ext: string }) {
    if (entry.isDirectory) {
      onClearPreview?.()
      navigateTo(paneId, entry.path)
    } else {
      addRecent({ path: entry.path, name: entry.name, ext: entry.ext })
      window.fs.open(entry.path)
    }
  }

  async function handleRename(entry: { path: string; name: string }, newName: string) {
    try { await rename(entry.path, newName) } catch (e) { alert(String(e)) }
  }

  function clearSelection() { setSelection(paneId, []); onClearPreview?.() }

  function handleDragStartItem(entry: { path: string }, e: React.DragEvent) {
    const paths = pane.selection.includes(entry.path) && pane.selection.length > 0
      ? pane.selection
      : [entry.path]
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-novafinder-paths', JSON.stringify(paths))
  }

  async function handleDropOnFolder(folderPath: string, sources: string[]) {
    const pairs: { src: string; dst: string }[] = []
    for (const src of sources) {
      if (src === folderPath) continue
      const name = src.split('/').pop() ?? ''
      const dst = `${folderPath}/${name}`
      if (src === dst) continue
      try {
        await window.fs.move(src, dst)
        pairs.push({ src, dst })
      } catch (err) {
        alert(`Move failed: ${err}`)
      }
    }
    if (pairs.length) useHistoryStore.getState().push({ kind: 'move', pairs })
    reload()
  }

  const fileMenu = useFileMenu({
    paneId,
    paneRef,
    reload,
    onRequestRename: (p) => setRenamingPath(p),
    onRequestNew: (type) => setPendingNew({ type }),
  })

  function handleContextMenu(e: React.MouseEvent, path: string) {
    const entry = sorted.find((x) => x.path === path)
    if (!entry) return
    fileMenu.openMenu(e, entry)
  }

  function handleBgContextMenu(e: React.MouseEvent) {
    fileMenu.openBgMenu(e, pane.path)
  }

  if (viewMode === 'column' && !isVirtualMode) {
    return (
      <ColumnView
        paneId={paneId}
        onPreview={onPreview}
        onClearPreview={onClearPreview}
      />
    )
  }

  return (
    <div
      ref={paneRef}
      className="flex flex-col h-full overflow-hidden bg-background/40"
      onClick={() => setActivePaneId(paneId)}
      onContextMenu={handleBgContextMenu}
    >
      {viewMode === 'list' && (
        <HeaderRow sortKey={pane.sortKey} sortDir={pane.sortDir} onSort={(k) => setSort(paneId, k)} />
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
        onClick={(e) => { if (e.target === e.currentTarget) clearSelection() }}
      >
        {(loading || smartLoading) && !isSearching && <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Loading…</div>}
        {isSearching && searching && <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Searching…</div>}
        {error && !isSearching && <PermissionError error={error} path={pane.path} onRetry={() => reload()} />}
        {!loading && !error && !searching && sorted.length === 0 && !pendingNew && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            {isSearching ? `No results for "${searchQuery}"` : 'Empty folder'}
          </div>
        )}

        {viewMode === 'list' && (
          <>
            {pendingNew && (
              <PendingRow
                type={pendingNew.type}
                onCommit={commitPending}
                onCancel={() => setPendingNew(null)}
              />
            )}
            {!loading && !error && sorted.map((entry) => (
              <FileRow
                key={entry.path}
                entry={entry}
                selected={pane.selection.includes(entry.path)}
                onSelect={handleSelect}
                onOpen={handleOpen}
                onRename={handleRename}
                onContextMenu={handleContextMenu}
                startInEdit={renamingPath === entry.path}
                onEditDone={() => setRenamingPath(null)}
                gitStatus={gitStatus[entry.name]}
                onDragStartItem={handleDragStartItem}
                onDropOnFolder={handleDropOnFolder}
              />
            ))}
          </>
        )}

        {viewMode === 'gallery' && !loading && !error && (
          <GalleryView
            entries={sorted}
            selection={pane.selection}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
          />
        )}

        {(viewMode === 'icon' || (viewMode === 'column' && isVirtualMode)) && !loading && !error && (
          <FileGrid
            entries={sorted}
            selection={pane.selection}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onRename={handleRename}
            onContextMenu={handleContextMenu}
            renamingPath={renamingPath}
            onEditDone={() => setRenamingPath(null)}
            pendingNew={pendingNew}
            onPendingCommit={commitPending}
            onPendingCancel={() => setPendingNew(null)}
            gitStatusMap={gitStatus}
            onDragStartItem={handleDragStartItem}
            onDropOnFolder={handleDropOnFolder}
          />
        )}
      </div>

      {fileMenu.element}
    </div>
  )
}

/* ── Pending new item row (list view) ── */

function PendingRow({ type, onCommit, onCancel }: { type: 'folder' | 'file'; onCommit: (name: string) => void; onCancel: () => void }) {
  const defaultName = type === 'folder' ? 'untitled folder' : 'untitled.txt'
  const [name, setName] = useState(defaultName)

  function commit() {
    const n = name.trim()
    if (n) onCommit(n)
    else onCancel()
  }

  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_170px_100px_100px] items-center gap-2 px-3 py-1.5 row-active select-none text-[13px]">
      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7">
        <FileIcon ext={type === 'file' ? 'txt' : ''} isDirectory={type === 'folder'} size={22} />
      </span>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.target.select()}
        className="bg-surface-1 rounded px-1 text-[13px] text-foreground outline-none border border-primary/60 w-full"
      />
      <span className="text-xs text-muted-foreground tabular-nums">—</span>
      <span className="text-xs text-muted-foreground text-right tabular-nums">—</span>
      <span className="text-xs text-muted-foreground">{type === 'folder' ? 'Folder' : 'Document'}</span>
    </div>
  )
}

function HeaderRow({
  sortKey, sortDir, onSort,
}: { sortKey: SortKey; sortDir: 'asc' | 'desc'; onSort: (k: SortKey) => void }) {
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_170px_100px_100px] items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-surface-1/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-shrink-0">
      <span />
      <HeaderCell active={sortKey === 'name'} onClick={() => onSort('name')}>Name{arrow('name')}</HeaderCell>
      <HeaderCell active={sortKey === 'modified'} onClick={() => onSort('modified')}>Modified{arrow('modified')}</HeaderCell>
      <HeaderCell align="right" active={sortKey === 'size'} onClick={() => onSort('size')}>Size{arrow('size')}</HeaderCell>
      <HeaderCell active={sortKey === 'kind'} onClick={() => onSort('kind')}>Kind{arrow('kind')}</HeaderCell>
    </div>
  )
}

function HeaderCell({
  children, active, onClick, align = 'left',
}: { children: React.ReactNode; active?: boolean; onClick: () => void; align?: 'left' | 'right' }) {
  return (
    <button
      onClick={onClick}
      className={[
        'truncate hover:text-foreground transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
        active ? 'text-foreground' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function PermissionError({ error, path, onRetry }: { error: string; path: string; onRetry: () => void }) {
  const isPermission = error.includes('PERMISSION_DENIED') || error.includes('EPERM') || error.includes('EACCES')

  if (!isPermission) {
    return <div className="flex items-center justify-center h-20 text-destructive text-sm px-4 text-center">{error}</div>
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-md mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 ring-1 ring-border mb-4 text-2xl">🔒</div>
      <div className="text-foreground font-medium mb-2">Permission Required</div>
      <div className="text-muted-foreground text-[13px] leading-relaxed mb-4">
        macOS restricts access to <code className="bg-surface-2 px-1 rounded text-foreground">{path}</code>.
        Grant <b>Full Disk Access</b> to Electron in System Settings, then restart the app.
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => window.fs.openPrivacySettings()}
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-primary to-[hsl(232_90%_65%)] text-white text-[13px] hover:brightness-110 transition shadow-sm"
        >
          Open Privacy Settings
        </button>
        <button
          onClick={onRetry}
          className="px-4 py-1.5 rounded-lg bg-surface-2 border border-border/60 text-foreground text-[13px] hover:bg-surface-3 transition"
        >
          Retry
        </button>
      </div>
      <div className="mt-6 text-[11px] text-muted-foreground">
        In <b>Privacy & Security → Full Disk Access</b>, click +, then add<br />
        <code className="bg-surface-2 px-1 rounded mt-1 inline-block break-all">
          node_modules/electron/dist/Electron.app
        </code>
      </div>
    </div>
  )
}
