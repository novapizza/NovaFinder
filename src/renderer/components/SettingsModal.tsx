import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'

type Tab = 'general' | 'advanced'

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
          <TabButton active={tab === 'advanced'} onClick={() => setTab('advanced')}>Advanced</TabButton>
        </div>

        {/* Body */}
        <div className="p-5 min-h-[220px]">
          {tab === 'general' && <GeneralTab />}
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
