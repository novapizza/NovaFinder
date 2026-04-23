import { useEffect, useState } from 'react'
import path from 'path-browserify'
import { formatSize, formatDate } from '../lib/formatters'
import { FileIcon } from './FileIcon'

type Props = {
  filePath: string
  onClose: () => void
}

export function GetInfoModal({ filePath, onClose }: Props) {
  const [info, setInfo] = useState<{
    size: number
    modified: number
    created: number
    isDirectory: boolean
    childCount?: number
  } | null>(null)

  useEffect(() => {
    async function load() {
      const stat = await window.fs.stat(filePath)
      let childCount: number | undefined
      if (stat.isDirectory) {
        try {
          const entries = await window.fs.readdir(filePath, true)
          childCount = entries.length
        } catch {}
      }
      setInfo({ ...stat, childCount })
    }
    load()
  }, [filePath])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const name = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase().slice(1)

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9998]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-2xl w-[340px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)]">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <FileIcon ext={ext} isDirectory={!!info?.isDirectory} size={44} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[var(--text)] truncate">{name}</div>
            {info && (
              <div className="text-[11px] text-[var(--text-muted)]">
                {info.isDirectory
                  ? (info.childCount !== undefined ? `${info.childCount} items` : 'Folder')
                  : formatSize(info.size)}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 text-[12px] text-[var(--text)] space-y-1.5">
          <Row label="Kind" value={info?.isDirectory ? 'Folder' : (ext ? `${ext.toUpperCase()} document` : 'Document')} />
          {info && !info.isDirectory && <Row label="Size" value={formatSize(info.size)} />}
          <Row label="Where" value={path.dirname(filePath)} mono />
          {info && <Row label="Created" value={formatDate(info.created)} />}
          {info && <Row label="Modified" value={formatDate(info.modified)} />}
        </div>

        <div className="flex justify-end px-4 py-3 border-t border-[var(--border)] bg-[var(--header-bg)]">
          <button
            onClick={onClose}
            className="px-4 py-1 rounded-md bg-[var(--accent)] text-white text-[12px] hover:brightness-110"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <div className="w-16 text-right text-[var(--text-muted)] flex-shrink-0">{label}:</div>
      <div className={`flex-1 break-all ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</div>
    </div>
  )
}
