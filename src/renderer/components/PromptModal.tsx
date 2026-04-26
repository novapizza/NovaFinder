import { useEffect, useRef, useState } from 'react'
import { usePromptStore } from '../store/promptStore'

export function PromptModal() {
  const current = usePromptStore((s) => s.current)
  const close = usePromptStore((s) => s.close)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (current) {
      setValue(current.defaultValue ?? '')
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [current])

  if (!current) return null

  function submit() {
    const v = value.trim()
    close(v || null)
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[10000]"
      onClick={() => close(null)}
    >
      <div
        className="bg-[var(--bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-[380px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <div className="text-[14px] font-semibold text-[var(--text)]">{current.title}</div>
          {current.message && (
            <div className="text-[12px] text-[var(--text-muted)] mt-1">{current.message}</div>
          )}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') close(null)
            }}
            className="mt-3 w-full bg-[var(--input-bg)] border border-[var(--border-color)] focus:border-[var(--accent-color)] text-[var(--text)] text-[13px] px-3 py-1.5 rounded-md outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 bg-[var(--header-bg)] border-t border-[var(--border-color)]">
          <button
            onClick={() => close(null)}
            className="px-4 py-1 rounded-md bg-[var(--hover)] text-[var(--text)] text-[12px] hover:bg-[var(--border-color)] min-w-[72px]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-1 rounded-md bg-[var(--accent-color)] text-white text-[12px] hover:brightness-110 min-w-[72px]"
          >
            {current.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
