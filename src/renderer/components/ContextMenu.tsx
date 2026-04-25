import { useEffect, useRef } from 'react'

export type MenuIcon =
  | 'open' | 'open-default' | 'reveal' | 'info'
  | 'cut' | 'copy' | 'paste' | 'duplicate' | 'copy-path'
  | 'rename' | 'trash'
  | 'new-folder' | 'new-file' | 'refresh'

export type MenuItem =
  | { label: string; action: () => void; icon?: MenuIcon; disabled?: boolean; danger?: boolean; separator?: false }
  | { separator: true }
  | { tagsRow: true; selectedColors: string[]; onToggle: (color: string) => void; closeOnToggle?: boolean }

type Props = {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('mousedown', handler)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])

  const MENU_W = 260
  const itemCount = items.filter((i) => !('separator' in i && i.separator)).length
  const sepCount = items.filter((i) => 'separator' in i && i.separator).length
  const approxH = itemCount * 30 + sepCount * 9 + 12

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - MENU_W - 8),
    top: Math.min(y, window.innerHeight - approxH - 8),
    zIndex: 9999,
    minWidth: MENU_W,
    padding: '6px 4px',
  }

  return (
    <div
      ref={ref}
      style={style}
      className="nd-context-menu rounded-[10px] overflow-hidden text-[13px] shadow-[0_14px_48px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.2)]"
    >
      {items.map((item, i) => {
        if ('separator' in item && item.separator) {
          return <div key={i} className="my-[5px] mx-2 border-t border-white/10 dark:border-white/10" />
        }
        if ('tagsRow' in item && item.tagsRow) {
          return <TagsRow key={i} selectedColors={item.selectedColors} onToggle={(c) => { item.onToggle(c); if (item.closeOnToggle) onClose() }} />
        }
        const it = item as Extract<MenuItem, { label: string }>
        return (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => { it.action(); onClose() }}
            className={[
              'group w-full flex items-center gap-2.5 px-3.5 py-[7px] rounded-md transition-colors text-left',
              it.disabled ? 'opacity-40 cursor-default' :
              it.danger ? 'text-red-400 hover:bg-red-500 hover:text-white' :
              'hover:bg-[var(--accent)] hover:text-white',
            ].join(' ')}
          >
            <span className="w-[22px] h-[22px] flex-shrink-0 flex items-center justify-center opacity-75 group-hover:opacity-100">
              {it.icon ? <MenuIconSvg name={it.icon} /> : <span className="w-[22px]" />}
            </span>
            <span className="flex-1 truncate">{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const TAG_DOTS: { color: string; label: string }[] = [
  { color: 'red',    label: 'Red' },
  { color: 'orange', label: 'Orange' },
  { color: 'yellow', label: 'Yellow' },
  { color: 'green',  label: 'Green' },
  { color: 'blue',   label: 'Blue' },
  { color: 'purple', label: 'Purple' },
  { color: 'gray',   label: 'Gray' },
]

function TagsRow({ selectedColors, onToggle }: { selectedColors: string[]; onToggle: (color: string) => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-2">
      {TAG_DOTS.map((t) => {
        const active = selectedColors.includes(t.color)
        return (
          <button
            key={t.color}
            title={t.label}
            onClick={(e) => { e.stopPropagation(); onToggle(t.color) }}
            className="w-6 h-6 rounded-full transition-transform hover:scale-110 relative"
            style={{
              backgroundColor: `var(--tag-${t.color})`,
              boxShadow: active
                ? `inset 0 0 0 2px white, 0 0 0 2.5px var(--tag-${t.color})`
                : 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.25)',
            }}
          />
        )
      })}
    </div>
  )
}

function MenuIconSvg({ name }: { name: MenuIcon }) {
  const common = { width: 18, height: 18, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (name) {
    case 'open':
      return (
        <svg {...common}>
          <path d="M10 3h3v3" />
          <path d="M13 3l-6 6" />
          <path d="M12 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" />
        </svg>
      )
    case 'open-default':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
          <path d="M6.5 8l1.5 1.5L11 6" />
        </svg>
      )
    case 'reveal':
      return (
        <svg {...common}>
          <path d="M2 5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z" />
          <path d="M10 9l2 1.5-2 1.5" />
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 7v4" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'cut':
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="1.8" />
          <circle cx="5" cy="11" r="1.8" />
          <path d="M6.3 6l7 4" />
          <path d="M6.3 10l7-4" />
        </svg>
      )
    case 'copy':
      return (
        <svg {...common}>
          <rect x="5" y="5" width="8" height="9" rx="1" />
          <path d="M3 10V3a1 1 0 0 1 1-1h6" />
        </svg>
      )
    case 'paste':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="9" height="10" rx="1" />
          <path d="M6 3.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v0.5" />
          <rect x="5" y="2" width="6" height="2" rx="0.4" />
        </svg>
      )
    case 'duplicate':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="8" height="8" rx="1" />
          <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
        </svg>
      )
    case 'copy-path':
      return (
        <svg {...common}>
          <path d="M7 9.5l-1.5 1.5a2 2 0 0 1-2.8-2.8l3-3a2 2 0 0 1 2.8 0" />
          <path d="M9 6.5l1.5-1.5a2 2 0 0 1 2.8 2.8l-3 3a2 2 0 0 1-2.8 0" />
        </svg>
      )
    case 'rename':
      return (
        <svg {...common}>
          <path d="M3 13l1-3 7-7 2 2-7 7-3 1z" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <path d="M3 4.5h10" />
          <path d="M5 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" />
          <path d="M4.5 4.5l0.5 8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l0.5-8" />
        </svg>
      )
    case 'new-folder':
      return (
        <svg {...common}>
          <path d="M2 5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z" />
          <path d="M8 8v3M6.5 9.5h3" />
        </svg>
      )
    case 'new-file':
      return (
        <svg {...common}>
          <path d="M4 2.5h5l3 3V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
          <path d="M9 2.5V6h3" />
          <path d="M7.5 9v3M6 10.5h3" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M13 8A5 5 0 1 1 8 3a5 5 0 0 1 4 2" />
          <path d="M12 2v3h-3" />
        </svg>
      )
  }
}
