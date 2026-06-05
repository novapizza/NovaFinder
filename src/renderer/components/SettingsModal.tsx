import { useEffect, useRef, useState } from 'react'
import { useSettingsStore, useAllTagDefs, SIDEBAR_ITEMS, isSidebarItemHidden, isSidebarTagHidden, getTagLabel, type SidebarItemId, type CustomTag } from '../store/settingsStore'
import { TAG_COLORS } from '../store/tagStore'

type Tab = 'general' | 'sidebar' | 'tags' | 'advanced'

type Props = {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('general')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-2xl w-[560px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
          <div className="text-[14px] font-semibold text-foreground">Settings</div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-[16px] leading-none"
            aria-label="Close"
          >×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/40 px-3">
          <TabButton active={tab === 'general'} onClick={() => setTab('general')}>General</TabButton>
          <TabButton active={tab === 'sidebar'} onClick={() => setTab('sidebar')}>Sidebar</TabButton>
          <TabButton active={tab === 'tags'} onClick={() => setTab('tags')}>Tags</TabButton>
          <TabButton active={tab === 'advanced'} onClick={() => setTab('advanced')}>Advanced</TabButton>
        </div>

        {/* Body */}
        <div className="p-5 min-h-[220px]">
          {tab === 'general' && <GeneralTab />}
          {tab === 'sidebar' && <SidebarTab />}
          {tab === 'tags' && <TagsTab />}
          {tab === 'advanced' && <AdvancedTab />}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 text-[13px] -mb-px border-b-2 transition-colors',
        active ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// Common macOS terminal apps. The value is the app name `open -a` expects.
// "" means use the OS default (Terminal.app).
const TERMINAL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'System default (Terminal)' },
  { value: 'Terminal', label: 'Terminal' },
  { value: 'iTerm', label: 'iTerm' },
  { value: 'Warp', label: 'Warp' },
  { value: 'Ghostty', label: 'Ghostty' },
  { value: 'Hyper', label: 'Hyper' },
  { value: 'Alacritty', label: 'Alacritty' },
  { value: 'kitty', label: 'kitty' },
  { value: 'WezTerm', label: 'WezTerm' },
]

