// Reads file paths from a drop event regardless of whether the drag was
// initiated via our HTML5 payload (in-app legacy) or via the OS-level
// startDrag (everything since that became the default).
export function readDropPaths(e: React.DragEvent): string[] {
  // Preferred: legacy JSON for backwards compat
  const raw = e.dataTransfer.getData('application/x-novafinder-paths')
  if (raw) {
    try { return JSON.parse(raw) as string[] } catch {}
  }
  // Fall back to native files (this is the common case after startDrag).
  const files = Array.from(e.dataTransfer.files)
  if (!files.length) return []
  const paths: string[] = []
  for (const f of files) {
    try {
      const p = window.fs.getPathForFile(f)
      if (p) paths.push(p)
    } catch {}
  }
  return paths
}
