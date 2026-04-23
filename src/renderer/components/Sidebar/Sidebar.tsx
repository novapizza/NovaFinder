import { useEffect, useState } from 'react'
import type { SpecialPaths } from '../../../preload'
import { usePaneStore } from '../../store/paneStore'
import { useTagStore, TAG_COLORS } from '../../store/tagStore'
import { useRecentsStore, RECENTS_PATH } from '../../store/recentsStore'
import { SidebarIcon, type SidebarIconName } from './SidebarIcon'
import { FileIcon } from '../FileIcon'

type Item = { label: string; path: string; icon: SidebarIconName }

const ITEM_BASE = 'flex w-full items-center gap-2.5 rounded-md text-[13px] transition-all text-left'
const ITEM_ACTIVE = 'sidebar-active shadow-sm'
const ITEM_IDLE = 'text-foreground/85 hover:bg-surface-2'

export function Sidebar() {
  const { activePaneId, panes, navigateTo, setTagFilter } = usePaneStore()
  const currentPath = panes[activePaneId].path
  const tagFilter = panes[activePaneId].tagFilter
  const [paths, setPaths] = useState<SpecialPaths | null>(null)
  const [volumes, setVolumes] = useState<string[]>([])
  const tagMap = useTagStore((s) => s.map)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const hasRecents = useRecentsStore((s) => s.recents.length > 0)

  useEffect(() => { window.fs.specialPaths().then(setPaths) }, [])
  useEffect(() => {
    if (!paths) return
    window.fs.readdirsOnly(paths.volumes)
      .then((entries) => setVolumes(entries.map((e: { path: string }) => e.path)))
      .catch(() => setVolumes([]))
  }, [paths])

  if (!paths) return (
    <div style={{ padding: '20px 14px' }} className="text-xs text-muted-foreground">Loading…</div>
  )

  const homeName = paths.home.split('/').pop() || 'Home'

  const favorites: Item[] = [
    { label: 'Applications', path: paths.applications, icon: 'applications' },
    { label: 'Desktop',      path: paths.desktop,      icon: 'desktop' },
    { label: 'Documents',    path: paths.documents,    icon: 'documents' },
    { label: 'Downloads',    path: paths.downloads,    icon: 'downloads' },
    { label: 'Movies',       path: paths.movies,       icon: 'movies' },
    { label: 'Music',        path: paths.music,        icon: 'music' },
    { label: 'Pictures',     path: paths.pictures,     icon: 'pictures' },
    { label: homeName,       path: paths.home,         icon: 'home' },
  ]

  const locations: Item[] = [
    { label: 'Macintosh HD', path: paths.root,   icon: 'drive' },
    ...volumes.map((v) => ({ label: v.split('/').pop() || v, path: v, icon: 'drive' as SidebarIconName })),
    { label: 'iCloud Drive', path: paths.icloud, icon: 'icloud' },
  ]

  const tagCounts: Record<string, number> = {}
  for (const colors of Object.values(tagMap)) {
    for (const c of colors) tagCounts[c] = (tagCounts[c] ?? 0) + 1
  }
  const hasAnyTags = Object.keys(tagMap).length > 0

  function toggle(key: string) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }))
  }

  const navigate = (p: string) => { setTagFilter(activePaneId, null); navigateTo(activePaneId, p) }
  const activeNav = tagFilter ? '' : currentPath


  return (
    <div
      className="h-full overflow-y-auto select-none scrollbar-thin"
      style={{ padding: '10px 12px 16px 12px' }}
    >

      {/* FAVORITES */}
      <Group title="Favorites" collapsed={!!collapsed.Favorites} onToggle={() => toggle('Favorites')}>
        {hasRecents && (() => {
          const active = activeNav === RECENTS_PATH
          return (
            <button
              onClick={() => navigate(RECENTS_PATH)}
              style={{ padding: '6px 8px' }}
              className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
            >
              <SidebarIcon name="recents" className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-primary'}`} />
              <span className="flex-1 truncate">Recents</span>
            </button>
          )
        })()}
        {favorites.map((item) => {
          const active = activeNav === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{ padding: '6px 8px' }}
              className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
            >
              <SidebarIcon name={item.icon} className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-primary'}`} />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          )
        })}
      </Group>

      {/* LOCATIONS */}
      <Group title="Locations" collapsed={!!collapsed.Locations} onToggle={() => toggle('Locations')}>
        {locations.map((item) => {
          const active = activeNav === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{ padding: '6px 8px' }}
              className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
            >
              <SidebarIcon name={item.icon} className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-primary'}`} />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          )
        })}
      </Group>

      {/* TAGS */}
      {hasAnyTags && (
        <Group title="Tags" collapsed={!!collapsed.Tags} onToggle={() => toggle('Tags')}>
          {TAG_COLORS.filter(({ name }) => !!tagCounts[name]).map(({ name, label }) => {
            const active = tagFilter === name
            return (
              <button
                key={name}
                onClick={() => setTagFilter(activePaneId, tagFilter === name ? null : name)}
                style={{ padding: '6px 8px' }}
                className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
              >
                <span
                  className="h-[14px] w-[14px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: `var(--tag-${name})`, boxShadow: 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.25)' }}
                />
                <span className="flex-1 truncate">{label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setTagFilter(activePaneId, null)}
            style={{ padding: '6px 8px' }}
            className={`${ITEM_BASE} ${ITEM_IDLE}`}
          >
            <AllTagsIcon />
            <span className="flex-1 truncate">All Tags…</span>
          </button>
        </Group>
      )}
    </div>
  )
}

function Group({ title, collapsed, onToggle, action, children }: {
  title: string
  collapsed: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60 hover:text-foreground transition-colors"
        style={{ padding: '2px 4px', marginBottom: 4 }}
      >
        <svg
          className={`h-3 w-3 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        <span className="flex-1 text-left">{title}</span>
        {action}
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function AllTagsIcon() {
  const colors = ['var(--tag-red)', 'var(--tag-green)', 'var(--tag-blue)', 'var(--tag-purple)']
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
      {colors.map((c, i) => {
        const angle = (i / colors.length) * Math.PI * 2 - Math.PI / 2
        const cx = 9 + Math.cos(angle) * 4.5
        const cy = 9 + Math.sin(angle) * 4.5
        return <circle key={i} cx={cx} cy={cy} r={4} fill={c} />
      })}
    </svg>
  )
}
