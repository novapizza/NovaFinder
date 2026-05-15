import { useEffect, useRef } from 'react'
import type { FileEntry } from './useDirectory'
import { isImageExt } from '../../lib/fileIcons'
import { novaFileUrl, formatSize, formatDate } from '../../lib/formatters'
import { FileIcon } from '../FileIcon'

type Props = {
  entries: FileEntry[]
  selection: string[]
  onSelect: (path: string, mods: { meta: boolean; shift: boolean }) => void
  onOpen: (entry: FileEntry) => void
  onContextMenu: (e: React.MouseEvent, path: string) => void
}

export function GalleryView({ entries, selection, onSelect, onOpen, onContextMenu }: Props) {
  const selectedPath = selection[selection.length - 1] ?? entries[0]?.path
  const current = entries.find((e) => e.path === selectedPath) ?? entries[0]
  const stripRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [current?.path])

  if (!current) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Empty folder
      </div>
    )
  }

  const isImage = !current.isDirectory && isImageExt(current.ext)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hero preview */}
      <div className={`flex-1 min-h-0 flex items-center justify-center px-8 py-6 overflow-hidden ${isImage ? '' : 'bg-surface-1/40'}`}>
        {isImage ? (
          <img
            src={novaFileUrl(current.path)}
            className="max-w-full max-h-full object-contain rounded-md shadow-elevated"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={[
              'flex h-40 w-40 items-center justify-center rounded-md',
              current.isDirectory
                ? 'folder-icon-bg [background:hsl(74deg_4%_22%_/_51%)]'
                : 'bg-surface-2 ring-1 ring-border/60',
            ].join(' ')}>
              <FileIcon ext={current.ext} isDirectory={current.isDirectory} size={96} />
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-border/40 bg-surface-1/40">
        <div className="text-foreground text-[14px] font-medium truncate">{current.name}</div>
        <div className="text-muted-foreground text-[12px] flex gap-3 mt-0.5">
          <span>{current.isDirectory ? 'Folder' : (current.ext ? current.ext.toUpperCase() : 'File')}</span>
          {!current.isDirectory && <span>{formatSize(current.size)}</span>}
          <span>{formatDate(current.modified)}</span>
        </div>
      </div>

      {/* Filmstrip */}
      <div
        ref={stripRef}
        className="flex-shrink-0 flex gap-2 overflow-x-auto scrollbar-thin px-4 py-3 border-t border-border/40 bg-background/40"
      >
        {entries.map((entry) => {
          const selected = selection.includes(entry.path)
          const isActive = entry.path === current.path
          const thumb = !entry.isDirectory && isImageExt(entry.ext) ? novaFileUrl(entry.path) : null
          return (
            <button
              key={entry.path}
              ref={isActive ? activeRef : null}
              onClick={(e) => onSelect(entry.path, { meta: e.metaKey || e.ctrlKey, shift: e.shiftKey })}
              onDoubleClick={() => onOpen(entry)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, entry.path) }}
              className={[
                'flex-shrink-0 flex flex-col items-center gap-1 rounded-md p-1.5 transition-all',
                selected ? 'bg-primary/15 ring-1 ring-primary/40' : 'hover:bg-surface-2',
              ].join(' ')}
              style={{ width: 84 }}
            >
              <div className={[
                'flex h-14 w-14 items-center justify-center rounded-md overflow-hidden',
                entry.isDirectory
                  ? 'folder-icon-bg [background:hsl(74deg_4%_22%_/_51%)]'
                  : thumb ? '' : 'bg-surface-2 ring-1 ring-border/60',
              ].join(' ')}>
                {thumb ? (
                  <img src={thumb} className="max-w-full max-h-full object-contain" />
                ) : (
                  <FileIcon ext={entry.ext} isDirectory={entry.isDirectory} size={30} />
                )}
              </div>
              <span className="text-[10px] text-foreground/90 truncate w-full text-center leading-tight">
                {entry.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
