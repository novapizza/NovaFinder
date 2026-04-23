import { useState, useEffect } from 'react'

export type GitStatusMap = Record<string, 'M' | 'A' | '?' | 'D' | 'R'>

// Per-directory cache with a short TTL to avoid stale badges
const cache = new Map<string, { status: GitStatusMap; ts: number }>()
const TTL = 4000

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
      cache.set(dirPath, { status: s as GitStatusMap, ts: Date.now() })
      setStatus(s as GitStatusMap)
    }).catch(() => setStatus({}))
  }, [dirPath])

  return status
}
