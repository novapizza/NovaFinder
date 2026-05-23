import { useEffect, useMemo, useState } from 'react'
import { FileIcon } from '../FileIcon'
import { formatSize } from '../../lib/formatters'

type ZipEntry = {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: number
  ext: string
}

type Props = { filePath: string }

// Tree node for the collapsible view. We synthesize folders so users
// can collapse subtrees even if the archive only lists files (some zips
// don't include explicit dir entries).
type TreeNode = {
  name: string
  path: string
  isDirectory: boolean
  size: number
  children: Map<string, TreeNode>
}

function buildTree(entries: ZipEntry[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isDirectory: true, size: 0, children: new Map() }
  for (const e of entries) {
    const parts = e.path.split('/').filter(Boolean)
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const isDir = isLast ? e.isDirectory : true
      let child = node.children.get(part)
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/') + (isDir ? '/' : ''),
          isDirectory: isDir,
          size: isLast && !isDir ? e.size : 0,
          children: new Map(),
        }
        node.children.set(part, child)
      } else if (isLast && !e.isDirectory) {
        child.size = e.size
        child.isDirectory = false
      }
      node = child
    }
  }
  return root
}

function countAndSize(node: TreeNode): { files: number; size: number } {
  let files = 0
  let size = 0
  for (const c of node.children.values()) {
    if (c.isDirectory) {
      const r = countAndSize(c)
      files += r.files
      size += r.size
    } else {
      files++
      size += c.size
    }
  }
  return { files, size }
}

export function ZipPreview({ filePath }: Props) {
  const [entries, setEntries] = useState<ZipEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    setError(null)
    window.fs.listZip(filePath)
      .then((r) => { if (!cancelled) setEntries(r as ZipEntry[]) })
      .catch((e) => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [filePath])

  const tree = useMemo(() => (entries ? buildTree(entries) : null), [entries])
  const stats = useMemo(() => (tree ? countAndSize(tree) : null), [tree])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive text-sm p-6 text-center">
        Couldn't read archive: {error}
      </div>
    )
  }
  if (!entries || !tree) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Reading archive…
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 px-4 py-2 border-b border-border/40 text-[11.5px] text-muted-foreground tabular-nums">
        {stats?.files.toLocaleString()} files · {formatSize(stats?.size ?? 0)} uncompressed
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1.5">
        {Array.from(tree.children.values())
          .sort(compareNode)
          .map((c) => (
            <TreeRow key={c.path} node={c} depth={0} />
          ))}
      </div>
    </div>
  )
}

function compareNode(a: TreeNode, b: TreeNode) {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1)
  const children = useMemo(() => Array.from(node.children.values()).sort(compareNode), [node])

  return (
    <>
      <button
        type="button"
        onClick={() => node.isDirectory && setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1 text-[12.5px] hover:bg-surface-2/60 text-left"
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        <span className="w-3 text-muted-foreground text-[10px] flex-shrink-0">
          {node.isDirectory ? (open ? '▾' : '▸') : ''}
        </span>
        <span className="flex-shrink-0">
          <FileIcon ext={node.isDirectory ? '' : extOf(node.name)} isDirectory={node.isDirectory} size={16} />
        </span>
        <span className="truncate text-foreground">{node.name}</span>
        {!node.isDirectory && (
          <span className="ml-auto text-muted-foreground text-[11px] tabular-nums flex-shrink-0">
            {formatSize(node.size)}
          </span>
        )}
      </button>
      {open && children.map((c) => <TreeRow key={c.path} node={c} depth={depth + 1} />)}
    </>
  )
}

function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}
