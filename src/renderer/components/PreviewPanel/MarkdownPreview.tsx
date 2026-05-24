import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

type Props = { filePath: string }

const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS: [typeof rehypeHighlight, { detect: boolean; ignoreMissing: boolean }][] = [
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
]

// merslim ships a drop-in `<DiagramRenderer source={code} />` that handles
// parse + layout + SVG. Lazy import so the 1MB+ of diagram code only
// loads when a markdown file actually has a ```mermaid block.
//
// bootstrapDiagramRenderers() has to be called once before any
// DiagramRenderer mounts — otherwise the registry is empty and every
// diagram type fails with "No renderer registered for <type>". We
// fire it on first import so all subsequent mounts find what they need.
const DiagramRenderer = lazy(() =>
  import('merslim').then((m) => {
    m.bootstrapDiagramRenderers?.()
    return { default: m.DiagramRenderer }
  }),
)

// Stable components prop so DiagramBlock instances aren't remounted on every render.
const MARKDOWN_COMPONENTS = {
  code({ className, children }: { className?: string; children?: React.ReactNode }) {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    const code = String(children).replace(/\n$/, '')
    if (lang === 'mermaid') return <DiagramBlock code={code} />
    return <code className={className}>{children}</code>
  },
}

function DiagramBlock({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null)
  const isDark = document.documentElement.classList.contains('dark')

  if (error) {
    return (
      <div className="my-3 p-2 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono">
        Diagram error: {error}
      </div>
    )
  }
  return (
    <div className="my-3 flex justify-center overflow-x-auto">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Rendering diagram…</div>}>
        <DiagramRenderer source={code} dark={isDark} onError={(e) => setError(String(e))} />
      </Suspense>
    </div>
  )
}

export function MarkdownPreview({ filePath }: Props) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setText(null)
    window.fs.readTextFile(filePath)
      .then((t) => setText(t ?? ''))
      .catch(() => setText(null))
      .finally(() => setLoading(false))
  }, [filePath])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreen])

  async function handleCopy() {
    const node = bodyRef.current
    const source = text ?? ''
    try {
      if (node && typeof ClipboardItem !== 'undefined') {
        const html = node.innerHTML
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([source], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(source)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const content = useMemo(() => {
    if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
    if (text === null) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Cannot preview</div>
    return (
      <div ref={bodyRef} className="md-body">
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={MARKDOWN_COMPONENTS}
        >
          {text}
        </ReactMarkdown>
      </div>
    )
  }, [loading, text])

  const toolbar = (
    <div className="flex items-center justify-end gap-1 pb-1 flex-shrink-0">
      <button
        onClick={handleCopy}
        title="Copy as rich HTML + Markdown"
        className="text-[11px] px-2 py-0.5 rounded border border-border/60 bg-surface-2/60 hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button
        onClick={() => setFullscreen((v) => !v)}
        title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
        className="text-[11px] px-2 py-0.5 rounded border border-border/60 bg-surface-2/60 hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {fullscreen ? 'Exit' : 'Fullscreen'}
      </button>
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-background p-5 flex flex-col overflow-hidden">
        {toolbar}
        <div className="flex-1 overflow-auto scrollbar-thin max-w-4xl w-full mx-auto">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {toolbar}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {content}
      </div>
    </div>
  )
}
