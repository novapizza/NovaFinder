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

export function novaFileUrl(filePath: string): string {
  // Use file:// directly; webSecurity: false in BrowserWindow allows this from localhost renderer
  return `file://${filePath}`
}
