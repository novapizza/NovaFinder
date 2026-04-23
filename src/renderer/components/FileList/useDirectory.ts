import { useEffect, useRef, useState } from 'react'

export type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: number
  ext: string
}

export function useDirectory(dirPath: string, showHidden: boolean) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevPath = useRef<string | null>(null)

  async function load(p: string) {
    setLoading(true)
    setError(null)
    try {
      const result = await window.fs.readdir(p, showHidden)
      setEntries(result as FileEntry[])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!dirPath) return
    load(dirPath)
    window.fs.watchStart(dirPath)
    const off = window.fs.onWatchEvent((evt) => {
      if (evt.dirPath === dirPath) load(dirPath)
    })
    return () => {
      if (prevPath.current) window.fs.watchStop(prevPath.current)
      off()
    }
  }, [dirPath, showHidden])

  useEffect(() => { prevPath.current = dirPath }, [dirPath])

  return { entries, loading, error, reload: () => load(dirPath) }
}
