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

/** Unselected icon color — dim, subordinate to text */
export const SIDEBAR_ACCENT: Record<SidebarIconName, string> = {
  recents:       '[color:#7B8794]',
  shared:        '[color:#7B8794]',
  airdrop:       '[color:#7B8794]',
  applications:  '[color:#7B8794]',
  desktop:       '[color:#7B8794]',
  documents:     '[color:#7B8794]',
  downloads:     '[color:#7B8794]',
  movies:        '[color:#7B8794]',
  music:         '[color:#7B8794]',
  pictures:      '[color:#7B8794]',
  home:          '[color:#7B8794]',
  drive:         '[color:#7B8794]',
  icloud:        '[color:#7B8794]',
  network:       '[color:#7B8794]',
  iphone:        '[color:#7B8794]',
  folder:        '[color:#7B8794]',
  'folder-open': '[color:#7B8794]',
  trash:         '[color:#7B8794]',
  tag:           '[color:#7B8794]',
  pin:           '[color:#7B8794]',
  'recent-folder': '[color:#7B8794]',
}

export function SidebarIcon({ name, className }: { name: SidebarIconName; className?: string }) {
  const Icon = ICON_MAP[name]
  return <Icon className={`shrink-0 ${className ?? ''}`} strokeWidth={1.75} />
}
