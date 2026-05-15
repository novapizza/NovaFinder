import { useState } from 'react'
import { FileEntry } from './useDirectory'
import { isImageExt } from '../../lib/fileIcons'
import { novaFileUrl } from '../../lib/formatters'
import { useClipboardStore } from '../../store/clipboardStore'
import { FileIcon } from '../FileIcon'
import { TagDots } from '../TagDots'
import { useTagStore, EMPTY_TAGS } from '../../store/tagStore'

type PendingNew = { type: 'folder' | 'file' }

type Props = {
  entries: FileEntry[]
  selection: string[]
  onSelect: (path: string, mods: { meta: boolean; shift: boolean }) => void
  onOpen: (entry: FileEntry) => void
  onRename: (entry: FileEntry, newName: string) => void
  onContextMenu: (e: React.MouseEvent, path: string) => void
  renamingPath: string | null
  onEditDone: () => void
  pendingNew: PendingNew | null
  onPendingCommit: (name: string) => void
  onPendingCancel: () => void
  gitStatusMap?: Record<string, string>
  onDragStartItem?: (entry: FileEntry, e: React.DragEvent) => void
  onDropOnFolder?: (folderPath: string, sources: string[]) => void
}

export function FileGrid({ entries, selection, onSelect, onOpen, onRename, onContextMenu, renamingPath, onEditDone, pendingNew, onPendingCommit, onPendingCancel, gitStatusMap, onDragStartItem, onDropOnFolder }: Props) {
  return (
    <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))' }}>
      {pendingNew && (
        <PendingTile
          type={pendingNew.type}
          onCommit={onPendingCommit}
          onCancel={onPendingCancel}
        />
      )}
      {entries.map((entry) => (
        <GridTile
          key={entry.path}
          entry={entry}
          selected={selection.includes(entry.path)}
          onSelect={onSelect}
          onOpen={onOpen}
          onRename={onRename}
          onContextMenu={onContextMenu}
          startInEdit={renamingPath === entry.path}
          onEditDone={onEditDone}
          gitStatus={gitStatusMap?.[entry.name]}
          onDragStartItem={onDragStartItem}
          onDropOnFolder={onDropOnFolder}
        />
      ))}
    </div>
  )
}

/* ── Pending new item tile ── */

function PendingTile({ type, onCommit, onCancel }: { type: 'folder' | 'file'; onCommit: (name: string) => void; onCancel: () => void }) {
  const defaultName = type === 'folder' ? 'untitled folder' : 'untitled.txt'
  const [name, setName] = useState(defaultName)

  function commit() {
    const n = name.trim()
    if (n) onCommit(n)
    else onCancel()
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl p-3 bg-primary/15 ring-1 ring-primary/40 select-none">
      <div className={[
        'flex h-16 w-16 items-center justify-center rounded-md',
        type === 'folder'
          ? 'bg-gradient-to-br from-primary/50 to-primary/25 shadow-elevated'
          : 'bg-surface-2 ring-1 ring-border/60',
      ].join(' ')}>
        <FileIcon ext={type === 'file' ? 'txt' : ''} isDirectory={type === 'folder'} size={type === 'folder' ? 38 : 34} />
      </div>
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
        className="w-full bg-surface-1 text-foreground text-[11px] px-1 py-0.5 rounded border border-primary/60 outline-none text-center"
      />
    </div>
  )
}

/* ── Existing tile ── */

type TileProps = {
  entry: FileEntry
  selected: boolean
  onSelect: (path: string, mods: { meta: boolean; shift: boolean }) => void
  onOpen: (entry: FileEntry) => void
  onRename: (entry: FileEntry, newName: string) => void
  onContextMenu: (e: React.MouseEvent, path: string) => void
  startInEdit?: boolean
  onEditDone?: () => void
  gitStatus?: string
  onDragStartItem?: (entry: FileEntry, e: React.DragEvent) => void
  onDropOnFolder?: (folderPath: string, sources: string[]) => void
}

