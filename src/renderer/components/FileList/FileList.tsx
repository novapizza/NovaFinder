import { useEffect, useMemo, useState } from 'react'
import { usePaneStore, type SortKey } from '../../store/paneStore'
import { useDirectory } from './useDirectory'
import { FileRow } from './FileRow'
import { FileGrid } from './FileGrid'
import { ColumnView } from './ColumnView'
import { useFileOps } from '../../hooks/useFileOps'
import { sortEntries } from '../../lib/sort'
import { ContextMenu, type MenuItem } from '../ContextMenu'
import { GetInfoModal } from '../GetInfoModal'
import { useClipboardStore } from '../../store/clipboardStore'
import { useSearchStore } from '../../store/searchStore'
import { useTagStore, type TagColor, EMPTY_TAGS } from '../../store/tagStore'
import { useRecentsStore, RECENTS_PATH } from '../../store/recentsStore'
import { useRecentFoldersStore } from '../../store/recentFoldersStore'
import { usePinnedStore } from '../../store/pinnedStore'
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
  const { panes, activePaneId, showHidden, viewMode, setActivePaneId, navigateTo, setSelection, setSort } = usePaneStore()
  const pane = panes[paneId]
  const addRecent = useRecentsStore((s) => s.add)
  const recentEntries = useRecentsStore((s) => s.recents)
  const isRecentsMode = pane.path === RECENTS_PATH
  const { entries: dirEntries, loading, error, reload } = useDirectory(isRecentsMode ? '' : pane.path, showHidden)
  const entries = isRecentsMode
    ? recentEntries.map((r) => ({ name: r.name, path: r.path, isDirectory: false, size: 0, modified: r.openedAt, ext: r.ext }))
    : dirEntries
  const { rename, deleteFiles, paste, cut, copy, duplicate, copyPath, newFolder, newFile } = useFileOps()
  const clipboard = useClipboardStore()
  const [menu, setMenu] = useState<{ x: number; y: number; path: string } | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [infoPath, setInfoPath] = useState<string | null>(null)
  const [pendingNew, setPendingNew] = useState<PendingNew | null>(null)
  const addRecentFolder = useRecentFoldersStore((s) => s.add)
  const { add: pinFolder } = usePinnedStore()
  const gitStatus = useGitStatus(isRecentsMode ? '' : pane.path)

  const { query: searchQuery, mode: searchMode, results: searchResults, scope: searchScope, searching } = useSearchStore()
  const toggleTag = useTagStore((s) => s.toggle)
  const getTags = useTagStore((s) => s.get)
  const tagMap = useTagStore((s) => s.map)
  const isSearching = !!(searchQuery && searchMode && searchScope === pane.path)

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
    if (!isRecentsMode && pane.path) addRecentFolder(pane.path)
  }, [pane.path])

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

  function handleContextMenu(e: React.MouseEvent, path: string) {
    if (!pane.selection.includes(path)) setSelection(paneId, [path], path)
    setMenu({ x: e.clientX, y: e.clientY, path })
  }

  function handleBgContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    clearSelection()
    setMenu({ x: e.clientX, y: e.clientY, path: pane.path })
  }

  const menuTargets = pane.selection.length > 0 ? pane.selection : (menu ? [menu.path] : [])
  const hasClipboard = clipboard.files.length > 0 && clipboard.operation !== null

  function firstName(): string {
    if (!menuTargets.length) return ''
    return menuTargets[0].split('/').pop() || ''
  }
  const countLabel = menuTargets.length > 1 ? `${menuTargets.length} items` : `"${firstName()}"`

  const targetEntry = sorted.find((e) => e.path === menuTargets[0])
  const targetIsDir = targetEntry?.isDirectory ?? false
  const targetIsZip = targetEntry?.ext === 'zip'

  const menuItems: MenuItem[] = !menu ? [] :
    menu.path === pane.path && pane.selection.length === 0
      ? [
          { label: 'New Folder', icon: 'new-folder', action: () => { setMenu(null); setPendingNew({ type: 'folder' }) } },
          { label: 'New File',   icon: 'new-file',   action: () => { setMenu(null); setPendingNew({ type: 'file' }) } },
          { separator: true },
          { label: 'Paste', icon: 'paste', action: () => paste(pane.path), disabled: !hasClipboard },
          { separator: true },
          { label: 'Open in Terminal', icon: 'open', action: () => window.fs.openInTerminal(pane.path) },
          { separator: true },
          { label: 'Get Info', icon: 'info', action: () => setInfoPath(pane.path) },
          { label: 'Refresh',  icon: 'refresh', action: () => reload() },
        ]
      : [
          {
            label: 'Open',
            icon: 'open',
            action: () => {
              const f = sorted.find((e) => e.path === menuTargets[0])
              if (f) handleOpen(f)
            },
          },
          { label: 'Open with Default App', icon: 'open-default', action: () => window.fs.open(menuTargets[0]) },
          { label: 'Reveal in Finder', icon: 'reveal', action: () => window.fs.showItemInFolder(menuTargets[0]) },
          ...(targetIsDir ? [{ label: 'Open in Terminal', icon: 'open' as const, action: () => window.fs.openInTerminal(menuTargets[0]) }] : []),
          { label: 'Move to Trash', icon: 'trash', action: () => deleteFiles(menuTargets), danger: true },
          { separator: true },
          { label: `Compress ${countLabel}`, icon: 'duplicate', action: () => window.fs.zip(menuTargets).catch(() => {}) },
          ...(targetIsZip && menuTargets.length === 1 ? [{ label: 'Extract Here', icon: 'open' as const, action: () => window.fs.unzip(menuTargets[0]).catch(() => {}) }] : []),
          { separator: true },
          ...(targetIsDir && menuTargets.length === 1 ? [{ label: 'Pin to Sidebar', icon: 'copy-path' as const, action: () => pinFolder(menuTargets[0], menuTargets[0].split('/').pop() ?? menuTargets[0]) }] : []),
          { label: 'Get Info', icon: 'info', action: () => setInfoPath(menuTargets[0]) },
          { separator: true },
          { label: `Cut ${countLabel}`, icon: 'cut', action: () => cut(menuTargets) },
          { label: `Copy ${countLabel}`, icon: 'copy', action: () => copy(menuTargets) },
          { label: 'Paste', icon: 'paste', action: () => paste(pane.path), disabled: !hasClipboard },
          { separator: true },
          { label: 'Duplicate', icon: 'duplicate', action: () => duplicate(menuTargets) },
          { label: 'Copy Name', icon: 'copy-path', action: () => window.fs.writeClipboardText(menuTargets.map((p) => p.split('/').pop() ?? p).join('\n')) },
          { label: 'Copy Path', icon: 'copy-path', action: () => copyPath(menuTargets) },
          { separator: true },
          { label: 'Rename', icon: 'rename', action: () => setRenamingPath(menuTargets[0]), disabled: menuTargets.length !== 1 },
          { separator: true },
          {
            tagsRow: true,
            selectedColors: menuTargets.length === 1 ? getTags(menuTargets[0]) : [],
            onToggle: (color) => {
              for (const p of menuTargets) toggleTag(p, color as TagColor)
            },
          },
        ]

  const folderName = isRecentsMode ? 'Recents' : pane.path === '/' ? '/' : pane.path.split('/').filter(Boolean).pop() ?? pane.path

  if (viewMode === 'column') {
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
      className="flex flex-col h-full overflow-hidden bg-background/40"
      onClick={() => setActivePaneId(paneId)}
      onContextMenu={handleBgContextMenu}
    >
      {/* Pane header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-surface-1/30 px-3 py-2 flex-shrink-0">
        <span className="text-xs font-semibold text-foreground truncate">{folderName}</span>
        <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">{sorted.length} items</span>
      </div>

      {viewMode === 'list' && (
        <HeaderRow sortKey={pane.sortKey} sortDir={pane.sortDir} onSort={(k) => setSort(paneId, k)} />
      )}

      <div
        className="flex-1 overflow-y-auto scrollbar-thin"
        onClick={(e) => { if (e.target === e.currentTarget) clearSelection() }}
      >
        {loading && !isSearching && <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Loading…</div>}
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
              />
            ))}
          </>
        )}

        {viewMode === 'icon' && !loading && !error && (
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
          />
        )}
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}

      {infoPath && <GetInfoModal filePath={infoPath} onClose={() => setInfoPath(null)} />}
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
