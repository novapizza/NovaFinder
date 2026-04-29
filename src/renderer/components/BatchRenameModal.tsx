import { useEffect, useMemo, useState } from 'react'
import path from 'path-browserify'

type Mode = 'replace' | 'sequence' | 'format'

type Props = {
  paths: string[]
  onClose: () => void
  onDone: () => void
}

function pad(n: number, width: number): string {
  const s = String(n)
  return s.length >= width ? s : '0'.repeat(width - s.length) + s
}

function applyRule(
  name: string,
  index: number,
  rule: { mode: Mode; find: string; replace: string; useRegex: boolean; prefix: string; suffix: string; start: number; width: number; format: string },
): string {
  const ext = path.extname(name)
  const base = path.basename(name, ext)
  if (rule.mode === 'replace') {
    if (!rule.find) return name
    let newBase = base
    try {
      const pattern = rule.useRegex ? new RegExp(rule.find, 'g') : new RegExp(rule.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      newBase = base.replace(pattern, rule.replace)
    } catch {
      return name
    }
    return newBase + ext
  }
  if (rule.mode === 'sequence') {
    return `${rule.prefix}${pad(rule.start + index, rule.width)}${rule.suffix}${ext}`
  }
  // format: tokens {name} {n} {ext}
  return rule.format
    .replace(/\{name\}/g, base)
    .replace(/\{n\}/g, pad(rule.start + index, rule.width))
    .replace(/\{ext\}/g, ext.replace(/^\./, ''))
    + (rule.format.includes('{ext}') ? '' : ext)
}

export function BatchRenameModal({ paths, onClose, onDone }: Props) {
  const [mode, setMode] = useState<Mode>('replace')
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [prefix, setPrefix] = useState('photo-')
  const [suffix, setSuffix] = useState('')
  const [start, setStart] = useState(1)
  const [width, setWidth] = useState(2)
  const [format, setFormat] = useState('{name}-{n}')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const rule = { mode, find, replace, useRegex, prefix, suffix, start, width, format }

  const previews = useMemo(() => {
    return paths.map((p, i) => {
      const name = p.split('/').pop() ?? p
      const next = applyRule(name, i, rule)
      return { path: p, before: name, after: next, changed: next !== name }
    })
  }, [paths, mode, find, replace, useRegex, prefix, suffix, start, width, format])

  const collisions = useMemo(() => {
    const seen = new Map<string, number>()
    const dups = new Set<string>()
    for (const p of previews) {
      const key = (p.path.split('/').slice(0, -1).join('/')) + '/' + p.after
      if (seen.has(key)) dups.add(p.after)
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    return dups
  }, [previews])

  async function apply() {
    setBusy(true)
    const changes = previews.filter((p) => p.changed)
    // Two-phase rename to dodge collisions: rename to a temp name, then to final.
    const stamp = Date.now()
    const temps: { path: string; tempPath: string; finalPath: string; finalName: string }[] = []
    for (let i = 0; i < changes.length; i++) {
      const p = changes[i]
      const dir = p.path.split('/').slice(0, -1).join('/')
      const tempName = `.__novarename_${stamp}_${i}__`
      const tempPath = `${dir}/${tempName}`
      const finalPath = `${dir}/${p.after}`
      try {
        await window.fs.rename(p.path, tempPath)
        temps.push({ path: p.path, tempPath, finalPath, finalName: p.after })
      } catch (e) {
        alert(`Rename failed for ${p.before}: ${e}`)
      }
    }
    for (const t of temps) {
      try { await window.fs.rename(t.tempPath, t.finalPath) }
      catch (e) {
        alert(`Rename to ${t.finalName} failed: ${e}`)
        try { await window.fs.rename(t.tempPath, t.path) } catch {}
      }
    }
    setBusy(false)
    onDone()
    onClose()
  }

  const changedCount = previews.filter((p) => p.changed).length
  const hasCollisions = collisions.size > 0

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div className="w-[560px] max-h-[80vh] flex flex-col bg-background border border-border/60 rounded-xl shadow-window overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <div className="text-[13px] font-semibold text-foreground">Rename {paths.length} {paths.length === 1 ? 'item' : 'items'}</div>
        </div>

        <div className="flex border-b border-border/40 text-[12px]">
          {(['replace', 'sequence', 'format'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                'flex-1 py-2 capitalize transition-colors',
                mode === m ? 'text-foreground bg-surface-2 border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {m === 'replace' ? 'Find & Replace' : m === 'sequence' ? 'Sequence' : 'Format'}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 space-y-2 border-b border-border/40">
          {mode === 'replace' && (
            <>
              <Field label="Find">
                <input value={find} onChange={(e) => setFind(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Replace with">
                <input value={replace} onChange={(e) => setReplace(e.target.value)} className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} />
                Use regular expression
              </label>
            </>
          )}
          {mode === 'sequence' && (
            <>
              <Field label="Prefix">
                <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Suffix">
                <input value={suffix} onChange={(e) => setSuffix(e.target.value)} className={inputCls} />
              </Field>
              <div className="flex gap-3">
                <Field label="Start at">
                  <input type="number" value={start} onChange={(e) => setStart(Number(e.target.value) || 0)} className={inputCls} />
                </Field>
                <Field label="Digits">
                  <input type="number" min={1} max={6} value={width} onChange={(e) => setWidth(Math.max(1, Math.min(6, Number(e.target.value) || 1)))} className={inputCls} />
                </Field>
              </div>
            </>
          )}
          {mode === 'format' && (
            <>
              <Field label="Format">
                <input value={format} onChange={(e) => setFormat(e.target.value)} className={inputCls} />
              </Field>
              <div className="text-[11px] text-muted-foreground">
                Tokens: <code>{'{name}'}</code> original name, <code>{'{n}'}</code> sequence, <code>{'{ext}'}</code> extension
              </div>
              <div className="flex gap-3">
                <Field label="Start at">
                  <input type="number" value={start} onChange={(e) => setStart(Number(e.target.value) || 0)} className={inputCls} />
                </Field>
                <Field label="Digits">
                  <input type="number" min={1} max={6} value={width} onChange={(e) => setWidth(Math.max(1, Math.min(6, Number(e.target.value) || 1)))} className={inputCls} />
                </Field>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-4 py-2 text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold sticky top-0 bg-background border-b border-border/40">Preview</div>
          {previews.map((p) => (
            <div key={p.path} className="px-4 py-1 text-[12px] grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <span className="truncate text-muted-foreground">{p.before}</span>
              <span className="text-muted-foreground">→</span>
              <span className={[
                'truncate',
                !p.changed ? 'text-muted-foreground' :
                collisions.has(p.after) ? 'text-destructive' : 'text-foreground',
              ].join(' ')}>{p.after}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
          <div className="text-[11px] text-muted-foreground">
            {changedCount} of {paths.length} will be renamed
            {hasCollisions && <span className="text-destructive ml-2">· name collisions detected</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="text-[12px] px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground"
            >Cancel</button>
            <button
              onClick={apply}
              disabled={busy || changedCount === 0 || hasCollisions}
              className="text-[12px] px-3 py-1 rounded-md bg-primary text-white disabled:opacity-40"
            >{busy ? 'Renaming…' : 'Rename'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-surface-2 text-foreground text-[12px] px-2 py-1 rounded outline-none border border-border/40 focus:border-primary/60'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-muted-foreground w-[88px] flex-shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
