import { useState } from 'react'
import { FileEntry } from './useDirectory'
import { formatSize, formatDate } from '../../lib/formatters'
import { useClipboardStore } from '../../store/clipboardStore'
import { FileIcon } from '../FileIcon'
import { TagDots } from '../TagDots'
import { useTagStore, EMPTY_TAGS } from '../../store/tagStore'

type Props = {
  entry: FileEntry
  selected: boolean
  onSelect: (path: string, modifiers: { meta: boolean; shift: boolean }) => void
  onOpen: (entry: FileEntry) => void
  onRename: (entry: FileEntry, newName: string) => void
  onContextMenu: (e: React.MouseEvent, path: string) => void
  startInEdit?: boolean
  onEditDone?: () => void
  gitStatus?: string
}

const KIND: Record<string, string> = {
  txt: 'Plain Text', md: 'Markdown', pdf: 'PDF',
  jpg: 'JPEG image', jpeg: 'JPEG image', png: 'PNG image', gif: 'GIF image',
  webp: 'WebP image', svg: 'SVG image', heic: 'HEIC image',
  mp4: 'MPEG-4 movie', mov: 'QuickTime movie', webm: 'WebM movie', mkv: 'Matroska movie',
  mp3: 'MP3 audio', wav: 'WAV audio', flac: 'FLAC audio', m4a: 'M4A audio',
  zip: 'ZIP archive', tar: 'TAR archive', gz: 'Gzip archive',
  doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'Keynote', pptx: 'Keynote',
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  json: 'JSON', html: 'HTML', css: 'CSS', py: 'Python', rs: 'Rust', go: 'Go',
  app: 'Application', dmg: 'Disk Image',
}

function kindLabel(ext: string, isDirectory: boolean): string {
  if (isDirectory) return 'Folder'
  return KIND[ext.toLowerCase()] || (ext ? `${ext.toUpperCase()} document` : 'Document')
}

export function FileRow({ entry, selected, onSelect, onOpen, onRename, onContextMenu, startInEdit, onEditDone, gitStatus }: Props) {
  const [editing, setEditing] = useState(!!startInEdit)
  const [editName, setEditName] = useState(entry.name)
  const cutFiles = useClipboardStore((s) => s.files)
  const operation = useClipboardStore((s) => s.operation)
  const isCut = operation === 'cut' && cutFiles.includes(entry.path)
  const tags = useTagStore((s) => s.map[entry.path] ?? EMPTY_TAGS)

  function handleClick(e: React.MouseEvent) {
    onSelect(entry.path, { meta: e.metaKey || e.ctrlKey, shift: e.shiftKey })
  }

  function commitRename() {
    setEditing(false)
    onEditDone?.()
    if (editName && editName !== entry.name) onRename(entry, editName)
  }

  return (
    <div
      className={[
        'grid grid-cols-[32px_minmax(0,1fr)_170px_100px_100px] items-center gap-2 px-3 py-1.5 cursor-default select-none text-[13px]',
        selected ? 'row-active' : 'row-hover',
        isCut ? 'opacity-40' : '',
      ].join(' ')}
      onClick={handleClick}
      onDoubleClick={() => onOpen(entry)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, entry.path) }}
    >
      <span className="flex-shrink-0 flex items-center justify-center w-7 h-7">
        <FileIcon ext={entry.ext} isDirectory={entry.isDirectory} size={26} />
      </span>

      {editing ? (
        <input
          autoFocus
          className="bg-surface-1 rounded px-1 text-[13px] text-foreground outline-none border border-primary/60"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setEditing(false); onEditDone?.() }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex items-center min-w-0 gap-1.5">
          <span className="truncate">{entry.name}</span>
          <TagDots colors={tags} size={7} />
          {gitStatus && <GitBadge status={gitStatus} />}
        </span>
      )}

      <span className="text-xs text-muted-foreground tabular-nums truncate">{formatDate(entry.modified)}</span>
      <span className="text-xs text-muted-foreground text-right tabular-nums">
        {entry.isDirectory ? '—' : formatSize(entry.size)}
      </span>
      <span className="text-xs text-muted-foreground truncate">{kindLabel(entry.ext, entry.isDirectory)}</span>
    </div>
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
      className="inline-flex items-center justify-center rounded text-[9px] font-bold leading-none px-1 py-0.5 flex-shrink-0"
      style={{ backgroundColor: badge.color + '33', color: badge.color, minWidth: 14 }}
    >
      {badge.label}
    </span>
  )
}
