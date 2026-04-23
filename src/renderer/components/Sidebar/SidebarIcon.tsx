export type SidebarIconName =
  | 'recents' | 'shared' | 'airdrop' | 'applications'
  | 'desktop' | 'documents' | 'downloads' | 'movies'
  | 'music' | 'pictures' | 'home' | 'drive' | 'icloud'

export function SidebarIcon({ name, className }: { name: SidebarIconName; className?: string }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'flex-shrink-0 ' + (className ?? ''),
  }

  switch (name) {
    case 'recents':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2" />
        </svg>
      )
    case 'shared':
      return (
        <svg {...common}>
          <path d="M2.5 6a1 1 0 0 1 1-1h3L8 6.5h8.5a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6z" />
          <circle cx="13" cy="10" r="1.5" />
          <path d="M10.5 13.5a2.5 2.5 0 0 1 5 0" />
        </svg>
      )
    case 'airdrop':
      return (
        <svg {...common}>
          <path d="M4 13a8 8 0 0 1 12 0" />
          <path d="M6.5 10.5a5 5 0 0 1 7 0" />
          <path d="M9 8l1 1.5 1-1.5" />
          <path d="M10 9.5V17" />
        </svg>
      )
    case 'applications':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M7 13l3-6 3 6" />
          <path d="M8 11.5h4" />
        </svg>
      )
    case 'desktop':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="16" height="10" rx="1.2" />
          <path d="M7 17h6" />
          <path d="M10 14v3" />
        </svg>
      )
    case 'documents':
      return (
        <svg {...common}>
          <path d="M5 2.5h7l4 4V16.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
          <path d="M12 2.5V6.5h4" />
        </svg>
      )
    case 'downloads':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6.5v6" />
          <path d="M7 10l3 2.5 3-2.5" />
        </svg>
      )
    case 'movies':
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="15" height="10" rx="1" />
          <path d="M5 5v10M8 5v10M12 5v10M15 5v10" />
        </svg>
      )
    case 'music':
      return (
        <svg {...common}>
          <path d="M7 14.5a1.8 1.8 0 1 1-1.8-1.8" />
          <path d="M15 12.5a1.8 1.8 0 1 1-1.8-1.8" />
          <path d="M7 12.5V4.5l8-1.5v8" />
          <path d="M7 6.5l8-1.5" />
        </svg>
      )
    case 'pictures':
      return (
        <svg {...common}>
          <rect x="2.5" y="4" width="15" height="12" rx="1.2" />
          <circle cx="7" cy="8" r="1.2" />
          <path d="M3 14l4-4 3.5 3.5L14 9l3 3.5" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 9.5L10 4l7 5.5" />
          <path d="M5 9v7.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" />
        </svg>
      )
    case 'drive':
      return (
        <svg {...common}>
          <rect x="2" y="5" width="16" height="10" rx="1.5" />
          <circle cx="6" cy="10" r="0.9" fill="currentColor" stroke="none" />
          <path d="M9 10h7" />
        </svg>
      )
    case 'icloud':
      return (
        <svg {...common}>
          <path d="M6 14.5a3.5 3.5 0 0 1-0.3-6.95 4.5 4.5 0 0 1 8.75-1A3.5 3.5 0 0 1 14 14.5H6z" />
        </svg>
      )
  }
}