function GridTile({ entry, selected, onSelect, onOpen, onRename, onContextMenu, startInEdit, onEditDone, gitStatus, onDragStartItem, onDropOnFolder }: TileProps) {
  const [editing, setEditing] = useState(!!startInEdit)
  const [name, setName] = useState(entry.name)
  const [dropActive, setDropActive] = useState(false)
  const cutFiles = useClipboardStore((s) => s.files)
  const operation = useClipboardStore((s) => s.operation)
  const isCut = operation === 'cut' && cutFiles.includes(entry.path)
  const tags = useTagStore((s) => s.map[entry.path] ?? EMPTY_TAGS)
  const thumb = isImageExt(entry.ext) ? novaFileUrl(entry.path) : null

  function commit() {
    setEditing(false)
    onEditDone?.()
    if (name && name !== entry.name) onRename(entry, name)
  }

  return (
    <button
      draggable={!editing}
      onDragStart={(e) => onDragStartItem?.(entry, e)}
      onDragOver={(e) => {
        if (!entry.isDirectory) return
        const types = Array.from(e.dataTransfer.types)
        if (!types.includes('application/x-novafinder-paths')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!dropActive) setDropActive(true)
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => {
        if (!entry.isDirectory) return
        const raw = e.dataTransfer.getData('application/x-novafinder-paths')
        setDropActive(false)
        if (!raw) return
        e.preventDefault()
        try {
          const paths: string[] = JSON.parse(raw)
          onDropOnFolder?.(entry.path, paths)
        } catch {}
      }}
      onClick={(e) => onSelect(entry.path, { meta: e.metaKey || e.ctrlKey, shift: e.shiftKey })}
      onDoubleClick={() => onOpen(entry)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, entry.path) }}
      className={[
        'group flex flex-col items-center gap-2 rounded-xl p-3 transition-all select-none',
        selected ? 'bg-primary/15 ring-1 ring-primary/40' : 'hover:bg-surface-2',
        isCut ? 'opacity-40' : '',
        dropActive ? 'bg-primary/20 ring-2 ring-primary/70' : '',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-16 w-16 items-center justify-center rounded-md transition-transform group-hover:-translate-y-0.5',
          entry.isDirectory
            ? 'folder-icon-bg [background:hsl(74deg_4%_22%_/_51%)]'
            : thumb ? '' : 'bg-surface-2 ring-1 ring-border/60',
        ].join(' ')}
      >
        {thumb ? (
          <img
            src={thumb}
            className="max-w-full max-h-full object-contain rounded-md"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <FileIcon ext={entry.ext} isDirectory={entry.isDirectory} size={entry.isDirectory ? 38 : 34} />
        )}
      </div>

      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setEditing(false); onEditDone?.() }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-surface-1 text-foreground text-[11px] px-1 py-0.5 rounded border border-primary/60 outline-none text-center"
        />
      ) : (
        <span className="flex flex-col items-center gap-0.5 max-w-full">
          <span className="line-clamp-2 text-center text-[12px] font-medium leading-[1.25] text-foreground/80 break-all">
            {entry.name}
          </span>
          <span className="flex items-center gap-1">
            {tags.length > 0 && <TagDots colors={tags} size={6} />}
            {gitStatus && <GitBadge status={gitStatus} />}
          </span>
        </span>
      )}
    </button>
  )
}

const GIT_BADGE: Record<string, { label: string; color: string }> = {
  M: { label: 'M', color: '#F5A623' },
  A: { label: 'A', color: '#4CD964' },
  D: { label: 'D', color: '#FF3B30' },
  R: { label: 'R', color: '#5AC8FA' },
  '?': { label: '?', color: '#8E8E93' },
}

function GitBadge({ status }: { status: string }) {
  const badge = GIT_BADGE[status]
  if (!badge) return null
  return (
    <span
      className="inline-flex items-center justify-center rounded text-[9px] font-bold leading-none px-1 py-0.5"
      style={{ backgroundColor: badge.color + '33', color: badge.color, minWidth: 14 }}
    >
      {badge.label}
    </span>
  )
}
