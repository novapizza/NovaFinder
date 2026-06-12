import { useState, useEffect } from 'react'

export type GitStatusMap = Record<string, 'M' | 'A' | '?' | 'D' | 'R'>

// Per-directory cache with a short TTL to avoid stale badges. Bounded with a
// simple LRU so browsing many directories in one session can't grow the map
// without limit — Map preserves insertion order, so the oldest key is first.
const cache = new Map<string, { status: GitStatusMap; ts: number }>()
const TTL = 4000
const MAX_ENTRIES = 100

function cacheSet(dirPath: string, status: GitStatusMap) {
  cache.delete(dirPath) // re-insert so this key becomes most-recently-used
  cache.set(dirPath, { status, ts: Date.now() })
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

export function useGitStatus(dirPath: string): GitStatusMap {
  const [status, setStatus] = useState<GitStatusMap>(() => cache.get(dirPath)?.status ?? {})

  useEffect(() => {
    if (!dirPath) return
    const cached = cache.get(dirPath)
    if (cached && Date.now() - cached.ts < TTL) {
      setStatus(cached.status)
      return
    }
    window.fs.gitStatus(dirPath).then((s) => {
      cacheSet(dirPath, s as GitStatusMap)
      setStatus(s as GitStatusMap)
    }).catch(() => setStatus({}))
  }, [dirPath])

  return status
}
