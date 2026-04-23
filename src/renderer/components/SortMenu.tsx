import { useEffect, useRef, useState } from 'react'
import { usePaneStore, type SortKey } from '../store/paneStore'
import { Tooltip } from './Tooltip'

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'kind', label: 'Kind' },
  { key: 'modified', label: 'Date Modified' },
  { key: 'size', label: 'Size' },
]

export function SortMenu() {
  const [open, setOpen] = useState(false)
  const { activePaneId, panes, setSort } = usePaneStore()
  const pane = panes[activePaneId]
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [])

  function choose(key: SortKey) {
    setSort(activePaneId, key)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative [-webkit-app-region:no-drag]">
      <Tooltip label="Sort">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-[48px] h-[48px] flex items-center justify-center rounded-md text-[var(--text-soft)] hover:bg-[var(--hover)] transition-colors"
          aria-label="Sort"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h12" />
            <path d="M6 10h8" />
            <path d="M8 14h4" />
          </svg>
        </button>
      </Tooltip>
      {open && (
        <div className="absolute right-0 top-full mt-1 nd-context-menu rounded-[10px] py-1 text-[13px] min-w-[180px] shadow-[0_14px_48px_rgba(0,0,0,0.35)] z-[9999]">
          <div className="px-3 pt-1 pb-0.5 text-[11px] font-semibold text-[var(--text-muted)]">Sort By</div>
          {OPTIONS.map((opt) => {
            const active = pane.sortKey === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => choose(opt.key)}
                className={[
                  'w-full flex items-center justify-between px-3 py-1 text-left transition-colors',
                  active ? 'text-[var(--text)]' : 'text-[var(--text)] hover:bg-[var(--accent)] hover:text-white',
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <span className="w-3 text-[var(--accent)]">{active ? '✓' : ''}</span>
                  {opt.label}
                </span>
                {active && (
                  <span className="text-[var(--text-muted)] text-[11px]">
                    {pane.sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </button>
            )
          })}
          <div className="my-1 mx-2 border-t border-white/10" />
          <button
            onClick={() => choose(pane.sortKey)}
            className="w-full text-left px-3 py-1 text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-colors"
          >
            Reverse Direction ({pane.sortDir === 'asc' ? 'A→Z / Old→New' : 'Z→A / New→Old'})
          </button>
        </div>
      )}
    </div>
  )
}
