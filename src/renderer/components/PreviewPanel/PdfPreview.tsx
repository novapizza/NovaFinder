import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type Props = { filePath: string }

export function PdfPreview({ filePath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // Load document when filePath changes
  useEffect(() => {
    setLoading(true)
    setPageNum(1)
    setNumPages(0)
    docRef.current?.destroy()
    docRef.current = null

    window.fs.readBinaryFile(filePath).then((buf) => {
      if (!buf) { setLoading(false); return }
      return pdfjsLib.getDocument({ data: buf }).promise
    }).then((doc) => {
      if (!doc) return
      docRef.current = doc
      setNumPages(doc.numPages)
      setLoading(false)
    }).catch(() => setLoading(false))

    return () => { docRef.current?.destroy(); docRef.current = null }
  }, [filePath])

  // Render a page, scaled to fit the container width
  const renderPage = useCallback(async (num: number) => {
    if (!docRef.current || !canvasRef.current || !containerRef.current) return

    renderTaskRef.current?.cancel()

    const page = await docRef.current.getPage(num)
    const containerW = containerRef.current.clientWidth - 16 // 8px padding each side
    const unscaled = page.getViewport({ scale: 1 })
    const scale = Math.min(containerW / unscaled.width, 2.5) // cap at 2.5x
    const viewport = page.getViewport({ scale })

    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!

    const task = page.render({ canvasContext: ctx, viewport })
    renderTaskRef.current = task
    await task.promise.catch(() => {}) // ignore cancellation
  }, [])

  // Re-render when page changes or after load
  useEffect(() => {
    if (!loading && numPages > 0) renderPage(pageNum)
  }, [pageNum, loading, numPages, renderPage])

  // Re-render on container resize
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (!loading && numPages > 0) renderPage(pageNum)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [loading, numPages, pageNum, renderPage])

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div ref={containerRef} className="flex-1 overflow-y-auto flex flex-col items-center p-2 min-h-0">
        {loading
          ? <div className="text-muted-foreground text-sm mt-8">Loading PDF…</div>
          : <canvas ref={canvasRef} className="rounded-lg shadow-elevated max-w-full" />
        }
      </div>

      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2 border-t border-border/40 text-xs text-muted-foreground flex-shrink-0">
          <button
            onClick={() => setPageNum((n) => Math.max(1, n - 1))}
            disabled={pageNum <= 1}
            className="px-2 py-0.5 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors"
          >‹</button>
          <span>{pageNum} / {numPages}</span>
          <button
            onClick={() => setPageNum((n) => Math.min(numPages, n + 1))}
            disabled={pageNum >= numPages}
            className="px-2 py-0.5 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors"
          >›</button>
        </div>
      )}
    </div>
  )
}
