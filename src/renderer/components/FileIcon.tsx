import { getIconForFile, type IconName } from '../lib/fileIcons'

type Props = {
  ext: string
  isDirectory: boolean
  size?: number
}

export function FileIcon({ ext, isDirectory, size = 18 }: Props) {
  const kind = getIconForFile(ext, isDirectory)
  const Component = ICONS[kind] ?? Document
  return <Component size={size} ext={ext} />
}

type IconProps = { size: number; ext?: string }

const ICONS: Record<IconName, (p: IconProps) => JSX.Element> = {
  folder: Folder,
  image: Image,
  video: Video,
  music: Music,
  'file-text': Document,
  'file-code': Code,
  archive: Archive,
  'file-spreadsheet': Spreadsheet,
  presentation: Presentation,
  'file-pdf': Pdf,
  file: Document,
}

function Folder({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ndFolderTab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--folder-tab-top)" />
          <stop offset="1" stopColor="var(--folder-tab-bot)" />
        </linearGradient>
        <linearGradient id="ndFolderBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--folder-body-top)" />
          <stop offset="0.45" stopColor="var(--folder-body-mid)" />
          <stop offset="1" stopColor="var(--folder-body-bot)" />
        </linearGradient>
      </defs>
      {/* back tab */}
      <path
        d="M3 7.5a2 2 0 0 1 2-2h7.5l2.2 2.2h12.3a2 2 0 0 1 2 2v14.3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5z"
        fill="url(#ndFolderTab)"
        stroke="var(--folder-stroke)"
        strokeWidth="0.5"
      />
      {/* front flap */}
      <path
        d="M3 12a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V12z"
        fill="url(#ndFolderBody)"
        stroke="var(--folder-stroke)"
        strokeWidth="0.5"
      />
      {/* subtle top highlight */}
      <path d="M5 10.5h22a2 2 0 0 1 2 2V13H3v-0.5a2 2 0 0 1 2-2z" fill="#ffffff" opacity="0.25" />
    </svg>
  )
}

function Document({ size, ext }: IconProps) {
  const tagColor = '#7F7F7F'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ndDocBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#EDEDED" />
        </linearGradient>
      </defs>
      <path d="M7 3a2 2 0 0 1 2-2h11.5L27 7.5V27a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3z" fill="url(#ndDocBody)" stroke="#BFBFBF" strokeWidth="0.5" />
      <path d="M20.5 1v6H27z" fill="#D4D4D4" />
      <g stroke="#C0C0C0" strokeWidth="1" strokeLinecap="round">
        <line x1="11" y1="14" x2="23" y2="14" />
        <line x1="11" y1="18" x2="23" y2="18" />
        <line x1="11" y1="22" x2="19" y2="22" />
      </g>
      {ext && size >= 32 && (
        <text x="16" y="27.5" textAnchor="middle" fontSize="5" fontWeight="700" fill={tagColor} fontFamily="-apple-system">
          {ext.toUpperCase().slice(0, 4)}
        </text>
      )}
    </svg>
  )
}

function Pdf({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3a2 2 0 0 1 2-2h11.5L27 7.5V27a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3z" fill="#ffffff" stroke="#BFBFBF" strokeWidth="0.5" />
      <path d="M20.5 1v6H27z" fill="#D4D4D4" />
      <rect x="5" y="17" width="22" height="9" rx="1.5" fill="#D93F3C" />
      <text x="16" y="23.5" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#ffffff" fontFamily="-apple-system">PDF</text>
    </svg>
  )
}

function Image({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="26" height="22" rx="2.5" fill="#ffffff" stroke="#BFBFBF" strokeWidth="0.5" />
      <rect x="4.5" y="6.5" width="23" height="19" rx="1.5" fill="#E8F1FB" />
      <circle cx="10.5" cy="12.5" r="2" fill="#F5C447" />
      <path d="M5 22l6-7 5 5 4-3 6 5v3H5z" fill="#5B9A5B" />
    </svg>
  )
}

