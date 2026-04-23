import { useEffect, useState } from 'react'
import { usePaneStore } from '../store/paneStore'
import { formatSize } from '../lib/formatters'

export function StatusBar() {
  const { activePaneId, panes, showHidden } = usePaneStore()
  const pane = panes[activePaneId]
  const [totalCount, setTotalCount] = useState(0)
  const [selectedSize, setSelectedSize] = useState(0)

  useEffect(() => {
    window.fs.readdir(pane.path, showHidden).then((entries) => {
      setTotalCount(entries.length)
    }).catch(() => setTotalCount(0))
  }, [pane.path, showHidden])

  useEffect(() => {
    if (pane.selection.length === 0) { setSelectedSize(0); return }
    Promise.all(
      pane.selection.map((p) => window.fs.stat(p).catch(() => null)),
    ).then((stats) => {
      const total = stats.reduce((acc, s) => acc + (s && !s.isDirectory ? s.size : 0), 0)
      setSelectedSize(total)
    })
  }, [pane.selection])

  return (
    <div className="glass flex h-7 shrink-0 items-center justify-between border-t border-border/60 px-3 text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-3">
        <span>{totalCount} item{totalCount === 1 ? '' : 's'}</span>
        {pane.selection.length > 0 && (
          <>
            <span className="text-border">·</span>
            <span>
              {pane.selection.length} selected
              {selectedSize > 0 && ` · ${formatSize(selectedSize)}`}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <CpuIcon /> 12% CPU
        </span>
        <span className="flex items-center gap-1 text-primary">
          <CloudIcon /> Synced
        </span>
        <span className="flex items-center gap-1 text-success">
          <WifiIcon /> Local
        </span>
      </div>
    </div>
  )
}

function CpuIcon() {
  return <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" x2="9" y1="1" y2="4"/><line x1="15" x2="15" y1="1" y2="4"/><line x1="9" x2="9" y1="20" y2="23"/><line x1="15" x2="15" y1="20" y2="23"/><line x1="20" x2="23" y1="9" y2="9"/><line x1="20" x2="23" y1="14" y2="14"/><line x1="1" x2="4" y1="9" y2="9"/><line x1="1" x2="4" y1="14" y2="14"/></svg>
}

function CloudIcon() {
  return <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
}

function WifiIcon() {
  return <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>
}
