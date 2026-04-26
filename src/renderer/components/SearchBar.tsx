import { useEffect, useRef, useState } from 'react'
import { useSearchStore } from '../store/searchStore'
import { usePaneStore } from '../store/paneStore'

const SIZE_KEYWORDS = [
  { key: 'tiny',   label: 'Tiny',   desc: '0 – 16 KB' },
  { key: 'small',  label: 'Small',  desc: '16 KB – 1 MB' },
  { key: 'medium', label: 'Medium', desc: '1 MB – 128 MB' },
  { key: 'large',  label: 'Large',  desc: '128 MB – 1 GB' },
  { key: 'huge',   label: 'Huge',   desc: '> 1 GB' },
]

// Everything after "size:" in the current query, or null if not a size query
function parseSizeKeyword(q: string): string | null {
  const m = q.match(/^size:(\w*)$/i)
  return m ? m[1].toLowerCase() : null
}

export function SearchBar() {
  const { query, mode, setQuery, setMode, clear, setResults, setSearching, focusTrigger } = useSearchStore()
  const { activePaneId, panes } = usePaneStore()
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (focusTrigger === 0) return
    inputRef.current?.focus()
    inputRef.current?.select()
    setOpen(true)
  }, [focusTrigger])

  // Run search whenever mode + query + scope change
  useEffect(() => {
    const scope = panes[activePaneId].path
    let cancelled = false

    if (mode === 'size') {
      const keyword = parseSizeKeyword(query)
      // Not a valid complete keyword yet — clear and wait
      if (!keyword || !SIZE_KEYWORDS.find((s) => s.key === keyword)) {
        setResults('', [])
        setSearching(false)
        return
      }
      setSearching(true)
      const t = setTimeout(() => {
        window.fs.searchRecursive(scope, keyword, 'size')
          .then((r) => { if (!cancelled) setResults(scope, r) })
          .catch(() => { if (!cancelled) setResults(scope, []) })
          .finally(() => { if (!cancelled) setSearching(false) })
      }, 200)
      return () => { cancelled = true; clearTimeout(t) }
    }

    if (!mode || !query) {
      setResults('', [])
      setSearching(false)
      return
    }

    setSearching(true)
    const t = setTimeout(() => {
      window.fs.searchRecursive(scope, query, mode as 'name' | 'content' | 'kind')
        .then((r) => { if (!cancelled) setResults(scope, r) })
        .catch(() => { if (!cancelled) setResults(scope, []) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [mode, query, panes[activePaneId].path])

  function handleChange(val: string) {
    setQuery(val)
    // Route mode based on prefix FIRST so the effect always has the right mode
    if (val.startsWith('size:') || val === 'size') {
      setMode('size')
    } else if (!val) {
      // cleared
    } else if (!mode || mode === 'size') {
      setMode('name')
    }
    setOpen(true)
  }

  function apply(kw: string) {
    setQuery(`size:${kw}`)
    setMode('size')
    setOpen(false)
    inputRef.current?.blur()
  }

  function applyMode(m: 'name' | 'content' | 'kind') {
    setMode(m)
    setOpen(false)
    inputRef.current?.blur()
  }

  function onClear() {
    clear()
    setOpen(false)
    inputRef.current?.focus()
  }

  const q = query.trim()
  const isSizeMode = mode === 'size' || q.startsWith('size:')
  const sizeTyped = parseSizeKeyword(q) ?? ''
  const visibleSizes = SIZE_KEYWORDS.filter((s) => s.key.startsWith(sizeTyped))
  const showDropdown = open && q.length > 0

  return (
    <div ref={wrapRef} className="relative [-webkit-app-region:no-drag]">
      <div className="group relative flex items-center">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (query) setOpen(true) }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClear()
            if (e.key === 'Enter') {
              if (isSizeMode && visibleSizes.length === 1) {
                apply(visibleSizes[0].key)
              } else if (!isSizeMode) {
                applyMode(mode as 'name' | 'content' | 'kind' ?? 'name')
              }
            }
          }}
          placeholder="Search…"
          className={[
            'h-8 w-48 rounded-lg border bg-surface-2/60 pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none transition-all',
            focused || showDropdown
              ? 'w-64 border-primary/60 bg-surface-1 shadow-glow'
              : 'border-border/60',
          ].join(' ')}
        />
        {query ? (
          <button onClick={onClear} className="absolute right-2 text-muted-foreground hover:text-foreground flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="7" fillOpacity="0.35" />
              <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        ) : (
          <svg className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5l3 3" />
          </svg>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 nd-context-menu rounded-[10px] py-2 text-[13px] shadow-[0_14px_48px_rgba(0,0,0,0.35)]" style={{ minWidth: 240 }}>
          {isSizeMode ? (
            <SuggestionGroup title="Size Filter">
              {visibleSizes.length > 0 ? visibleSizes.map((s) => (
                <Suggestion key={s.key} onClick={() => apply(s.key)} active={query === `size:${s.key}`}>
                  <span>size:<b>{s.key}</b></span>
                  <span className="ml-auto text-[11px] opacity-60 pl-3">{s.desc}</span>
                </Suggestion>
              )) : (
                <div className="px-3 py-1.5 text-[12px] text-muted-foreground">
                  Try: tiny · small · medium · large · huge
                </div>
              )}
            </SuggestionGroup>
          ) : (
            <>
              <SuggestionGroup title="Filename">
                <Suggestion onClick={() => applyMode('name')} active={mode === 'name'}>
                  Name contains <Chip>{q}</Chip>
                </Suggestion>
              </SuggestionGroup>
              <SuggestionGroup title="Content">
                <Suggestion onClick={() => applyMode('content')} active={mode === 'content'}>
                  Content contains <Chip>{q}</Chip>
                </Suggestion>
              </SuggestionGroup>
              <SuggestionGroup title="Kind">
                <Suggestion onClick={() => applyMode('kind')} active={mode === 'kind'}>
                  Kind: <Chip>{q}</Chip>
                </Suggestion>
              </SuggestionGroup>
              <SuggestionGroup title="Size">
                <Suggestion onClick={() => { handleChange('size:'); inputRef.current?.focus() }}>
                  Filter by file size… <span className="ml-auto text-[11px] opacity-50 pl-3">size:</span>
                </Suggestion>
              </SuggestionGroup>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SuggestionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-1">
      <div className="px-3 pt-1.5 pb-0.5 text-[11px] font-semibold text-[var(--text-muted)]">{title}</div>
      {children}
    </div>
  )
}

function Suggestion({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-1 text-[13px] transition-colors flex items-center gap-1',
        active ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--accent-color)] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold">"{children}"</span>
}