function Video({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="26" height="20" rx="2" fill="#2E2E33" />
      <g fill="#0B0B0D">
        <rect x="4.5" y="7.5" width="3" height="2.2" rx="0.4" />
        <rect x="4.5" y="11.5" width="3" height="2.2" rx="0.4" />
        <rect x="4.5" y="15.5" width="3" height="2.2" rx="0.4" />
        <rect x="4.5" y="19.5" width="3" height="2.2" rx="0.4" />
        <rect x="24.5" y="7.5" width="3" height="2.2" rx="0.4" />
        <rect x="24.5" y="11.5" width="3" height="2.2" rx="0.4" />
        <rect x="24.5" y="15.5" width="3" height="2.2" rx="0.4" />
        <rect x="24.5" y="19.5" width="3" height="2.2" rx="0.4" />
      </g>
      <rect x="9" y="9.5" width="14" height="13" rx="1" fill="#B8C6D1" />
      <path d="M14 13l5 3-5 3z" fill="#2E2E33" />
    </svg>
  )
}

function Music({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12.5" fill="#F5637A" />
      <circle cx="16" cy="16" r="12.5" fill="url(#ndMusicGrad)" />
      <defs>
        <radialGradient id="ndMusicGrad" cx="0.3" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#FE9BA9" />
          <stop offset="1" stopColor="#E14660" />
        </radialGradient>
      </defs>
      <path d="M13 10l9-2v10.5a2.5 2.5 0 1 1-1.5-2.3V11l-6 1.3v7.2a2.5 2.5 0 1 1-1.5-2.3V10z" fill="#ffffff" />
    </svg>
  )
}

function Archive({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v26a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3z" fill="#D9D9D9" stroke="#A8A8A8" strokeWidth="0.5" />
      <g fill="#8A8A8A">
        <rect x="14.5" y="2" width="3" height="2.5" />
        <rect x="14.5" y="6" width="3" height="2.5" />
        <rect x="14.5" y="10" width="3" height="2.5" />
        <rect x="14.5" y="14" width="3" height="2.5" />
      </g>
      <rect x="13" y="19" width="6" height="7" rx="0.8" fill="#6B6B6B" />
      <rect x="14.5" y="21" width="3" height="3" rx="0.4" fill="#BDBDBD" />
    </svg>
  )
}

function Code({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3a2 2 0 0 1 2-2h11.5L27 7.5V27a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3z" fill="#ffffff" stroke="#BFBFBF" strokeWidth="0.5" />
      <path d="M20.5 1v6H27z" fill="#D4D4D4" />
      <g fill="none" stroke="#5282D6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 14l-3 3 3 3" />
        <path d="M21 14l3 3-3 3" />
        <path d="M18 13l-3 8" />
      </g>
    </svg>
  )
}

function Spreadsheet({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3a2 2 0 0 1 2-2h11.5L27 7.5V27a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3z" fill="#ffffff" stroke="#BFBFBF" strokeWidth="0.5" />
      <path d="M20.5 1v6H27z" fill="#D4D4D4" />
      <g stroke="#1F7A4C" strokeWidth="0.8" fill="#E7F5ED">
        <rect x="9.5" y="12" width="5" height="4" />
        <rect x="14.5" y="12" width="5" height="4" />
        <rect x="19.5" y="12" width="5" height="4" />
        <rect x="9.5" y="16" width="5" height="4" />
        <rect x="14.5" y="16" width="5" height="4" />
        <rect x="19.5" y="16" width="5" height="4" />
        <rect x="9.5" y="20" width="5" height="4" />
        <rect x="14.5" y="20" width="5" height="4" />
        <rect x="19.5" y="20" width="5" height="4" />
      </g>
    </svg>
  )
}

function Presentation({ size }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="5" width="24" height="18" rx="1.5" fill="#F39C4C" />
      <rect x="5.5" y="6.5" width="21" height="15" rx="0.8" fill="#ffffff" />
      <rect x="7.5" y="9" width="17" height="2" rx="0.4" fill="#F39C4C" />
      <rect x="7.5" y="13" width="10" height="1.5" rx="0.3" fill="#B8B8B8" />
      <rect x="7.5" y="16" width="13" height="1.5" rx="0.3" fill="#B8B8B8" />
      <rect x="13" y="24" width="6" height="1.5" rx="0.3" fill="#6B6B6B" />
      <rect x="15" y="25.5" width="2" height="3" fill="#6B6B6B" />
    </svg>
  )
}
