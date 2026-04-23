import { create } from 'zustand'

type ClipboardStore = {
  files: string[]
  operation: 'cut' | 'copy' | null
  setCut: (paths: string[]) => void
  setCopy: (paths: string[]) => void
  clear: () => void
}

export const useClipboardStore = create<ClipboardStore>((set) => ({
  files: [],
  operation: null,
  setCut: (paths) => set({ files: paths, operation: 'cut' }),
  setCopy: (paths) => set({ files: paths, operation: 'copy' }),
  clear: () => set({ files: [], operation: null }),
}))
