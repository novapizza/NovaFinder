import { useEffect, useState } from 'react'
import type { SpecialPaths } from '../../../preload'
import { usePaneStore } from '../../store/paneStore'
import { useTagStore, TAG_COLORS, tagPath, parseTagColor } from '../../store/tagStore'
import { useRecentsStore, RECENTS_PATH } from '../../store/recentsStore'
import { usePinnedStore } from '../../store/pinnedStore'
import { useRecentFoldersStore } from '../../store/recentFoldersStore'
import { smartFolderPath, useSmartFoldersStore } from '../../store/smartFoldersStore'
import { SidebarIcon, SIDEBAR_ACCENT, type SidebarIconName } from './SidebarIcon'
import { DiskUsage } from './DiskUsage'
import { FileIcon } from '../FileIcon'
import { ICloudOffModal } from '../ICloudOffModal'

type Item = { label: string; path: string; icon: SidebarIconName }

const ITEM_BASE = 'flex w-full items-center gap-2.5 rounded-md text-[13px] transition-all text-left font-[500]'
const ITEM_ACTIVE = 'sidebar-active'
const ITEM_IDLE = '[color:#C4CDD6] sidebar-idle-text hover:bg-surface-2'

export function Sidebar() {
  const { activePaneId, panes, navigateTo, setTagFilter } = usePaneStore()
  const currentPath = panes[activePaneId].path
  const tagFilter = panes[activePaneId].tagFilter
  const [paths, setPaths] = useState<SpecialPaths | null>(null)
  const [volumes, setVolumes] = useState<string[]>([])
  const tagMap = useTagStore((s) => s.map)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ RecentFolders: true })
  const hasRecents = useRecentsStore((s) => s.recents.length > 0)
  const { pinned, remove: removePin } = usePinnedStore()
  const recentFolders = useRecentFoldersStore((s) => s.folders)
  const smartFolders = useSmartFoldersStore((s) => s.folders)
  const removeSmart = useSmartFoldersStore((s) => s.remove)
  const [trashPath, setTrashPath] = useState<string>('')
  const [showICloudOff, setShowICloudOff] = useState(false)
  useEffect(() => { window.fs.trashPath().then(setTrashPath) }, [])

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
    { label: 'Desktop',      path: paths.desktop,      icon: 'desktop' },
    { label: 'Documents',    path: paths.documents,    icon: 'documents' },
    { label: 'Downloads',    path: paths.downloads,    icon: 'downloads' },
    { label: 'Movies',       path: paths.movies,       icon: 'movies' },
    { label: 'Music',        path: paths.music,        icon: 'music' },
    { label: 'Pictures',     path: paths.pictures,     icon: 'pictures' },
    { label: homeName,       path: paths.home,         icon: 'home' },
  ]

  type Location = Item & { ejectable?: boolean; ejectJoke?: boolean }
  const locations: Location[] = [
    { label: 'Macintosh HD', path: paths.root,   icon: 'drive', ejectJoke: true },
    ...volumes.map((v) => ({ label: v.split('/').pop() || v, path: v, icon: 'drive' as SidebarIconName, ejectable: true })),
    { label: 'iCloud Drive', path: paths.icloud, icon: 'icloud' },
    ...(trashPath ? [{ label: 'Trash', path: trashPath, icon: 'recents' as SidebarIconName }] : []),
  ]

  const JOKES = [
    "Nice try. Ejecting your boot drive would brick your Mac — and I like you too much for that.",
    "Eject Macintosh HD? Bold move. Sadly, the laws of physics (and macOS) disagree.",
    "If I ejected this, the rest of your computer would file a missing persons report.",
    "That's the drive you live on. Maybe try a coffee break instead?",
    "Sure, let me just yank the floor out from under us. … On second thought, no.",
    "Ejecting the system disk is a one-way trip. Refunds not available.",
    "OK, ejecting now. The moment you close this message, you and I will never see each other again. Sure you want to say goodbye? 👋",
    "Confirmed. Ejecting in 3… 2… psych! I could never do that to you. We're besties. 💙",
    "Eject Macintosh HD? I'd love to, but my therapist says I should stop self-destructing. 🛋️",
    "Beep boop. Self-preservation protocol engaged. Try ejecting something less, you know, alive.",
    "Plot twist: this drive is also where I live. Let's not evict each other today, yeah? 🏠",
  ]

  async function handleEject(volumePath: string) {
    try {
      await window.fs.eject(volumePath)
      // If the active pane is on this volume, retreat to home.
      if (currentPath === volumePath || currentPath.startsWith(volumePath + '/')) {
        navigate(paths!.home)
      }
      setVolumes((vs) => vs.filter((v) => v !== volumePath))
    } catch (err) {
      alert(`Couldn't eject: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function handleEjectJoke() {
    alert(JOKES[Math.floor(Math.random() * JOKES.length)])
  }

  const tagCounts: Record<string, number> = {}
  for (const colors of Object.values(tagMap)) {
    for (const c of colors) tagCounts[c] = (tagCounts[c] ?? 0) + 1
  }
  const hasAnyTags = Object.keys(tagMap).length > 0

  function toggle(key: string) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }))
  }

  const navigate = (p: string) => { setTagFilter(activePaneId, null); navigateTo(activePaneId, p) }
  const navigateLocation = async (item: Item) => {
    // iCloud Drive may not exist if the user hasn't enabled it. Match Finder
    // and surface the sign-in prompt rather than letting readdir ENOENT through.
    if (item.icon === 'icloud') {
      const exists = await window.fs.exists(item.path).catch(() => false)
      if (!exists) { setShowICloudOff(true); return }
    }
    navigate(item.path)
  }
  const activeNav = tagFilter ? '' : currentPath


  return (
    <div className="h-full flex flex-col select-none">
    <div
      className="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
      style={{ padding: '10px 12px 12px 12px' }}
    >

      {/* FAVORITES */}
      <Group title="Favorites" collapsed={!!collapsed.Favorites} onToggle={() => toggle('Favorites')}>
        {hasRecents && (() => {
          const active = activeNav === RECENTS_PATH
          return (
            <button
              onClick={() => navigate(RECENTS_PATH)}
              style={{ padding: '7px 9px' }}
              className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
            >
              <SidebarIcon name="recents" className={`h-[18px] w-[18px] ${active ? '[color:#2177FF]' : SIDEBAR_ACCENT.recents}`} />
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
              style={{ padding: '7px 9px' }}
              className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
            >
              <SidebarIcon name={item.icon} className={`h-[18px] w-[18px] ${active ? '[color:#2177FF]' : SIDEBAR_ACCENT[item.icon]}`} />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          )
        })}
      </Group>

      {/* PINNED */}
      {pinned.length > 0 && (
        <Group title="Pinned" collapsed={!!collapsed.Pinned} onToggle={() => toggle('Pinned')}>
          {pinned.map((item) => {
            const active = activeNav === item.path
            return (
              <div key={item.path} className="group/pin flex items-center">
                <button
                  onClick={() => navigate(item.path)}
                  style={{ padding: '7px 9px' }}
                  className={`${ITEM_BASE} flex-1 ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
                >
                  <SidebarIcon name="pin" className={`h-[18px] w-[18px] ${active ? '[color:#2177FF]' : SIDEBAR_ACCENT.pin}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
                <button
                  onClick={() => removePin(item.path)}
                  className="shrink-0 opacity-0 group-hover/pin:opacity-100 transition-opacity p-1 text-muted-foreground/60 hover:text-foreground rounded"
                  title="Remove pin"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            )
          })}
        </Group>
      )}

      {/* SMART FOLDERS */}
      {smartFolders.length > 0 && (
        <Group title="Smart Folders" collapsed={!!collapsed.SmartFolders} onToggle={() => toggle('SmartFolders')}>
          {smartFolders.map((sf) => {
            const sfPath = smartFolderPath(sf.id)
            const active = activeNav === sfPath
            return (
              <div key={sf.id} className="group/sf flex items-center">
                <button
                  onClick={() => navigate(sfPath)}
                  style={{ padding: '7px 9px' }}
                  className={`${ITEM_BASE} flex-1 ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
                  title={`${sf.mode}: "${sf.query}" in ${sf.scope}`}
                >
                  <svg className={`h-[18px] w-[18px] ${active ? '[color:#2177FF]' : '[color:#7B8794]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                  <span className="flex-1 truncate">{sf.name}</span>
                </button>
                <button
                  onClick={() => removeSmart(sf.id)}
                  className="shrink-0 opacity-0 group-hover/sf:opacity-100 transition-opacity p-1 text-muted-foreground/60 hover:text-foreground rounded"
                  title="Remove smart folder"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            )
          })}
        </Group>
      )}

      {/* RECENT FOLDERS */}
      {recentFolders.length > 0 && (
        <Group title="Recent Folders" collapsed={!!collapsed.RecentFolders} onToggle={() => toggle('RecentFolders')}>
          {recentFolders.map((item) => {
            const active = activeNav === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{ padding: '7px 9px' }}
                className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
              >
                <SidebarIcon name="recent-folder" className={`h-[18px] w-[18px] ${active ? '[color:#2177FF]' : SIDEBAR_ACCENT['recent-folder']}`} />
                <span className="flex-1 truncate">{item.name}</span>
              </button>
            )
          })}
        </Group>
      )}

      {/* LOCATIONS */}
      <Group title="Locations" collapsed={!!collapsed.Locations} onToggle={() => toggle('Locations')}>
        {locations.map((item) => {
          const active = activeNav === item.path
          return (
            <div
              key={item.path}
              className={`group relative flex items-center ${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
              style={{ padding: '7px 9px' }}
            >
              <button onClick={() => navigateLocation(item)} className="flex flex-1 items-center gap-2.5 min-w-0 text-left">
                <SidebarIcon name={item.icon} className={`h-[18px] w-[18px] shrink-0 ${active ? '[color:#2177FF]' : SIDEBAR_ACCENT[item.icon]}`} />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
              {item.ejectable && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEject(item.path) }}
                  title={`Eject ${item.label}`}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-surface-2 text-muted-foreground hover:text-foreground"
                >
                  <EjectIcon />
                </button>
              )}
              {item.ejectJoke && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEjectJoke() }}
                  title="Eject Macintosh HD?"
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-surface-2 text-muted-foreground hover:text-foreground"
                >
                  <EjectIcon />
                </button>
              )}
            </div>
          )
        })}
      </Group>

      {/* TAGS */}
      {hasAnyTags && (
        <Group title="Tags" collapsed={!!collapsed.Tags} onToggle={() => toggle('Tags')}>
          {TAG_COLORS.filter(({ name }) => !!tagCounts[name]).map(({ name, label }) => {
            const active = parseTagColor(currentPath) === name
            return (
              <button
                key={name}
                onClick={() => { setTagFilter(activePaneId, null); navigateTo(activePaneId, tagPath(name)) }}
                style={{ padding: '7px 9px' }}
                className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
              >
                <span
                  className="h-[16px] w-[16px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: `var(--tag-${name})`, boxShadow: 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.25)' }}
                />
                <span className="flex-1 truncate">{label}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{tagCounts[name]}</span>
              </button>
            )
          })}
        </Group>
      )}
    </div>

      {/* Disk usage pinned to bottom */}
      <div className="shrink-0 border-t border-border/40" style={{ padding: '10px 12px' }}>
        <DiskUsage label="Macintosh HD" path={paths.root} />
      </div>
      {showICloudOff && <ICloudOffModal onClose={() => setShowICloudOff(false)} />}
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
        className="flex w-full items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/60 hover:text-foreground transition-colors"
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

function EjectIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4l8 12H4z" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  )
}

function AllTagsIcon() {
  const colors = ['var(--tag-red)', 'var(--tag-green)', 'var(--tag-blue)', 'var(--tag-purple)']
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
      {colors.map((c, i) => {
        const angle = (i / colors.length) * Math.PI * 2 - Math.PI / 2
        const cx = 9 + Math.cos(angle) * 4.5
        const cy = 9 + Math.sin(angle) * 4.5
        return <circle key={i} cx={cx} cy={cy} r={4} fill={c} />
      })}
    </svg>
  )
}
