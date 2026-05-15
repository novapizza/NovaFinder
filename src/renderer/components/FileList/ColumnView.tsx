import { useEffect, useMemo, useRef, useState } from 'react'
import { usePaneStore, type SortKey } from '../../store/paneStore'
import { useDirectory, type FileEntry } from './useDirectory'
import { FileIcon } from '../FileIcon'
import { useRecentsStore } from '../../store/recentsStore'
import { sortEntries } from '../../lib/sort'
import { useFileMenu } from '../../hooks/useFileMenu'

type Props = {
  paneId: 'left' | 'right'
  onPreview: (path: string, ext: string) => void
  onClearPreview?: () => void
}

export function ColumnView({ paneId, onPreview, onClearPreview }: Props) {
  const { panes, showHidden, navigateTo, setSelection, setActivePaneId } = usePaneStore()
  const pane = panes[paneId]
  const addRecent = useRecentsStore((s) => s.add)

  const [columns, setColumns] = useState<string[]>([pane.path])
  const [selectedPaths, setSelectedPaths] = useState<Record<number, string>>({})

  const selfNavigating = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((n) => n + 1)
  const fileMenu = useFileMenu({ paneId, paneRef, reload })

  useEffect(() => {
    if (selfNavigating.current) {
      selfNavigating.current = false
      return
    }
    setColumns([pane.path])
    setSelectedPaths({})
  }, [pane.path])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [columns.length])

  function handleSelect(colIndex: number, entry: FileEntry) {
    setActivePaneId(paneId)

    const newSelected = { ...selectedPaths }
    for (let i = colIndex + 1; i < columns.length; i++) delete newSelected[i]
    newSelected[colIndex] = entry.path

    if (entry.isDirectory) {
      setColumns([...columns.slice(0, colIndex + 1), entry.path])
      setSelectedPaths(newSelected)
      selfNavigating.current = true
      navigateTo(paneId, entry.path)
      setSelection(paneId, [entry.path])
      onClearPreview?.()
    } else {
      setColumns(columns.slice(0, colIndex + 1))
      setSelectedPaths(newSelected)
      addRecent({ path: entry.path, name: entry.name, ext: entry.ext })
      setSelection(paneId, [entry.path])
      onPreview(entry.path, entry.ext)
    }
  }

  function handleOpen(entry: FileEntry) {
    if (entry.isDirectory) {
      navigateTo(paneId, entry.path)
    } else {
      window.fs.open(entry.path)
    }
  }

  return (
    <div
      ref={paneRef}
      className="flex h-full bg-background/40 relative"
      onClick={() => setActivePaneId(paneId)}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) fileMenu.openBgMenu(e, pane.path)
      }}
    >
      <div ref={scrollRef} className="flex flex-1 overflow-x-auto overflow-y-hidden">
        {columns.map((colPath, i) => (
          <ColumnPanel
            key={`${i}-${colPath}-${reloadKey}`}
            path={colPath}
            showHidden={showHidden}
            selectedPath={selectedPaths[i] ?? null}
            sortKey={pane.sortKey}
            sortDir={pane.sortDir}
            isLast={i === columns.length - 1}
            onSelect={(entry) => handleSelect(i, entry)}
            onOpen={handleOpen}
            onContextMenu={(e, entry) => fileMenu.openMenu(e, entry)}
            onBgContextMenu={(e) => fileMenu.openBgMenu(e, colPath)}
          />
        ))}
        <div className="w-4 flex-shrink-0" />
      </div>
      {fileMenu.element}
    </div>
  )
}

/* ── Column panel ── */

type ColumnPanelProps = {
  path: string
  showHidden: boolean
  selectedPath: string | null
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  isLast: boolean
  onSelect: (entry: FileEntry) => void
  onOpen: (entry: FileEntry) => void
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void
  onBgContextMenu: (e: React.MouseEvent) => void
}

function ColumnPanel({ path, showHidden, selectedPath, sortKey, sortDir, onSelect, onOpen, onContextMenu, onBgContextMenu }: ColumnPanelProps) {
  const { entries, loading } = useDirectory(path, showHidden)

  const sorted = useMemo(
    () => sortEntries(entries, sortKey, sortDir),
    [entries, sortKey, sortDir],
  )

  return (
    <div className="w-[240px] flex-shrink-0 flex flex-col border-r border-border/50 h-full">
      <div
        className="flex-1 overflow-y-auto scrollbar-thin py-1"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => { if (e.target === e.currentTarget) onBgContextMenu(e) }}
      >
        {loading && (
          <div className="flex items-center justify-center h-12 text-muted-foreground text-xs">
            Loading…
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div
            className="flex items-center justify-center h-12 text-muted-foreground text-xs"
            onContextMenu={onBgContextMenu}
          >
            Empty folder
          </div>
        )}
        {sorted.map((entry) => (
          <ColumnRow
            key={entry.path}
            entry={entry}
            selected={selectedPath === entry.path}
            onClick={() => onSelect(entry)}
            onDoubleClick={() => onOpen(entry)}
            onContextMenu={(e) => onContextMenu(e, entry)}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Column row ── */

function ColumnRow({
  entry, selected, onClick, onDoubleClick, onContextMenu,
}: {
  entry: FileEntry
  selected: boolean
  onClick: () => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={[
        'flex items-center gap-3 px-3 py-[6px] cursor-default select-none text-[13px] mx-1 rounded-md',
        selected
          ? 'bg-gradient-to-r from-primary/70 to-primary/40 text-white'
          : 'text-foreground hover:bg-surface-2',
      ].join(' ')}
    >
      <span className="flex-shrink-0">
        <FileIcon ext={entry.ext} isDirectory={entry.isDirectory} size={41} />
      </span>
      <span className="flex-1 truncate">{entry.name}</span>
      {entry.isDirectory && (
        <svg
          className={['h-[14px] w-[14px] flex-shrink-0', selected ? 'opacity-80' : 'text-muted-foreground'].join(' ')}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </div>
  )
}
