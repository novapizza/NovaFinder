import { useEffect, useState } from 'react'
import { formatSize, formatDate } from '../../lib/formatters'
import path from 'path-browserify'

type Props = { filePath: string }

export function MetaInfo({ filePath }: Props) {
  const [meta, setMeta] = useState<{ size: number; modified: number; created: number } | null>(null)

  useEffect(() => {
    window.fs.stat(filePath).then(setMeta).catch(() => setMeta(null))
  }, [filePath])

  if (!meta) return null

  return (
    <div className="border-t border-[var(--border)] text-xs text-[var(--text-muted)] space-y-0.5" style={{ padding: '8px 12px' }}>
      <div className="truncate text-[var(--text)] font-medium">{path.basename(filePath)}</div>
      {meta.size > 0 && <div>{formatSize(meta.size)}</div>}
      <div>Modified {formatDate(meta.modified)}</div>
    </div>
  )
}
