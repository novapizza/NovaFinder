import { useEffect, useState } from 'react'
import { marked } from 'marked'

type Props = { filePath: string; ext: string }

const IFRAME_STYLES = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: #d4d8e0;
      background: transparent;
      padding: 8px 4px 16px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #f0f2f5;
      font-weight: 600;
      margin: 1.2em 0 0.5em;
      line-height: 1.3;
    }
    h1 { font-size: 1.5em; border-bottom: 1px solid #2a2f3a; padding-bottom: 0.3em; }
    h2 { font-size: 1.25em; border-bottom: 1px solid #2a2f3a; padding-bottom: 0.2em; }
    h3 { font-size: 1.1em; }
    p  { margin: 0.7em 0; }
    a  { color: #4da6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 0.85em;
      background: #1e2330;
      color: #7dd3fc;
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }
    pre {
      background: #1a1f2e;
      border: 1px solid #2a3040;
      border-radius: 8px;
      padding: 12px 14px;
      overflow-x: auto;
      margin: 0.8em 0;
    }
    pre code { background: none; color: #c9d1d9; padding: 0; }
    blockquote {
      border-left: 3px solid #4da6ff;
      margin: 0.8em 0;
      padding: 0.4em 0.8em;
      color: #8b949e;
      background: #1a2030;
      border-radius: 0 6px 6px 0;
    }
    ul, ol { padding-left: 1.5em; margin: 0.6em 0; }
    li { margin: 0.25em 0; }
    hr { border: none; border-top: 1px solid #2a2f3a; margin: 1.2em 0; }
    table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
    th, td { border: 1px solid #2a3040; padding: 6px 10px; text-align: left; }
    th { background: #1e2330; color: #f0f2f5; font-weight: 600; }
    tr:nth-child(even) { background: #181d2a; }
    img { max-width: 100%; border-radius: 6px; }
  </style>
`

export function HtmlPreview({ filePath, ext }: Props) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSrcDoc(null)
    window.fs.readTextFile(filePath)
      .then(async (text) => {
        if (!text) { setSrcDoc(''); return }
        if (ext === 'md') {
          const html = await marked.parse(text)
          setSrcDoc(`<html><head>${IFRAME_STYLES}</head><body>${html}</body></html>`)
        } else {
          // For .html — inject a dark base style on top of whatever the file has
          const hasHtmlTag = /<html/i.test(text)
          if (hasHtmlTag) {
            setSrcDoc(text)
          } else {
            setSrcDoc(`<html><head>${IFRAME_STYLES}</head><body>${text}</body></html>`)
          }
        }
      })
      .catch(() => setSrcDoc(null))
      .finally(() => setLoading(false))
  }, [filePath, ext])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  )
  if (srcDoc === null) return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Cannot preview</div>
  )

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      className="flex-1 w-full border-none bg-transparent"
      style={{ minHeight: 0 }}
    />
  )
}
