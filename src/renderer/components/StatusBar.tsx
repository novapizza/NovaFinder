import { useEffect, useState } from 'react'
import { usePaneStore } from '../store/paneStore'
import { formatSize } from '../lib/formatters'
import { RECENTS_PATH } from '../store/recentsStore'
import { SMART_PATH_PREFIX } from '../store/smartFoldersStore'
import { TAG_PATH_PREFIX } from '../store/tagStore'

function isVirtualPath(p: string) {
  return p === RECENTS_PATH || p.startsWith(SMART_PATH_PREFIX) || p.startsWith(TAG_PATH_PREFIX)
}

export function StatusBar() {
  const { activePaneId, panes, showHidden } = usePaneStore()
  const pane = panes[activePaneId]
  const [totalCount, setTotalCount] = useState(0)
  const [selectedSize, setSelectedSize] = useState(0)

  useEffect(() => {
    if (isVirtualPath(pane.path)) { setTotalCount(0); return }
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

    </div>
  )
}
