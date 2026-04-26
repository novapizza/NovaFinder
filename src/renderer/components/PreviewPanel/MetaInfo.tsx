import { useEffect, useState } from 'react'
import path from 'path-browserify'
import { Lock } from 'lucide-react'
import { formatSize, formatDate } from '../../lib/formatters'
import { useTagStore, TAG_COLORS, EMPTY_TAGS, type TagColor } from '../../store/tagStore'

type Props = { filePath: string }

type Stat = {
  size: number
  modified: number
  created: number
  isDirectory: boolean
}

const KIND_LABEL: Record<string, string> = {
  jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image', webp: 'Image', heic: 'Image', svg: 'Image',
  mp4: 'Video', mov: 'Video', m4v: 'Video', webm: 'Video', mkv: 'Video', avi: 'Video',
  mp3: 'Audio', wav: 'Audio', flac: 'Audio', m4a: 'Audio', aac: 'Audio', ogg: 'Audio',
  pdf: 'PDF Document',
  zip: 'Archive', tar: 'Archive', gz: 'Archive', rar: 'Archive', '7z': 'Archive',
  ts: 'Source code', tsx: 'Source code', js: 'Source code', jsx: 'Source code',
  py: 'Source code', go: 'Source code', rs: 'Source code', c: 'Source code',
  cpp: 'Source code', h: 'Source code', json: 'Source code', html: 'Source code',
  css: 'Source code', scss: 'Source code',
  md: 'Markdown', txt: 'Plain text', log: 'Plain text',
  app: 'Application',
}

function kindFor(filePath: string, isDir: boolean): string {
  if (isDir) return 'Folder'
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return KIND_LABEL[ext] ?? (ext ? `${ext.toUpperCase()} File` : 'File')
}

export function MetaInfo({ filePath }: Props) {
  const [meta, setMeta] = useState<Stat | null>(null)
  const tags = useTagStore((s) => s.map[filePath] ?? EMPTY_TAGS)

  useEffect(() => {
    let cancelled = false
    window.fs.stat(filePath)
      .then((s) => { if (!cancelled) setMeta(s) })
      .catch(() => { if (!cancelled) setMeta(null) })
    return () => { cancelled = true }
  }, [filePath])

  if (!meta) return null

  const name = path.basename(filePath)
  const dir = path.dirname(filePath)
  const kind = kindFor(filePath, meta.isDirectory)

  return (
    <div className="border-t border-border/40 mt-2" style={{ padding: '12px 12px 14px' }}>
      {/* Header */}
      <div className="text-center mb-3">
        <div className="line-clamp-2 text-[14px] font-semibold text-foreground leading-tight">{name}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {kind}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-1.5">
        {!meta.isDirectory && meta.size > 0 && <Meta label="Size" value={formatSize(meta.size)} />}
        <Meta label="Created" value={formatDate(meta.created)} />
        <Meta label="Modified" value={formatDate(meta.modified)} />
        <Meta label="Where" value={dir} mono title={dir} />
        <Meta label="Kind" value={kind} />
      </div>

      {/* Tags */}
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Tags</div>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-[12px] text-muted-foreground/80">No tags</span>
          )}
          {tags.map((t) => (
            <TagPill key={t} color={t} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value, mono, icon: Icon, title }: {
  label: string
  value: string
  mono?: boolean
  icon?: typeof Lock
  title?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        title={title}
        className={`flex items-center gap-1 text-right text-foreground min-w-0 truncate ${mono ? 'font-mono text-[11px]' : ''}`}
      >
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        <span className="truncate">{value}</span>
      </span>
    </div>
  )
}

function TagPill({ color }: { color: TagColor }) {
  const def = TAG_COLORS.find((c) => c.name === color)
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-foreground">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: `var(--tag-${color})`, boxShadow: 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.25)' }}
      />
      {def?.label ?? color}
    </span>
  )
}
