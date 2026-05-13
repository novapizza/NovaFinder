import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

type Props = { filePath: string }

const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS: [typeof rehypeHighlight, { detect: boolean; ignoreMissing: boolean }][] = [
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
]

// Stable components prop so MermaidBlock instances aren't remounted on every render.
const MARKDOWN_COMPONENTS = {
  code({ className, children }: { className?: string; children?: React.ReactNode }) {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    const code = String(children).replace(/\n$/, '')
    if (lang === 'mermaid') return <MermaidBlock code={code} />
    return <code className={className}>{children}</code>
  },
}

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`m-${Math.random().toString(36).slice(2, 10)}`)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        const isDark = document.documentElement.classList.contains('dark')
        mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', securityLevel: 'loose' })
        const { svg } = await mermaid.render(idRef.current, code)
        if (!cancelled) { setSvg(svg); setError(null) }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { cancelled = true }
  }, [code])

  if (error) {
    return <div className="my-3 p-2 rounded border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono">Mermaid error: {error}</div>
  }
  if (!svg) return <div className="my-3 text-xs text-muted-foreground">Rendering diagram…</div>
  return <div className="my-3 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
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
