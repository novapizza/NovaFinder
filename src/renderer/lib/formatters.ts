export function formatSize(bytes: number): string {
  if (bytes === 0) return 'Zero bytes'
  if (bytes === 1) return '1 byte'
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString()} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatDate(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString(undefined, {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Coarse, sidebar-friendly format: always GB or TB, rounded. */
export function formatBytesCoarse(bytes: number): string {
  const TB = 1024 ** 4
  const GB = 1024 ** 3
  if (bytes >= TB) return `${(bytes / TB).toFixed(bytes >= 10 * TB ? 0 : 1)} TB`
  if (bytes >= GB) return `${Math.round(bytes / GB).toLocaleString()} GB`
  const MB = 1024 ** 2
  return `${Math.round(bytes / MB)} MB`
}

export function novaFileUrl(filePath: string): string {
  // Use file:// directly; webSecurity: false in BrowserWindow allows this from localhost renderer
  return `file://${filePath}`
}
