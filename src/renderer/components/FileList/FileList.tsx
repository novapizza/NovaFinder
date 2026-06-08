import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
import { useTagStore, type TagColor, EMPTY_TAGS, parseTagColor } from '../../store/tagStore'
import { useRecentsStore, RECENTS_PATH } from '../../store/recentsStore'
import { useRecentFoldersStore } from '../../store/recentFoldersStore'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useSettingsStore, listGridTemplate, LIST_COL_MIN, LIST_COL_MAX, LIST_COL_GAP } from '../../store/settingsStore'
import { FileIcon } from '../FileIcon'

type Props = {
  paneId: 'left' | 'right'
  onPreview: (path: string, ext: string) => void
  onClearPreview?: () => void
  registerReload?: (fn: () => void) => void
  registerNewFolder?: (fn: () => void) => void
  registerNewFile?: (fn: () => void) => void
  registerStartRename?: (fn: () => void) => void
}

type PendingNew = { type: 'folder' | 'file' }

export function FileList({ paneId, onPreview, onClearPreview, registerReload, registerNewFolder, registerNewFile, registerStartRename }: Props) {
  const { panes, activePaneId, showHidden, viewMode, setActivePaneId, navigateTo, navigateUp, setSelection, setSort } = usePaneStore()
  const pane = panes[paneId]
  const addRecent = useRecentsStore((s) => s.add)
  const recentEntries = useRecentsStore((s) => s.recents)
  const isRecentsMode = pane.path === RECENTS_PATH
  const smartId = parseSmartFolderId(pane.path)
  const smartFolder = useSmartFoldersStore((s) => smartId ? s.folders.find((f) => f.id === smartId) : undefined)
  const isSmartMode = !!smartFolder
  const tagColor = parseTagColor(pane.path)
  const isTagMode = !!tagColor
  const isVirtualMode = isRecentsMode || isSmartMode || isTagMode
  const { entries: dirEntries, loading, error, reload } = useDirectory(isVirtualMode ? '' : pane.path, showHidden)
  const [smartResults, setSmartResults] = useState<typeof dirEntries>([])
  const [smartLoading, setSmartLoading] = useState(false)
  // Bumped after destructive ops (delete, move, rename, …) so that virtual
  // views — smart folders, tags, search — re-run their query. The plain
  // useDirectory reload doesn't help in those modes because dirPath is ''.
  const [virtualRefreshTick, setVirtualRefreshTick] = useState(0)
  useEffect(() => {
    if (!smartFolder) { setSmartResults([]); return }
    setSmartLoading(true)
    let cancelled = false
    window.fs.searchRecursive(smartFolder.scope, smartFolder.query, smartFolder.mode)
      .then((r) => { if (!cancelled) setSmartResults(r as typeof dirEntries) })
      .catch(() => { if (!cancelled) setSmartResults([]) })
      .finally(() => { if (!cancelled) setSmartLoading(false) })
    return () => { cancelled = true }
  }, [smartFolder?.id, smartFolder?.scope, smartFolder?.mode, smartFolder?.query, virtualRefreshTick])

  // Tag virtual mode: collect every path in tagStore.map tagged with this color,
  // stat them in batch, and present like a directory listing (Finder-style).
  const tagMapForList = useTagStore((s) => s.map)
  const [tagResults, setTagResults] = useState<typeof dirEntries>([])
  const [tagLoading, setTagLoading] = useState(false)
  useEffect(() => {
    if (!tagColor) { setTagResults([]); return }
    const paths = Object.entries(tagMapForList)
      .filter(([, colors]) => colors.includes(tagColor))
      .map(([p]) => p)
    if (paths.length === 0) { setTagResults([]); return }
    setTagLoading(true)
    let cancelled = false
    window.fs.statBatch(paths)
      .then((r) => { if (!cancelled) setTagResults(r as typeof dirEntries) })
      .catch(() => { if (!cancelled) setTagResults([]) })
      .finally(() => { if (!cancelled) setTagLoading(false) })
    return () => { cancelled = true }
  }, [tagColor, tagMapForList, virtualRefreshTick])

  const entries = isRecentsMode
    ? recentEntries.map((r) => ({ name: r.name, path: r.path, isDirectory: false, size: 0, modified: r.openedAt, ext: r.ext }))
    : isSmartMode
    ? smartResults
    : isTagMode
    ? tagResults
    : dirEntries
  // Mode-aware reload. For virtual views (smart folder / tag / search)
  // we prefer optimistic client-side filtering when the caller can tell us
  // which paths were removed — re-running the underlying query races with
  // the OS-level trash and can briefly return empty.
  function reloadAll(removedPaths?: string[]) {
    if (removedPaths && removedPaths.length > 0) {
      const removed = new Set(removedPaths)
      if (isSmartMode) {
        setSmartResults((prev) => prev.filter((e) => !removed.has(e.path)))
        return
      }
      if (isTagMode) {
        setTagResults((prev) => prev.filter((e) => !removed.has(e.path)))
        return
      }
      const s = useSearchStore.getState()
      const activeSearch = !!(s.query && s.mode && s.scope === pane.path) && !isVirtualMode
      if (activeSearch) {
        s.setResults(pane.path, s.results.filter((e) => !removed.has(e.path)))
        return
      }
      // Real folder view — the file watcher will refresh, but call reload
      // explicitly to keep it snappy.
      reload()
      return
    }
    // No specific paths — full refresh (toolbar Refresh / ⌘R).
    if (isSmartMode || isTagMode) {
      setVirtualRefreshTick((n) => n + 1)
      return
    }
    reload()
  }
  const { rename, paste, newFolder, newFile } = useFileOps(reloadAll)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [pendingNew, setPendingNew] = useState<PendingNew | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const typeBufferRef = useRef<{ buf: string; at: number }>({ buf: '', at: 0 })
  // Always points at the latest file-menu API so the keyboard effect (defined
  // above the menu) can summon it without a stale closure.
  const fileMenuRef = useRef<ReturnType<typeof useFileMenu> | null>(null)
  const addRecentFolder = useRecentFoldersStore((s) => s.add)
  const gitStatus = useGitStatus(isVirtualMode ? '' : pane.path)

  const { query: searchQuery, mode: searchMode, results: searchResults, scope: searchScope, searching } = useSearchStore()
  const tagMap = useTagStore((s) => s.map)
  const foldersFirst = useSettingsStore((s) => s.windowsStyleSort)
  const colWidths = useSettingsStore((s) => s.listColumnWidths)
  const setSetting = useSettingsStore((s) => s.set)
  const gridTemplate = listGridTemplate(colWidths)
  const isSearching = !!(searchQuery && searchMode && searchScope === pane.path) && !isVirtualMode

  const sorted = useMemo(() => {
    const list = isSearching ? searchResults : entries
    const base = sortEntries(list, pane.sortKey, pane.sortDir, { foldersFirst })
    if (pane.tagFilter) {
      const f = pane.tagFilter as TagColor
      return base.filter((e) => (tagMap[e.path] ?? EMPTY_TAGS).includes(f))
    }
    return base
  }, [entries, pane.sortKey, pane.sortDir, isSearching, searchResults, pane.tagFilter, tagMap, foldersFirst])

  useEffect(() => {
    // Match Finder's factory default: open Recents on first launch.
    // If Recents is empty (brand-new install), fall back to ~/Downloads
    // so the user sees real files instead of a blank screen. Only
    // redirects from the bootstrap path '/' so navigated tabs aren't
    // yanked back on every render.
    if (pane.path !== '/') return
    if (recentEntries.length > 0) {
      navigateTo(paneId, RECENTS_PATH)
    } else {
      window.fs.specialPaths().then((sp) => {
        navigateTo(paneId, sp.downloads || sp.home)
      })
    }
  }, [])

  useEffect(() => { registerReload?.(reloadAll) }, [reload, isSmartMode, isTagMode, pane.path])

  useEffect(() => {
    registerNewFolder?.(() => { setPendingNew({ type: 'folder' }) })
    registerNewFile?.(() => { setPendingNew({ type: 'file' }) })
    registerStartRename?.(() => {
      const sel = usePaneStore.getState().panes[paneId].selection
      if (sel.length) setRenamingPath(sel[sel.length - 1])
    })
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
      } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
        // Summon the context menu without a mouse: at the focused row if one
        // is selected, otherwise the background menu anchored to the pane.
        e.preventDefault()
        const selPath = pane.selection[pane.selection.length - 1]
        const entry = selPath ? sorted.find((en) => en.path === selPath) : undefined
        if (entry) {
          const el = scrollRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(entry.path)}"]`)
          const r = el?.getBoundingClientRect()
          fileMenuRef.current?.openMenuAt(r ? r.left + 12 : 80, r ? r.bottom - 4 : 80, entry)
        } else {
          const r = paneRef.current?.getBoundingClientRect()
          fileMenuRef.current?.openBgMenuAt((r?.left ?? 60) + 24, (r?.top ?? 60) + 60, pane.path)
        }
      } else if (/^[A-Za-z0-9]$/.test(e.key) && !e.repeat) {
        // Finder-style type-ahead: jump to first entry whose name starts
        // with the accumulated buffer. Buffer resets after 600ms idle.
        e.preventDefault()
        const now = Date.now()
        const prev = typeBufferRef.current
        const fresh = now - prev.at > 600
        const buf = (fresh ? '' : prev.buf) + e.key.toLowerCase()
        typeBufferRef.current = { buf, at: now }
        const match = sorted.findIndex((en) => en.name.toLowerCase().startsWith(buf))
        if (match >= 0) selectIdx(match)
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
        // Don't re-record on selection while viewing Recents — bumping
        // openedAt would re-sort the just-clicked file to the front and make
        // it jump under the cursor. Opening (handleOpen) still records it.
        if (!isRecentsMode) addRecent({ path: entry.path, name: entry.name, ext: entry.ext })
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
    // Cancel the HTML5 drag entirely. Running an HTML5 drag and a native
    // startDrag at the same time spins up two nested run loops on macOS
    // that deadlock each other, hanging the whole app. We rely solely on
    // the native drag below: it can drop into Finder, Mail, Slack, VS
    // Code, etc., AND still fires dragover/drop (with the "Files" type)
    // for our own folder dropzones, so in-app moves keep working.
    e.preventDefault()
    // Fire-and-forget: the IPC roundtrip is non-blocking from our side.
    // macOS re-initiates the drag from the current mouse state.
    window.fs.startDrag(paths).catch(() => {
      // startDrag failed (icon/permission issue) — nothing to drag.
    })
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
    reloadAll()
  }

  const fileMenu = useFileMenu({
    paneId,
    paneRef,
    reload: reloadAll,
    onRequestRename: (p) => setRenamingPath(p),
    onRequestNew: (type) => setPendingNew({ type }),
  })
  fileMenuRef.current = fileMenu

  function handleContextMenu(e: React.MouseEvent, path: string) {
    const entry = sorted.find((x) => x.path === path)
    if (!entry) return
    fileMenu.openMenu(e, entry)
  }

  function handleBgContextMenu(e: React.MouseEvent) {
    fileMenu.openBgMenu(e, pane.path)
  }

  // Marquee (rubber-band) selection. Starts on empty area of the scroll
  // container; items with [data-path] whose bounding rect intersects the
  // marquee become selected. Cmd/Ctrl/Shift-drag is additive.
  const [marquee, setMarquee] = useState<null | { x1: number; y1: number; x2: number; y2: number }>(null)
  const suppressNextClickRef = useRef(false)

  function handleScrollMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    const container = scrollRef.current
    if (!container) return
    // Start only on empty space: bail if any ancestor between the click
    // target and the scroll container has a [data-path] — that means we
    // clicked on a file/folder item, not background.
    let el: HTMLElement | null = e.target as HTMLElement
    while (el && el !== container) {
      if (el.hasAttribute('data-path')) return
      el = el.parentElement
    }

    const startX = e.clientX
    const startY = e.clientY
    let moved = false
    const additive = e.metaKey || e.ctrlKey || e.shiftKey
    const base = additive ? [...pane.selection] : []
    setActivePaneId(paneId)

    function onMove(ev: MouseEvent) {
      if (!moved) {
        if (Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return
        moved = true
      }
      const x = ev.clientX
      const y = ev.clientY
      setMarquee({ x1: startX, y1: startY, x2: x, y2: y })
      const minX = Math.min(startX, x)
      const maxX = Math.max(startX, x)
      const minY = Math.min(startY, y)
      const maxY = Math.max(startY, y)
      const items = container!.querySelectorAll<HTMLElement>('[data-path]')
      const hit: string[] = []
      items.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.right < minX || r.left > maxX || r.bottom < minY || r.top > maxY) return
        const p = el.getAttribute('data-path')
        if (p) hit.push(p)
      })
      const next = additive ? Array.from(new Set([...base, ...hit])) : hit
      setSelection(paneId, next, next[next.length - 1] ?? null)
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setMarquee(null)
      if (moved) suppressNextClickRef.current = true
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Row virtualization for list view. Without this, mounting 1000+
  // FileRow components on first paint takes 500ms–1s. The virtualizer
  // only renders rows in the viewport (+ a small overscan buffer), so
  // a 10k-entry folder renders in the same time as a 50-entry one.
  const ROW_HEIGHT = 34
  const VIRT_THRESHOLD = 80 // skip virtualization for small lists
  const useVirt = viewMode === 'list' && sorted.length > VIRT_THRESHOLD
  const rowVirtualizer = useVirtualizer({
    count: useVirt ? sorted.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

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
      <div
        ref={scrollRef}
        // Resize is clamped to keep totals within the pane, so list view
        // doesn't need horizontal scroll. overflow-x-hidden also stops
        // any transient overflow during ResizeObserver-driven width
        // updates from flashing a scrollbar.
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
        onMouseDown={handleScrollMouseDown}
        onClick={(e) => {
          if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return }
          // Empty-space click — only clear if click didn't land on a file item
          let el: HTMLElement | null = e.target as HTMLElement
          while (el && el !== e.currentTarget) {
            if (el.hasAttribute('data-path')) return
            el = el.parentElement
          }
          clearSelection()
        }}
      >
        {(loading || smartLoading || tagLoading) && !isSearching && sorted.length === 0 && !pendingNew && <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Loading…</div>}
        {isSearching && searching && <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Searching…</div>}
        {error && !isSearching && <PermissionError error={error} path={pane.path} onRetry={() => reload()} />}
        {!loading && !error && !searching && sorted.length === 0 && !pendingNew && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            {isSearching ? `No results for "${searchQuery}"` : 'Empty folder'}
          </div>
        )}

        {viewMode === 'list' && (
          // Wrapper fills the scroll viewport. Resize is clamped so the
          // total column width never exceeds the viewport, which means we
          // don't need w-max here — the trailing 1fr column absorbs any
          // leftover space when the user shrinks columns.
          <div className="min-w-full">
            <HeaderRow
              sortKey={pane.sortKey}
              sortDir={pane.sortDir}
              onSort={(k) => setSort(paneId, k)}
              widths={colWidths}
              gridTemplate={gridTemplate}
              onResize={(w) => setSetting('listColumnWidths', w)}
              scrollContainerRef={scrollRef}
            />
            {pendingNew && (
              <PendingRow
                type={pendingNew.type}
                onCommit={commitPending}
                onCancel={() => setPendingNew(null)}
                gridTemplate={gridTemplate}
              />
            )}
            {!error && !useVirt && sorted.map((entry) => (
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
                gridTemplate={gridTemplate}
              />
            ))}
            {!error && useVirt && (
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: 'relative',
                  width: '100%',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((vi) => {
                  const entry = sorted[vi.index]
                  return (
                    <div
                      key={entry.path}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: vi.size,
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <FileRow
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
                        gridTemplate={gridTemplate}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {viewMode === 'gallery' && !error && (
          <GalleryView
            entries={sorted}
            selection={pane.selection}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
          />
        )}

        {(viewMode === 'icon' || (viewMode === 'column' && isVirtualMode)) && !error && (
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

      {marquee && (
        <div
          className="pointer-events-none fixed z-50 border border-primary/70 bg-primary/15"
          style={{
            left: Math.min(marquee.x1, marquee.x2),
            top: Math.min(marquee.y1, marquee.y2),
            width: Math.abs(marquee.x2 - marquee.x1),
            height: Math.abs(marquee.y2 - marquee.y1),
          }}
        />
      )}
    </div>
  )
}

/* ── Pending new item row (list view) ── */

function PendingRow({ type, onCommit, onCancel, gridTemplate }: { type: 'folder' | 'file'; onCommit: (name: string) => void; onCancel: () => void; gridTemplate: string }) {
  const defaultName = type === 'folder' ? 'untitled folder' : 'untitled.txt'
  const [name, setName] = useState(defaultName)

  function commit() {
    const n = name.trim()
    if (n) onCommit(n)
    else onCancel()
  }

  return (
    <div
      className="grid items-center gap-2 px-3 py-1.5 row-active select-none text-[13px]"
      style={{ gridTemplateColumns: gridTemplate }}
    >
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
      <span className="pl-2 text-xs text-muted-foreground tabular-nums">—</span>
      <span className="pl-2 text-xs text-muted-foreground">{type === 'folder' ? 'Folder' : 'Document'}</span>
      <span className="pl-2 pr-2 text-xs text-muted-foreground text-right tabular-nums">—</span>
      <span />
    </div>
  )
}

type Widths = { name: number; modified: number; size: number; kind: number }
type ColKey = keyof Widths

function clamp(v: number) {
  return Math.min(LIST_COL_MAX, Math.max(LIST_COL_MIN, v))
}

function HeaderRow({
  sortKey, sortDir, onSort, widths, gridTemplate, onResize, scrollContainerRef,
}: {
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  widths: Widths
  gridTemplate: string
  onResize: (w: Widths) => void
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}) {
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  // Every column is fixed-width now. Each handle sits in the gap on the
  // right edge of its column. Dragging the handle right grows that
  // column; columns to the right shift along with it. When the total
  // exceeds the pane width, the wrapper's horizontal scroll absorbs it.
  const PX = 12
  const ICON = 32
  const G = LIST_COL_GAP
  const HALF = G / 2
  const leftOf = (col: ColKey): number => {
    // Distance from the row's left edge to the *gap center* immediately
    // after `col`. Must mirror the column order in listGridTemplate.
    const order: ColKey[] = ['name', 'modified', 'kind', 'size']
    let x = PX + ICON + G
    for (const c of order) {
      x += widths[c]
      if (c === col) return x + HALF
      x += G
    }
    return x
  }

  function startResize(col: ColKey, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const start = widths
    const startW = start[col]
    // The other columns stay fixed during this drag, so we can compute
    // the upper bound once: whatever's left over in the pane after the
    // overhead (icon col + horizontal padding + 4 inter-col gaps) and
    // the other three column widths is the most this one can grow to.
    const overhead = 2 * PX + ICON + 4 * G
    const container = scrollContainerRef.current?.clientWidth ?? Number.POSITIVE_INFINITY
    const otherCols = (['name', 'modified', 'size', 'kind'] as ColKey[])
      .filter((c) => c !== col)
      .reduce((s, c) => s + start[c], 0)
    const maxByContainer = Math.max(LIST_COL_MIN, container - overhead - otherCols)
    const upper = Math.min(LIST_COL_MAX, maxByContainer)
    function onMove(ev: MouseEvent) {
      const target = startW + (ev.clientX - startX)
      const next = Math.min(upper, Math.max(LIST_COL_MIN, target))
      onResize({ ...start, [col]: next })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const cols: ColKey[] = ['name', 'modified', 'kind', 'size']

  return (
    <div className="relative sticky top-0 z-10 bg-surface-1">
      <div
        className="grid items-center gap-2 px-3 py-1.5 border-b border-border/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span />
        <HeaderCell active={sortKey === 'name'} onClick={() => onSort('name')}>Name{arrow('name')}</HeaderCell>
        <HeaderCell indent active={sortKey === 'modified'} onClick={() => onSort('modified')}>Modified{arrow('modified')}</HeaderCell>
        <HeaderCell indent active={sortKey === 'kind'} onClick={() => onSort('kind')}>Kind{arrow('kind')}</HeaderCell>
        <HeaderCell indent active={sortKey === 'size'} onClick={() => onSort('size')}>Size{arrow('size')}</HeaderCell>
        <span />
      </div>
      {cols.map((col) => (
        <span
          key={col}
          onMouseDown={(e) => startResize(col, e)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          title={`Drag to resize ${col}`}
          className="group absolute top-1 bottom-1 w-2 -ml-1 cursor-col-resize z-20 flex justify-center"
          style={{ left: leftOf(col) - 1 }}
        >
          {/* Always-visible divider. Uses foreground at low opacity so it
              picks up contrast from whichever theme is active (a darker
              tint on light backgrounds, a lighter tint on dark). */}
          <span className="w-px h-full bg-foreground/25 dark:bg-foreground/35 group-hover:bg-primary group-hover:w-0.5 transition-all" />
        </span>
      ))}
    </div>
  )
}

function HeaderCell({
  children, active, onClick, indent = false,
}: { children: React.ReactNode; active?: boolean; onClick: () => void; indent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        'truncate text-left hover:text-foreground transition-colors',
        // Pull the label off the separator line so the column boundary
        // is visible at a glance. The icon column already creates
        // breathing room for Name, so it opts out.
        indent ? 'pl-2' : '',
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
          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-primary/70 to-primary/40 text-white text-[13px] hover:brightness-110 transition shadow-sm"
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
