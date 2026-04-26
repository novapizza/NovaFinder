import {
  Clock, Cloud, Briefcase, Home, FileText, Download, Film,
  Headphones, Camera, HardDrive, Server, Smartphone, Star,
  Folder, FolderOpen, Trash2, Tag, Pin, RotateCcw,
} from 'lucide-react'

export type SidebarIconName =
  | 'recents' | 'shared' | 'airdrop' | 'applications'
  | 'desktop' | 'documents' | 'downloads' | 'movies'
  | 'music' | 'pictures' | 'home' | 'drive' | 'icloud'
  | 'network' | 'iphone' | 'folder' | 'folder-open'
  | 'trash' | 'tag' | 'pin' | 'recent-folder'

const ICON_MAP = {
  recents: Clock,
  shared: Star,
  airdrop: Cloud,
  applications: Briefcase,
  desktop: Home,
  documents: FileText,
  downloads: Download,
  movies: Film,
  music: Headphones,
  pictures: Camera,
  home: Home,
  drive: HardDrive,
  icloud: Cloud,
  network: Server,
  iphone: Smartphone,
  folder: Folder,
  'folder-open': FolderOpen,
  trash: Trash2,
  tag: Tag,
  pin: Pin,
  'recent-folder': RotateCcw,
} as const satisfies Record<SidebarIconName, unknown>

/** Default accent classes mirror the FinderRef design. */
export const SIDEBAR_ACCENT: Record<SidebarIconName, string> = {
  recents: 'text-primary',
  shared: 'text-accent',
  airdrop: 'text-accent',
  applications: 'text-warning',
  desktop: 'text-success',
  documents: 'text-primary',
  downloads: 'text-accent',
  movies: 'text-destructive',
  music: 'text-success',
  pictures: 'text-warning',
  home: 'text-primary',
  drive: 'text-muted-foreground',
  icloud: 'text-primary',
  network: 'text-muted-foreground',
  iphone: 'text-primary',
  folder: 'text-primary',
  'folder-open': 'text-primary',
  trash: 'text-muted-foreground',
  tag: 'text-muted-foreground',
  pin: 'text-primary',
  'recent-folder': 'text-muted-foreground/70',
}

export function SidebarIcon({ name, className }: { name: SidebarIconName; className?: string }) {
  const Icon = ICON_MAP[name]
  return <Icon className={`shrink-0 ${className ?? ''}`} strokeWidth={1.75} />
}