function GeneralTab() {
  const terminalApp = useSettingsStore((s) => s.terminalApp)
  const setSetting = useSettingsStore((s) => s.set)
  const isPreset = TERMINAL_OPTIONS.some((o) => o.value === terminalApp)
  const [custom, setCustom] = useState(isPreset ? '' : terminalApp)
  const [mode, setMode] = useState<'preset' | 'custom'>(isPreset ? 'preset' : 'custom')

  return (
    <div className="space-y-4">
      <Row
        label="Open in Terminal — preferred app"
        description={
          <>
            Used when you choose <i>Open in Terminal</i> from the context menu or press ⌥⌘T.
            Pick a preset or enter another app's name (must match the .app file under
            <code className="px-1 bg-surface-2 rounded mx-1">/Applications</code>).
          </>
        }
      >
        <div className="flex flex-col items-end gap-2">
          {mode === 'preset' ? (
            <select
              value={terminalApp}
              onChange={(e) => setSetting('terminalApp', e.target.value)}
              className="bg-surface-2 border border-border/60 rounded px-2 py-1 text-[12.5px] text-foreground outline-none focus:border-primary"
            >
              {TERMINAL_OPTIONS.map((o) => (
                <option key={o.value || 'default'} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onBlur={() => setSetting('terminalApp', custom.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
              placeholder="App name, e.g. Tabby"
              className="bg-surface-2 border border-border/60 rounded px-2 py-1 text-[12.5px] text-foreground outline-none focus:border-primary w-48"
            />
          )}
          <button
            onClick={() => {
              if (mode === 'preset') {
                setMode('custom')
                setCustom(terminalApp)
              } else {
                setMode('preset')
                if (!isPreset) setSetting('terminalApp', '')
              }
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === 'preset' ? 'Use a custom app name' : 'Pick from presets'}
          </button>
        </div>
      </Row>
    </div>
  )
}

function AdvancedTab() {
  const windowsStyleSort = useSettingsStore((s) => s.windowsStyleSort)
  const setSetting = useSettingsStore((s) => s.set)

  return (
    <div className="space-y-4">
      <Row
        label="Sort folders before files (Windows-style)"
        description={
          <>
            <span>When <b>on</b>, folders are always grouped at the top of the list (Windows Explorer behavior).</span><br />
            <span>When <b>off</b>, folders and files are interleaved alphabetically — the macOS Finder default (case-insensitive, diacritic-insensitive, natural numeric order, e.g. <i>file2</i> before <i>file10</i>).</span>
          </>
        }
      >
        <Toggle value={windowsStyleSort} onChange={(v) => setSetting('windowsStyleSort', v)} />
      </Row>
    </div>
  )
}

function SidebarTab() {
  const sidebarItems = useSettingsStore((s) => s.sidebarItems)
  const setSetting = useSettingsStore((s) => s.set)

  function toggleItem(id: SidebarItemId) {
    const visible = !isSidebarItemHidden(sidebarItems, id)
    setSetting('sidebarItems', { ...sidebarItems, [id]: !visible })
  }

  const favItems = SIDEBAR_ITEMS.filter((i) => i.group === 'Favorites')
  const locItems = SIDEBAR_ITEMS.filter((i) => i.group === 'Locations')

  return (
    <div className="space-y-5">
      {/* Favorites */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/60 mb-2">Favorites</div>
        <div className="space-y-0.5">
          {favItems.map((item) => (
            <CheckRow
              key={item.id}
              label={item.label}
              checked={!isSidebarItemHidden(sidebarItems, item.id)}
              onChange={() => toggleItem(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Locations */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/60 mb-2">Locations</div>
        <div className="space-y-0.5">
          {locItems.map((item) => (
            <CheckRow
              key={item.id}
              label={item.label}
              checked={!isSidebarItemHidden(sidebarItems, item.id)}
              onChange={() => toggleItem(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Color swatches offered when creating a new tag.
const NEW_TAG_PALETTE = [
  '#FF5E58','#FF8C42','#FFD04A','#59D067','#4DA8FF','#C974E2','#B0B0B0',
  '#FF2D55','#FF6B35','#FFE066','#00C896','#34AADC','#9B59B6','#636366',
  '#FF9500','#FFCC00','#30D158','#5AC8FA','#0A84FF','#BF5AF2','#8E8E93',
]

function TagsTab() {
  const sidebarTags = useSettingsStore((s) => s.sidebarTags)
  const tagLabels = useSettingsStore((s) => s.tagLabels)
  const customTags = useSettingsStore((s) => s.customTags)
  const setSetting = useSettingsStore((s) => s.set)
  const allDefs = useAllTagDefs()

  // New-tag form state
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newHex, setNewHex] = useState(NEW_TAG_PALETTE[0])
  const newLabelRef = useRef<HTMLInputElement>(null)

  function toggleVisibility(id: string) {
    setSetting('sidebarTags', { ...sidebarTags, [id]: !isSidebarTagHidden(sidebarTags, id) ? false : undefined })
  }

  function setLabel(id: string, value: string) {
    setSetting('tagLabels', { ...tagLabels, [id]: value })
  }

  function resetLabel(id: string) {
    const next = { ...tagLabels }
    delete next[id]
    setSetting('tagLabels', next)
  }

  function deleteCustomTag(id: string) {
    setSetting('customTags', customTags.filter((t) => t.id !== id))
    // Clean up any stored label/visibility for this id
    const nextLabels = { ...tagLabels }; delete nextLabels[id]
    setSetting('tagLabels', nextLabels)
    const nextVis = { ...sidebarTags }; delete nextVis[id]
    setSetting('sidebarTags', nextVis)
  }

  function commitNew() {
    const label = newLabel.trim()
    if (!label) { setAdding(false); return }
    const id = `custom_${Date.now()}`
    setSetting('customTags', [...customTags, { id, label, hex: newHex }])
    setNewLabel('')
    setNewHex(NEW_TAG_PALETTE[0])
    setAdding(false)
  }

  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground mb-3 leading-relaxed">
        Click a name to rename it. Custom tags can also be deleted.
      </div>

      {/* Scrollable tag list */}
      <div className="space-y-0.5 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
        {allDefs.map((def) => {
          const storedLabel = tagLabels[def.name] ?? ''
          const defaultLabel = def.builtin
            ? (TAG_COLORS.find((t) => t.name === def.name)?.label ?? def.name)
            : (customTags.find((t) => t.id === def.name)?.label ?? def.name)
          return (
            <TagRow
              key={def.name}
              id={def.name}
              hex={def.hex}
              defaultLabel={defaultLabel}
              storedLabel={storedLabel}
              inSidebar={!isSidebarTagHidden(sidebarTags, def.name)}
              builtin={def.builtin}
              onToggleSidebar={() => toggleVisibility(def.name)}
              onLabelChange={(v) => setLabel(def.name, v)}
              onLabelReset={() => resetLabel(def.name)}
              onDelete={() => deleteCustomTag(def.name)}
            />
          )
        })}
      </div>

      {/* Add tag form / button */}
      {adding ? (
        <div className="mt-3 flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-surface-2/40">
          {/* Color picker */}
          <div className="flex flex-wrap gap-1.5">
            {NEW_TAG_PALETTE.map((hex) => (
              <button
                key={hex}
                onClick={() => setNewHex(hex)}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: hex,
                  boxShadow: newHex === hex
                    ? `inset 0 0 0 2px white, 0 0 0 2px ${hex}`
                    : 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.2)',
                }}
              />
            ))}
          </div>
          {/* Name input */}
          <div className="flex items-center gap-2">
            <span
              className="h-[14px] w-[14px] rounded-full flex-shrink-0"
              style={{ backgroundColor: newHex, boxShadow: 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.2)' }}
            />
            <input
              ref={newLabelRef}
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNew()
                if (e.key === 'Escape') { setAdding(false); setNewLabel('') }
              }}
              placeholder="Tag name…"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none border-b border-border/60 py-0.5"
            />
            <button
              onClick={commitNew}
              disabled={!newLabel.trim()}
              className="text-[12px] text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-default transition-colors font-medium"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewLabel('') }}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1.5 px-2 py-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-surface-2"
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 2v8M2 6h8"/>
          </svg>
          Add tag
        </button>
      )}
    </div>
  )
}

function TagRow({
  id, hex, defaultLabel, storedLabel, inSidebar, builtin,
  onToggleSidebar, onLabelChange, onLabelReset, onDelete,
}: {
  id: string
  hex: string
  defaultLabel: string
  storedLabel: string
  inSidebar: boolean
  builtin: boolean
  onToggleSidebar: () => void
  onLabelChange: (v: string) => void
  onLabelReset: () => void
  onDelete: () => void
}) {
  const resolvedLabel = storedLabel && storedLabel !== defaultLabel ? storedLabel : defaultLabel
  const [draft, setDraft] = useState(resolvedLabel)
  const inputRef = useRef<HTMLInputElement>(null)

  const prevStored = useRef(storedLabel)
  if (storedLabel !== prevStored.current) {
    prevStored.current = storedLabel
    if (document.activeElement !== inputRef.current) {
      setDraft(storedLabel && storedLabel !== defaultLabel ? storedLabel : defaultLabel)
    }
  }

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === defaultLabel) {
      setDraft(defaultLabel)
      onLabelReset()
    } else {
      onLabelChange(trimmed)
    }
  }

  const isRenamed = storedLabel !== '' && storedLabel !== defaultLabel

  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-surface-2 group">
      <span
        className="h-[14px] w-[14px] rounded-full flex-shrink-0"
        style={{ backgroundColor: hex, boxShadow: 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.2)' }}
      />

      <div className="flex flex-1 items-center gap-1.5 min-w-0">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') { setDraft(resolvedLabel); e.currentTarget.blur() }
          }}
          className={[
            'flex-1 min-w-0 bg-transparent text-[13px] outline-none border-b transition-colors py-0.5',
            isRenamed
              ? 'text-foreground border-transparent focus:border-border/60'
              : 'text-muted-foreground focus:text-foreground border-transparent focus:border-border/60',
          ].join(' ')}
        />
        {isRenamed && document.activeElement !== inputRef.current && (
          <button
            onClick={() => { setDraft(defaultLabel); onLabelReset() }}
            title={`Reset to "${defaultLabel}"`}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-muted-foreground text-[10px] flex-shrink-0"
          >
            reset
          </button>
        )}
      </div>

      {/* Sidebar visibility */}
      <button
        onClick={onToggleSidebar}
        title={inSidebar ? 'Hide in sidebar' : 'Show in sidebar'}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        {inSidebar ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        )}
      </button>

      {/* Delete (custom tags only) */}
      {!builtin && (
        <button
          onClick={onDelete}
          title="Delete tag"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-red-400 flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
}

function CheckRow({ label, checked, onChange, icon }: {
  label: string
  checked: boolean
  onChange: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onChange}
      className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-2 transition-colors text-left group"
    >
      {/* Checkbox */}
      <span className={[
        'flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        checked ? 'bg-primary border-primary' : 'border-border/60 bg-surface-2',
      ].join(' ')}>
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 3.5L3.5 6L8 1" />
          </svg>
        )}
      </span>
      {icon}
      <span className="text-[13px] text-foreground">{label}</span>
    </button>
  )
}

function Row({ label, description, children }: { label: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-foreground">{label}</div>
        {description && <div className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{description}</div>}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      className={[
        'relative inline-flex h-[22px] w-[38px] items-center rounded-full transition-colors',
        value ? 'bg-primary' : 'bg-surface-2 border border-border/60',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-[18px]' : 'translate-x-[2px]',
        ].join(' ')}
      />
    </button>
  )
}
