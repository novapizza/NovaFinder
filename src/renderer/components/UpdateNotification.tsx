import { useEffect, useRef, useState } from 'react'

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }

const TRANSIENT_MS = 4000

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const manualRef = useRef(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer() {
    if (dismissTimer.current !== null) {
      clearTimeout(dismissTimer.current)
      dismissTimer.current = null
    }
  }

  function scheduleTransientDismiss() {
    clearTimer()
    dismissTimer.current = setTimeout(() => {
      setState({ status: 'idle' })
      manualRef.current = false
    }, TRANSIENT_MS)
  }

  useEffect(() => {
    const offCheck = window.fs.onCheckUpdate(() => {
      manualRef.current = true
      window.update.check()
    })

    const offStatus = window.update.onStatus((payload) => {
      const { status } = payload

      if (status === 'downloaded') {
        clearTimer()
        setState({ status: 'downloaded', version: payload['version'] as string })
        manualRef.current = false
        return
      }

      if (!manualRef.current) return

      if (status === 'checking') {
        setState({ status: 'checking' })
        scheduleTransientDismiss()
      } else if (status === 'available') {
        setState({ status: 'available', version: payload['version'] as string })
        scheduleTransientDismiss()
      } else if (status === 'not-available') {
        setState({ status: 'not-available' })
        scheduleTransientDismiss()
      } else if (status === 'downloading') {
        clearTimer()
        setState({ status: 'downloading', percent: payload['percent'] as number })
      } else if (status === 'error') {
        setState({ status: 'error', message: payload['message'] as string })
        scheduleTransientDismiss()
      }
    })

    return () => {
      offCheck()
      offStatus()
      clearTimer()
    }
  }, [])

  if (state.status === 'idle') return null

  function dismiss() {
    clearTimer()
    setState({ status: 'idle' })
    manualRef.current = false
  }

  const isPersistent = state.status === 'downloaded'

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3 shadow-lg text-sm select-none">
      {state.status === 'checking' && (
        <span className="text-foreground/70">Checking for updates…</span>
      )}
      {state.status === 'available' && (
        <span className="text-foreground/70">Update v{state.version} found, downloading…</span>
      )}
      {state.status === 'not-available' && (
        <span className="text-foreground/70">NovaFinder is up to date.</span>
      )}
      {state.status === 'downloading' && (
        <span className="text-foreground/70">Downloading update… {Math.round(state.percent)}%</span>
      )}
      {state.status === 'downloaded' && (
        <>
          <span className="text-foreground">Update v{state.version} ready</span>
          <button
            onClick={() => window.update.install()}
            className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Restart
          </button>
        </>
      )}
      {state.status === 'error' && (
        <span className="text-red-500 max-w-xs truncate">Update error: {state.message}</span>
      )}
      {(!isPersistent || state.status === 'downloaded') && (
        <button
          onClick={dismiss}
          className="ml-1 text-foreground/40 hover:text-foreground/70 transition-colors leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  )
}
