import { create } from 'zustand'

export type PromptRequest = {
  title: string
  message?: string
  defaultValue?: string
  confirmLabel?: string
  resolve: (value: string | null) => void
}

type State = {
  current: PromptRequest | null
  show: (opts: Omit<PromptRequest, 'resolve'>) => Promise<string | null>
  close: (value: string | null) => void
}

export const usePromptStore = create<State>((set, get) => ({
  current: null,
  show: (opts) => new Promise((resolve) => set({ current: { ...opts, resolve } })),
  close: (value) => {
    const cur = get().current
    if (cur) cur.resolve(value)
    set({ current: null })
  },
}))

export const prompt = (opts: Omit<PromptRequest, 'resolve'>) => usePromptStore.getState().show(opts)
