import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { usePaneStore } from './store/paneStore'
import { useHistoryStore } from './store/historyStore'
import { useSearchStore } from './store/searchStore'

// Minimal test bridge for Playwright e2e. Read-only access to the stores
// plus a navigateTo() helper, so tests don't have to scrape DOM selectors
// to drive the app. Harmless in production — exposes nothing the renderer
// devtools wouldn't already.
;(window as unknown as { __novaTest: unknown }).__novaTest = {
  navigateTo: (paneId: 'left' | 'right', p: string) => usePaneStore.getState().navigateTo(paneId, p),
  getPane: (paneId: 'left' | 'right') => usePaneStore.getState().panes[paneId],
  getHistory: () => ({
    past: useHistoryStore.getState().past,
    future: useHistoryStore.getState().future,
  }),
  getSearch: () => useSearchStore.getState(),
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
