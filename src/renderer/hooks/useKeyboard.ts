import { useEffect } from 'react'
import { usePaneStore } from '../store/paneStore'
import { useFileOps } from './useFileOps'
import { useSearchStore } from '../store/searchStore'
import { useHistoryStore } from '../store/historyStore'

type Options = {
  onRefresh?: () => void
  onSelectAll?: () => void
  onGetInfo?: (p: string) => void
  onNewFolder?: () => void
  onQuickLook?: (p: string) => void
  onOpenInTerminal?: (p: string) => void
}

export function useKeyboard(options: Options = {}) {
  const { activePaneId, panes, navigateBack, navigateForward, navigateUp, toggleHidden, setViewMode, newTab, closeTab, activeTabId, switchTab, tabs } = usePaneStore()
  const { cut, copy, paste, deleteFiles, duplicate, copyPath } = useFileOps(options.onRefresh)
  const focusSearch = useSearchStore((s) => s.focusSearch)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  useEffect(() => {
    function isInput(target: EventTarget | null) {
      if (!target) return false
      const el = target as HTMLElement
      return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
    }

    function handleKey(e: KeyboardEvent) {
      if (isInput(e.target)) return

      const meta = e.metaKey
      const shift = e.shiftKey
      const pane = panes[activePaneId]
      const sel = pane.selection

      if (meta && e.key === 'ArrowLeft') { e.preventDefault(); navigateBack(activePaneId); return }
      if (meta && e.key === 'ArrowRight') { e.preventDefault(); navigateForward(activePaneId); return }
      if (meta && e.key === 'ArrowUp') { e.preventDefault(); navigateUp(activePaneId); return }
      if (e.key === 'Backspace' && !meta) { e.preventDefault(); navigateUp(activePaneId); return }

      if (meta && e.key === 'x' && sel.length) { e.preventDefault(); cut(sel); return }
      if (meta && e.key === 'c' && sel.length) { e.preventDefault(); copy(sel); return }
      if (meta && e.key === 'v') { e.preventDefault(); paste(); return }

      if ((e.key === 'Delete' || (meta && e.key === 'Backspace')) && sel.length) {
        e.preventDefault(); deleteFiles(sel); return
      }

      if (meta && shift && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        redo().then(() => options.onRefresh?.()).catch((err) => alert(`Redo failed: ${err}`))
        return
      }
      if (meta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        undo().then(() => options.onRefresh?.()).catch((err) => alert(`Undo failed: ${err}`))
        return
      }
      if (meta && e.key === 'a') { e.preventDefault(); options.onSelectAll?.(); return }
      if (meta && e.key === 'r') { e.preventDefault(); options.onRefresh?.(); return }
      if (meta && shift && e.key === '.') { e.preventDefault(); toggleHidden(); return }

      // Finder-style extras
      if (meta && e.key === 'd' && sel.length) { e.preventDefault(); duplicate(sel); return }
      if (meta && e.altKey && e.key === 'c' && sel.length) { e.preventDefault(); copyPath(sel); return }
      if (meta && e.key === 'i' && sel.length === 1) { e.preventDefault(); options.onGetInfo?.(sel[0]); return }
      if (meta && shift && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); options.onNewFolder?.(); return }
      if (meta && e.key === 'f') { e.preventDefault(); focusSearch(); return }

      if (meta && e.key === '1') { e.preventDefault(); setViewMode('icon'); return }
      if (meta && e.key === '2') { e.preventDefault(); setViewMode('list'); return }
      if (meta && e.key === '3') { e.preventDefault(); setViewMode('column'); return }
      if (meta && e.key === '4') { e.preventDefault(); setViewMode('gallery'); return }

      if (e.key === ' ' && sel.length === 1) { e.preventDefault(); options.onQuickLook?.(sel[0]); return }
      if (meta && e.altKey && e.key === 't') { e.preventDefault(); options.onOpenInTerminal?.(pane.path); return }
      if (meta && e.key === 't') { e.preventDefault(); newTab(activePaneId); return }
      if (meta && e.key === 'w') {
        e.preventDefault()
        const list = tabs[activePaneId]
        if (list.length > 1) closeTab(activePaneId, activeTabId[activePaneId])
        return
      }
      if (meta && shift && e.key === ']') {
        e.preventDefault()
        const list = tabs[activePaneId]
        const idx = list.findIndex((t) => t.id === activeTabId[activePaneId])
        if (idx >= 0 && idx < list.length - 1) switchTab(activePaneId, list[idx + 1].id)
        return
      }
      if (meta && shift && e.key === '[') {
        e.preventDefault()
        const list = tabs[activePaneId]
        const idx = list.findIndex((t) => t.id === activeTabId[activePaneId])
        if (idx > 0) switchTab(activePaneId, list[idx - 1].id)
        return
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activePaneId, panes, options.onRefresh, options.onSelectAll])
}
