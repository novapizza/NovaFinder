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
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const { activePaneId, panes, setSort } = usePaneStore()
  const pane = panes[activePaneId]
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [])

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen((v) => !v)
  }

  function choose(key: SortKey) {
    setSort(activePaneId, key)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative [-webkit-app-region:no-drag]">
      <Tooltip label="Sort">
        <button
          ref={btnRef}
          onClick={handleOpen}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-md text-[var(--text-soft)] hover:bg-[var(--hover)] transition-colors"
          aria-label="Sort"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h12" />
            <path d="M6 10h8" />
            <path d="M8 14h4" />
          </svg>
        </button>
      </Tooltip>
      {open && (
        <div
          className="fixed nd-context-menu rounded-[10px] text-[13px] min-w-[200px] z-[99999]"
          style={{ padding: '6px 4px', top: menuPos.top, right: menuPos.right }}
        >
          <div className="px-3 pb-[3px] pt-[2px] text-[11px] font-semibold text-muted-foreground">Sort By</div>
          {OPTIONS.map((opt) => {
            const active = pane.sortKey === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => choose(opt.key)}
                className={[
                  'w-full flex items-center justify-between gap-2.5 px-3 py-[7px] rounded-md transition-colors text-left whitespace-nowrap',
                  active ? 'text-foreground' : 'text-foreground hover:bg-[var(--accent-color)] hover:text-white',
                ].join(' ')}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-3.5 text-primary">{active ? '✓' : ''}</span>
                  {opt.label}
                </span>
                {active && (
                  <span className="text-muted-foreground text-[11px]">
                    {pane.sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </button>
            )
          })}
          <div className="my-[5px] mx-2 border-t border-white/10" />
          <button
            onClick={() => choose(pane.sortKey)}
            className="w-full text-left px-3 py-[7px] rounded-md text-foreground hover:bg-[var(--accent-color)] hover:text-white transition-colors whitespace-nowrap"
          >
            {pane.sortDir === 'asc' ? 'Sort Z→A / New→Old' : 'Sort A→Z / Old→New'}
          </button>
        </div>
      )}
    </div>
  )
}
