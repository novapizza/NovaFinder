import { useEffect, useState } from 'react'

type Props = { filePath: string }

export function TextPreview({ filePath }: Props) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    window.fs.readTextFile(filePath)
      .then(setText)
      .catch(() => setText(null))
      .finally(() => setLoading(false))
  }, [filePath])

  if (loading) return <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">Loading…</div>
  if (text === null) return <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">Cannot preview</div>

  return (
    <div className="flex-1 overflow-auto p-3">
      <pre className="text-xs text-[var(--text)] font-mono whitespace-pre-wrap break-words leading-5">{text}</pre>
    </div>
  )
}
