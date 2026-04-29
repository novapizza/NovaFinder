import { useEffect, useMemo, useState } from 'react'

type App = { name: string; path: string }

type Props = {
  filePaths: string[]
  onClose: () => void
}

export function OpenWithModal({ filePaths, onClose }: Props) {
  const [apps, setApps] = useState<App[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    window.fs.listApps().then((list) => {
      if (!cancel) { setApps(list); setLoading(false) }
    }).catch(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return apps
    return apps.filter((a) => a.name.toLowerCase().includes(q))
  }, [apps, query])

  const fileLabel = filePaths.length === 1
    ? filePaths[0].split('/').pop() ?? filePaths[0]
    : `${filePaths.length} items`

  async function open(appPath: string) {
    try { await window.fs.openWith(appPath, filePaths) } catch (e) { alert(`Open failed: ${e}`) }
    onClose()
  }

  async function chooseAndOpen() {
    try { await window.fs.chooseAppAndOpen(filePaths) } catch (e) { alert(`Open failed: ${e}`) }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[440px] max-h-[70vh] flex flex-col bg-background border border-border/60 rounded-xl shadow-window overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <div className="text-[13px] font-semibold text-foreground">Open With…</div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{fileLabel}</div>
        </div>
        <div className="px-3 py-2 border-b border-border/40">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications…"
            className="w-full bg-surface-2 text-foreground text-[12px] px-2.5 py-1.5 rounded-md outline-none border border-border/40 focus:border-primary/60"
          />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && <div className="text-center text-muted-foreground text-[12px] py-8">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-muted-foreground text-[12px] py-8">No matching apps</div>
          )}
          {filtered.map((a) => (
            <button
              key={a.path}
              onClick={() => open(a.path)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-surface-2 text-foreground"
            >
              <span className="truncate">{a.name}</span>
              <span className="ml-auto truncate text-[10.5px] text-muted-foreground">{a.path}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
          <button
            onClick={chooseAndOpen}
            className="text-[12px] px-2.5 py-1 rounded-md bg-surface-2 hover:bg-surface-3 text-foreground border border-border/40"
          >
            Choose Application…
          </button>
          <button
            onClick={onClose}
            className="text-[12px] px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
