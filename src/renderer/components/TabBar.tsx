import { usePaneStore, type PaneId } from '../store/paneStore'

type Props = { paneId: PaneId }

export function TabBar({ paneId }: Props) {
  const tabs = usePaneStore((s) => s.tabs[paneId])
  const activeId = usePaneStore((s) => s.activeTabId[paneId])
  const switchTab = usePaneStore((s) => s.switchTab)
  const closeTab = usePaneStore((s) => s.closeTab)
  const newTab = usePaneStore((s) => s.newTab)

  function tabLabel(path: string): string {
    if (path === '/' || !path) return '/'
    const seg = path.split('/').filter(Boolean).pop()
    return seg ?? path
  }

  return (
    <div className="flex items-end gap-0.5 px-2 pt-1 [-webkit-app-region:no-drag] border-b border-border/40 bg-background/40">
      {tabs.map((t) => {
        const active = t.id === activeId
        return (
          <div
            key={t.id}
            onClick={() => switchTab(paneId, t.id)}
            className={[
              'group flex items-center gap-1.5 px-2.5 h-7 rounded-t-md text-[12px] cursor-default select-none max-w-[180px]',
              active
                ? 'bg-background text-foreground border border-b-0 border-border/60'
                : 'bg-surface-2/40 text-muted-foreground hover:bg-surface-2/70 hover:text-foreground',
            ].join(' ')}
            title={t.path}
          >
            <span className="truncate">{tabLabel(t.path)}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(paneId, t.id) }}
                className={[
                  'flex items-center justify-center w-4 h-4 rounded text-muted-foreground hover:bg-surface-3 hover:text-foreground',
                  active ? '' : 'opacity-0 group-hover:opacity-100',
                ].join(' ')}
                title="Close tab (⌘W)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l6 6M8 2l-6 6" />
                </svg>
              </button>
            )}
          </div>
        )
      })}
      <button
        onClick={() => newTab(paneId)}
        title="New Tab (⌘T)"
        className="flex items-center justify-center w-6 h-7 rounded-t-md text-muted-foreground hover:bg-surface-2/70 hover:text-foreground"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 2v8M2 6h8" />
        </svg>
      </button>
    </div>
  )
}
