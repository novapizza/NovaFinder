import { useEffect, useRef, useState } from 'react'
import { useTagStore } from './store/tagStore'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Toolbar } from './components/Toolbar'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { FileList } from './components/FileList/FileList'
import { PreviewPanel } from './components/PreviewPanel/PreviewPanel'
import { StatusBar } from './components/StatusBar'
import { GetInfoModal } from './components/GetInfoModal'
import { useKeyboard } from './hooks/useKeyboard'
import { useTheme } from './hooks/useTheme'
import { usePaneStore } from './store/paneStore'
import { useFileOps } from './hooks/useFileOps'
import { PromptModal } from './components/PromptModal'

export default function App() {
  const [showPreview, setShowPreview] = useState(true)
  const [previewFile, setPreviewFile] = useState<{ path: string; ext: string } | null>(null)
  const [globalInfoPath, setGlobalInfoPath] = useState<string | null>(null)
  const reloadFn = useRef<(() => void) | null>(null)
  const newFolderFn = useRef<(() => void) | null>(null)
  const newFileFn = useRef<(() => void) | null>(null)

  const { activePaneId, panes, showHidden, setSelection } = usePaneStore()
  const { } = useFileOps()
  const loadTags = useTagStore((s) => s.load)
  const { theme, mode: themeMode, toggle: toggleTheme } = useTheme()
  useEffect(() => { loadTags() }, [loadTags])

  function handleRefresh() { reloadFn.current?.() }

  async function handleSelectAll() {
    const pane = panes[activePaneId]
    const entries = await window.fs.readdir(pane.path, showHidden)
    setSelection(activePaneId, entries.map((e) => e.path))
  }

  useKeyboard({
    onRefresh: handleRefresh,
    onSelectAll: handleSelectAll,
    onGetInfo: (p) => setGlobalInfoPath(p),
    onNewFolder: () => newFolderFn.current?.(),
    onQuickLook: (p) => {
      if (previewFile?.path === p) {
        setPreviewFile(null)
      } else {
        const ext = p.split('.').pop() ?? ''
        setPreviewFile({ path: p, ext })
        setShowPreview(true)
      }
    },
    onOpenInTerminal: (dirPath) => window.fs.openInTerminal(dirPath),
  })

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden p-[2px] bg-background text-foreground">

      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-window">

        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden min-h-0">
          {/* Sidebar — full height, top drag region covers traffic lights */}
          <Panel defaultSize={18} minSize={12} maxSize={28} className="bg-sidebar border-r border-border/40 flex flex-col">
            <div className="flex-shrink-0 [-webkit-app-region:drag]" style={{ height: 52 }} />
            <div className="flex-1 overflow-hidden min-h-0">
              <Sidebar />
            </div>
          </Panel>
          <PanelResizeHandle className="w-px bg-border/40 hover:bg-primary/60 transition-colors" />

          {/* Main content column: toolbar + file list + preview */}
          <Panel defaultSize={82} minSize={40} className="flex flex-col overflow-hidden">
            <Toolbar
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview((v) => !v)}
              onRefresh={handleRefresh}
              onNewFolder={() => newFolderFn.current?.()}
              onNewFile={() => newFileFn.current?.()}
              theme={theme}
              themeMode={themeMode}
              onToggleTheme={toggleTheme}
            />
            <PanelGroup direction="horizontal" className="flex-1 overflow-hidden min-h-0">
              <Panel defaultSize={60} minSize={25} className="bg-background/40 flex flex-col">
                <TabBar paneId="left" />
                <div className="flex-1 min-h-0">
                  <FileList
                    paneId="left"
                    onPreview={(path, ext) => setPreviewFile({ path, ext })}
                    onClearPreview={() => setPreviewFile(null)}
                    registerReload={(fn) => { reloadFn.current = fn }}
                    registerNewFolder={(fn) => { newFolderFn.current = fn }}
                    registerNewFile={(fn) => { newFileFn.current = fn }}
                  />
                </div>
              </Panel>

              {showPreview && (
                <>
                  <PanelResizeHandle className="w-px bg-border/40 hover:bg-primary/60 transition-colors" />
                  <Panel defaultSize={40} minSize={20} maxSize={60} className="bg-sidebar/80 border-l border-border/40">
                    <PreviewPanel
                      filePath={previewFile?.path ?? null}
                      ext={previewFile?.ext ?? ''}
                    />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
        </PanelGroup>

        <StatusBar />
      </div>

      {globalInfoPath && <GetInfoModal filePath={globalInfoPath} onClose={() => setGlobalInfoPath(null)} />}
      <PromptModal />
    </div>
  )
}
