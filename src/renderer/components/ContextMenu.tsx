import { useEffect, useMemo, useRef, useState } from 'react'
import { useAllTagDefs } from '../store/settingsStore'

export type MenuIcon =
  | 'open' | 'open-default' | 'reveal' | 'info'
  | 'cut' | 'copy' | 'paste' | 'duplicate' | 'copy-path'
  | 'rename' | 'trash'
  | 'new-folder' | 'new-file' | 'refresh'

export type MenuItem =
  | { label: string; action: () => void; icon?: MenuIcon; shortcut?: string; disabled?: boolean; danger?: boolean; separator?: false }
  | { separator: true }
  | { tagsRow: true; selectedColors: string[]; onToggle: (color: string) => void; closeOnToggle?: boolean }

type Props = {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
  boundsRef?: React.RefObject<HTMLElement | null>
}

export function ContextMenu({ x, y, items, onClose, boundsRef }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const typeRef = useRef<{ buf: string; at: number }>({ buf: '', at: 0 })

  // Indices of items that can be focused/activated by keyboard (real,
  // non-disabled menu entries — separators and the tag row are skipped).
  const focusable = useMemo(
    () =>
      items.reduce<number[]>((acc, item, i) => {
        if ('label' in item && !item.disabled) acc.push(i)
        return acc
      }, []),
    [items],
  )
  const [focused, setFocused] = useState(-1)

  // Focus the menu on open so it captures the keyboard immediately, and
  // highlight the first actionable item for arrow-key / Enter users.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    setFocused(focusable[0] ?? -1)
  }, [focusable])

  useEffect(() => {
    if (focused >= 0) btnRefs.current[focused]?.scrollIntoView({ block: 'nearest' })
  }, [focused])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [onClose])

  function moveFocus(dir: 1 | -1) {
    if (!focusable.length) return
    const pos = focusable.indexOf(focused)
    const next = pos < 0
      ? (dir === 1 ? 0 : focusable.length - 1)
      : (pos + dir + focusable.length) % focusable.length
    setFocused(focusable[next])
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Keep keystrokes inside the menu — don't let the file list's global
    // type-ahead / arrow handlers also react while the menu is open.
    e.stopPropagation()
    switch (e.key) {
      case 'Escape': e.preventDefault(); onClose(); return
      case 'ArrowDown': e.preventDefault(); moveFocus(1); return
      case 'ArrowUp': e.preventDefault(); moveFocus(-1); return
      case 'Home': e.preventDefault(); setFocused(focusable[0] ?? -1); return
      case 'End': e.preventDefault(); setFocused(focusable[focusable.length - 1] ?? -1); return
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const item = items[focused]
        if (item && 'label' in item && !item.disabled) { item.action(); onClose() }
        return
      }
    }
    // Type-ahead: jump to the next item whose label starts with the typed key.
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now()
      const fresh = now - typeRef.current.at > 600
      const buf = (fresh ? '' : typeRef.current.buf) + e.key.toLowerCase()
      typeRef.current = { buf, at: now }
      const match = focusable.find((i) => {
        const it = items[i] as Extract<MenuItem, { label: string }>
        return it.label.toLowerCase().startsWith(buf)
      })
      if (match !== undefined) setFocused(match)
    }
  }

  const MENU_W = 260
  const itemCount = items.filter((i) => !('separator' in i && i.separator)).length
  const sepCount = items.filter((i) => 'separator' in i && i.separator).length
  const approxH = itemCount * 24 + sepCount * 7 + 12

  const bounds = boundsRef?.current?.getBoundingClientRect()
  const minX = bounds ? bounds.left + 4 : 4
  const maxX = bounds ? bounds.right - 4 : window.innerWidth - 4
  const minY = bounds ? bounds.top + 4 : 4
  const maxY = bounds ? bounds.bottom - 4 : window.innerHeight - 4

  const left = Math.max(minX, Math.min(x, maxX - MENU_W))
  const top = Math.max(minY, Math.min(y, maxY - approxH))
  const maxHeight = maxY - top

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    top,
    zIndex: 9999,
    minWidth: MENU_W,
    padding: '6px 4px',
    maxHeight,
    overflowY: 'auto',
  }

  return (
    <div
      ref={ref}
      style={{ ...style, outline: 'none' }}
      tabIndex={-1}
      role="menu"
      onKeyDown={onKeyDown}
      className="nd-context-menu rounded-[10px] text-[13px] shadow-[0_14px_48px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.2)]"
    >
      {items.map((item, i) => {
        if ('separator' in item && item.separator) {
          return <div key={i} className="my-[3px] mx-2 border-t border-white/10 dark:border-white/10" />
        }
        if ('tagsRow' in item && item.tagsRow) {
          return <TagsRow key={i} selectedColors={item.selectedColors} onToggle={(c) => { item.onToggle(c); if (item.closeOnToggle) onClose() }} />
        }
        const it = item as Extract<MenuItem, { label: string }>
        const isFocused = i === focused
        return (
          <button
            key={i}
            ref={(el) => { btnRefs.current[i] = el }}
            role="menuitem"
            disabled={it.disabled}
            onMouseEnter={() => !it.disabled && setFocused(i)}
            onClick={() => { it.action(); onClose() }}
            className={[
              'group w-full flex items-center gap-2.5 px-3.5 py-[3px] rounded-md transition-colors text-left',
              it.disabled ? 'opacity-40 cursor-default' :
              it.danger
                ? (isFocused ? 'bg-red-500 text-white' : 'text-red-400')
                : (isFocused ? 'bg-[var(--accent-color)] text-white' : ''),
            ].join(' ')}
          >
            <span className={['w-[22px] h-[22px] flex-shrink-0 flex items-center justify-center', isFocused ? 'opacity-100' : 'opacity-75'].join(' ')}>
              {it.icon ? <MenuIconSvg name={it.icon} /> : <span className="w-[22px]" />}
            </span>
            <span className="flex-1 truncate">{it.label}</span>
            {it.shortcut && (
              <span className={['ml-3 flex-shrink-0 text-[12px] tabular-nums', isFocused ? 'opacity-80' : 'opacity-45'].join(' ')}>
                {it.shortcut}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function TagsRow({ selectedColors, onToggle }: { selectedColors: string[]; onToggle: (color: string) => void }) {
  const allTagDefs = useAllTagDefs()
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-2 flex-wrap">
      {allTagDefs.map((t) => {
        const active = selectedColors.includes(t.name)
        return (
          <button
            key={t.name}
            title={t.label}
            onClick={(e) => { e.stopPropagation(); onToggle(t.name) }}
            className="w-6 h-6 rounded-full transition-transform hover:scale-110 relative"
            style={{
              backgroundColor: t.hex,
              boxShadow: active
                ? `inset 0 0 0 2px white, 0 0 0 2.5px ${t.hex}`
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
