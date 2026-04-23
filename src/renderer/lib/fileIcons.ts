// Maps file extensions to Lucide icon names
export type IconName =
  | 'folder' | 'image' | 'video' | 'music' | 'file-text' | 'file-code'
  | 'archive' | 'file-spreadsheet' | 'presentation' | 'file-pdf' | 'file'

const extMap: Record<string, IconName> = {
  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  svg: 'image', bmp: 'image', tiff: 'image', ico: 'image', heic: 'image',
  // Video
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
  m4v: 'video', wmv: 'video', flv: 'video',
  // Audio
  mp3: 'music', wav: 'music', flac: 'music', aac: 'music', ogg: 'music', m4a: 'music',
  // Documents
  pdf: 'file-pdf',
  doc: 'file-text', docx: 'file-text', odt: 'file-text',
  xls: 'file-spreadsheet', xlsx: 'file-spreadsheet', csv: 'file-spreadsheet',
  ppt: 'presentation', pptx: 'presentation',
  txt: 'file-text', md: 'file-text', rtf: 'file-text',
  // Code
  ts: 'file-code', tsx: 'file-code', js: 'file-code', jsx: 'file-code',
  py: 'file-code', rb: 'file-code', go: 'file-code', rs: 'file-code',
  java: 'file-code', cpp: 'file-code', c: 'file-code', h: 'file-code',
  css: 'file-code', html: 'file-code', json: 'file-code', yaml: 'file-code',
  yml: 'file-code', sh: 'file-code', bash: 'file-code', zsh: 'file-code',
  xml: 'file-code', toml: 'file-code', ini: 'file-code',
  // Archives
  zip: 'archive', tar: 'archive', gz: 'archive', bz2: 'archive', rar: 'archive',
  '7z': 'archive', dmg: 'archive', pkg: 'archive',
}

export function getIconForFile(ext: string, isDirectory: boolean): IconName {
  if (isDirectory) return 'folder'
  return extMap[ext.toLowerCase()] ?? 'file'
}

const IMAGE_EXTS = new Set(['jpg','jpeg','png','gif','webp','svg','bmp','tiff','heic','ico'])
const VIDEO_EXTS = new Set(['mp4','mov','avi','mkv','webm','m4v','wmv'])
const TEXT_EXTS = new Set([
  'txt','md','json','yaml','yml','toml','ini','csv','xml','html','css',
  'ts','tsx','js','jsx','py','rb','go','rs','java','cpp','c','h','sh','bash','zsh','log',
])

export const isImageExt   = (ext: string) => IMAGE_EXTS.has(ext.toLowerCase())
export const isVideoExt   = (ext: string) => VIDEO_EXTS.has(ext.toLowerCase())
export const isPdfExt     = (ext: string) => ext.toLowerCase() === 'pdf'
export const isHtmlPreviewExt = (ext: string) => ['md', 'html', 'htm'].includes(ext.toLowerCase())
export const isTextExt    = (ext: string) => TEXT_EXTS.has(ext.toLowerCase())
