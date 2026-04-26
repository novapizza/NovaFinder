import { useState } from 'react'
import { usePaneStore, type ViewMode } from '../store/paneStore'
import { RECENTS_PATH } from '../store/recentsStore'
import { SearchBar } from './SearchBar'
import { SortMenu } from './SortMenu'
import { Tooltip } from './Tooltip'

type Props = {
  showPreview: boolean
  onTogglePreview: () => void
  onRefresh: () => void
  onNewFolder: () => void
  onNewFile: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Toolbar({ showPreview, onTogglePreview, onRefresh, onNewFolder, onNewFile, theme, onToggleTheme }: Props) {
  const { activePaneId, panes, navigateTo, navigateBack, navigateForward, navigateUp, showHidden, toggleHidden, viewMode, setViewMode, syncPanes, setSyncPanes } = usePaneStore()
  const pane = panes[activePaneId]
  const [editing, setEditing] = useState(false)
  const [pathInput, setPathInput] = useState('')

  const canBack = pane.historyIndex > 0
  const canForward = pane.historyIndex < pane.history.length - 1
  const isRecentsMode = pane.path === RECENTS_PATH
  const canUp = pane.path !== '/' && !isRecentsMode
  const segments = pane.path === '/' ? [''] : pane.path.split('/').filter(Boolean)

  function startEdit() { setPathInput(pane.path); setEditing(true) }
  function commitPath() {
    setEditing(false)
    if (pathInput && pathInput !== pane.path) navigateTo(activePaneId, pathInput)
  }

  return (
    <div className="glass-strong flex items-center gap-1.5 pl-3 pr-3 border-b border-border/60 flex-shrink-0 min-h-[52px] [-webkit-app-region:drag]">

      {/* Nav arrows */}
      <div className="flex items-center gap-0.5 [-webkit-app-region:no-drag]">
        <TBtn onClick={() => navigateBack(activePaneId)} disabled={!canBack} title="Back (⌘←)"><ChevronLeftIcon /></TBtn>
        <TBtn onClick={() => navigateForward(activePaneId)} disabled={!canForward} title="Forward (⌘→)"><ChevronRightIcon /></TBtn>
      </div>

      <div className="flex items-center gap-0.5 [-webkit-app-region:no-drag]">
        <TBtn onClick={() => navigateUp(activePaneId)} disabled={!canUp} title="Up (⌘↑)"><UpIcon /></TBtn>
        <TBtn onClick={onRefresh} title="Refresh (⌘R)"><RefreshIcon /></TBtn>
        <TBtn onClick={onNewFolder} title="New Folder (⇧⌘N)"><FolderPlusIcon /></TBtn>
        <TBtn onClick={onNewFile} title="New File"><FilePlusIcon /></TBtn>
      </div>

      {/* View mode segmented control */}
      <div className="flex items-center rounded-lg bg-surface-2 p-0.5 ml-1 [-webkit-app-region:no-drag]">
        <ViewBtn mode="icon" current={viewMode} onSelect={setViewMode} title="As Icons (⌘1)"><GridIcon /></ViewBtn>
        <ViewBtn mode="list" current={viewMode} onSelect={setViewMode} title="As List (⌘2)"><ListIcon /></ViewBtn>
        <ViewBtn mode="column" current={viewMode} onSelect={setViewMode} title="As Columns (⌘3)"><ColumnsIcon /></ViewBtn>
      </div>

      <SortMenu />

      {/* Path breadcrumb / edit */}
      <div className="ml-2 flex-1 min-w-0 [-webkit-app-region:no-drag]">
        {isRecentsMode ? (
          <div className="w-full flex items-center px-3 py-1.5 rounded-lg min-h-[34px] border border-border/40 bg-surface-2/60">
            <span className="text-foreground font-medium text-[13px]">Recents</span>
          </div>
        ) : editing ? (
          <input
            autoFocus
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onBlur={commitPath}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPath()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full bg-surface-1 text-foreground text-[13px] px-3 py-1.5 rounded-lg outline-none border border-primary/60 font-mono"
          />
        ) : (
          <button
            onClick={startEdit}
            className="w-full flex items-center gap-1 text-left bg-surface-2/60 hover:bg-surface-2 px-3 py-1.5 rounded-lg transition-colors min-h-[34px] border border-border/40"
          >
            {segments.length === 1 && segments[0] === '' ? (
              <span className="text-foreground text-[13px]">/</span>
            ) : (
              segments.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className={i === segments.length - 1 ? 'text-foreground font-medium text-[13px]' : 'text-muted-foreground text-[13px] hover:text-foreground'}
                    onClick={(e) => { e.stopPropagation(); navigateTo(activePaneId, '/' + segments.slice(0, i + 1).join('/')) }}
                  >
                    {seg}
                  </span>
                  {i < segments.length - 1 && <ChevronSmallIcon />}
                </span>
              ))
            )}
          </button>
        )}
      </div>

      <div className="w-4 shrink-0 [-webkit-app-region:drag]" />

      {/* Right-side controls */}
      <div className="flex items-center gap-0.5 [-webkit-app-region:no-drag]">
        <TBtn onClick={toggleHidden} active={showHidden} title="Show hidden files (⇧⌘.)"><DotIcon /></TBtn>
        <TBtn onClick={onToggleTheme} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </TBtn>
        <TBtn onClick={onTogglePreview} active={showPreview} title="Toggle preview (⌘⇧P)"><PreviewIcon /></TBtn>
      </div>

      <div className="ml-1 [-webkit-app-region:no-drag]">
        <SearchBar />
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function TBtn({ children, onClick, disabled, active, title }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; active?: boolean; title?: string
}) {
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
        disabled
          ? 'text-muted-foreground/30 cursor-default'
          : active
          ? 'text-primary bg-primary/15'
          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
  return title ? <Tooltip label={title}>{btn}</Tooltip> : btn
}

function ViewBtn({ children, mode, current, onSelect, title }: {
  children: React.ReactNode; mode: ViewMode; current: ViewMode; onSelect: (m: ViewMode) => void; title: string
}) {
  const active = current === mode
  return (
    <Tooltip label={title}>
      <button
        onClick={() => onSelect(mode)}
        className={[
          'px-2.5 py-1.5 rounded-md transition-all',
          active
            ? 'bg-gradient-to-r from-primary to-[hsl(232_90%_65%)] text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        ].join(' ')}
      >
        {children}
      </button>
    </Tooltip>
  )
}

/* ── SVG Icons ── */
function ChevronLeftIcon()  { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function ChevronRightIcon() { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function UpIcon()           { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg> }
function RefreshIcon()      { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><path d="M21 3v5h-5"/></svg> }
function FolderPlusIcon()   { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" x2="12" y1="11" y2="17"/><line x1="9" x2="15" y1="14" y2="14"/></svg> }
function FilePlusIcon()     { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="13" y2="19"/><line x1="9" x2="15" y1="16" y2="16"/></svg> }
function GridIcon()         { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function ListIcon()         { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg> }
function ColumnsIcon()      { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" x2="9" y1="3" y2="21"/><line x1="15" x2="15" y1="3" y2="21"/></svg> }
function DotIcon()          { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg> }
function PreviewIcon()      { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" x2="15" y1="3" y2="21"/></svg> }
function ChevronSmallIcon() { return <svg className="h-3 w-3 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function SunIcon()          { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> }
function MoonIcon()         { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> }
function SyncIcon()         { return <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg> }
