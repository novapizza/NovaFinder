import { lazy, Suspense } from 'react'
import { isImageExt, isVideoExt, isPdfExt, isHtmlPreviewExt, isTextExt } from '../../lib/fileIcons'
import { ImagePreview } from './ImagePreview'
import { VideoPreview } from './VideoPreview'
import { TextPreview } from './TextPreview'
import { MetaInfo } from './MetaInfo'

// Heavy preview deps (pdfjs-dist ~37MB, marked, react-markdown, mermaid) load only when first used.
const PdfPreview = lazy(() => import('./PdfPreview').then((m) => ({ default: m.PdfPreview })))
const HtmlPreview = lazy(() => import('./HtmlPreview').then((m) => ({ default: m.HtmlPreview })))
const MarkdownPreview = lazy(() => import('./MarkdownPreview').then((m) => ({ default: m.MarkdownPreview })))

function PreviewLoading() {
  return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
}

function EyeIcon() {
  return <svg className="h-7 w-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
}

function FileIcon() {
  return <svg className="h-6 w-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
}

type Props = {
  filePath: string | null
  ext: string
}

export function PreviewPanel({ filePath, ext }: Props) {
  if (!filePath) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center select-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 ring-1 ring-border/60">
          <EyeIcon />
        </div>
        <p className="text-sm font-medium text-foreground">No selection</p>
        <p className="text-xs text-muted-foreground">Select a file to see a preview</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ paddingTop: 10, paddingLeft: 12, paddingRight: 12 }}>
      {isImageExt(ext) && <ImagePreview filePath={filePath} />}
      {isVideoExt(ext) && <VideoPreview filePath={filePath} />}
      {isPdfExt(ext) && (
        <Suspense fallback={<PreviewLoading />}>
          <PdfPreview filePath={filePath} />
        </Suspense>
      )}
      {ext.toLowerCase() === 'md' && (
        <Suspense fallback={<PreviewLoading />}>
          <MarkdownPreview filePath={filePath} />
        </Suspense>
      )}
      {(ext.toLowerCase() === 'html' || ext.toLowerCase() === 'htm') && (
        <Suspense fallback={<PreviewLoading />}>
          <HtmlPreview filePath={filePath} ext={ext} />
        </Suspense>
      )}
      {isTextExt(ext) && !isImageExt(ext) && !isVideoExt(ext) && !isPdfExt(ext) && !isHtmlPreviewExt(ext) && (
        <TextPreview filePath={filePath} />
      )}
      {!isImageExt(ext) && !isVideoExt(ext) && !isPdfExt(ext) && !isHtmlPreviewExt(ext) && !isTextExt(ext) && (
        <div className="flex flex-col flex-1 items-center justify-center gap-2 text-muted-foreground text-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border/60">
            <FileIcon />
          </div>
          <span>No preview available</span>
        </div>
      )}
      <MetaInfo filePath={filePath} />
    </div>
  )
}
