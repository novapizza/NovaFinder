import { useEffect, useState } from 'react'
import { formatBytesCoarse } from '../../lib/formatters'

type Usage = { total: number; free: number; used: number }

export function DiskUsage({ label = 'Macintosh HD', path = '/' }: { label?: string; path?: string }) {
  const [usage, setUsage] = useState<Usage | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      window.fs.diskUsage(path)
        .then((u) => { if (!cancelled) setUsage(u) })
        .catch(() => { if (!cancelled) setUsage(null) })
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [path])

  if (!usage || !usage.total) return null
  const pct = Math.min(100, Math.max(0, (usage.used / usage.total) * 100))

  return (
    <div className="rounded-lg border border-border/40 bg-surface-1/60 p-3">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-foreground truncate">{label}</span>
        <span className="text-muted-foreground shrink-0 ml-2">{formatBytesCoarse(usage.free)} free</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(232_90%_65%)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {formatBytesCoarse(usage.used)} of {formatBytesCoarse(usage.total)} used
      </div>
    </div>
  )
}
