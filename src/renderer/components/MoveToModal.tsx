import { useEffect, useRef, useState } from 'react'
import type { SpecialPaths } from '../../preload'
import { usePinnedStore } from '../store/pinnedStore'

type Props = {
  count: number
  onCancel: () => void
  onMove: (destDir: string) => void
}

export function MoveToModal({ count, onCancel, onMove }: Props) {
  const [paths, setPaths] = useState<SpecialPaths | null>(null)
  const [destInput, setDestInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { pinned } = usePinnedStore()

  useEffect(() => { window.fs.specialPaths().then(setPaths) }, [])
  useEffect(() => { inputRef.current?.focus() }, [])

  async function commit(p: string) {
    setError(null)
    if (!p) { setError('Enter a destination path.'); return }
    try {
      const exists = await window.fs.exists(p)
      if (!exists) { setError('Destination does not exist.'); return }
      const stat = await window.fs.stat(p)
      if (!stat.isDirectory) { setError('Destination is not a folder.'); return }
      onMove(p)
    } catch (e) {
      setError(String(e))
    }
  }

  const shortcuts: { label: string; path: string }[] = paths
    ? [
        { label: 'Desktop', path: paths.desktop },
        { label: 'Documents', path: paths.documents },
        { label: 'Downloads', path: paths.downloads },
        { label: 'Home', path: paths.home },
        ...pinned.map((p) => ({ label: p.label, path: p.path })),
      ]
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-background border border-border/60 rounded-2xl shadow-window w-[480px] max-w-[92vw] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-foreground text-[15px] font-semibold mb-1">Move {count} item{count === 1 ? '' : 's'}</div>
        <div className="text-muted-foreground text-[12px] mb-3">Choose a destination folder.</div>

        <input
          ref={inputRef}
          value={destInput}
          onChange={(e) => setDestInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(destInput.trim())
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="/path/to/folder"
          className="w-full bg-surface-1 text-foreground text-[13px] px-3 py-2 rounded-lg outline-none border border-border/60 focus:border-primary/60 font-mono"
        />

        {error && <div className="text-destructive text-[12px] mt-2">{error}</div>}

        {shortcuts.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-bold mb-2">Shortcuts</div>
            <div className="flex flex-wrap gap-1.5">
              {shortcuts.map((s) => (
                <button
                  key={s.path}
                  onClick={() => commit(s.path)}
                  className="px-2.5 py-1 rounded-md bg-surface-2 hover:bg-surface-3 text-foreground text-[12px] border border-border/40"
                  title={s.path}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground text-[13px] border border-border/40"
          >Cancel</button>
          <button
            onClick={() => commit(destInput.trim())}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-[hsl(232_90%_65%)] text-white text-[13px] hover:brightness-110"
          >Move</button>
        </div>
      </div>
    </div>
  )
}
