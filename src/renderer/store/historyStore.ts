import { create } from 'zustand'

export type Op =
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'move'; pairs: { src: string; dst: string }[] }
  | { kind: 'copy'; created: string[] }
  | { kind: 'create'; path: string }

type HistoryStore = {
  past: Op[]
  future: Op[]
  push: (op: Op) => void
  undo: () => Promise<Op | null>
  redo: () => Promise<Op | null>
  canUndo: () => boolean
  canRedo: () => boolean
}

const MAX = 50

async function invert(op: Op): Promise<Op | null> {
  if (op.kind === 'rename') {
    await window.fs.rename(op.to, op.from)
    return { kind: 'rename', from: op.to, to: op.from }
  }
  if (op.kind === 'move') {
    const reversed = [...op.pairs].reverse()
    for (const { src, dst } of reversed) {
      try { await window.fs.move(dst, src) } catch (e) { console.warn('undo move failed', e) }
    }
    return { kind: 'move', pairs: op.pairs.map((p) => ({ src: p.dst, dst: p.src })) }
  }
  if (op.kind === 'copy') {
    for (const p of op.created) {
      try { await window.fs.delete(p) } catch (e) { console.warn('undo copy failed', e) }
    }
    return null // re-doing a copy isn't reliable from delete
  }
  if (op.kind === 'create') {
    try { await window.fs.delete(op.path) } catch (e) { console.warn('undo create failed', e) }
    return null
  }
  return null
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  push: (op) => set((s) => ({
    past: [...s.past, op].slice(-MAX),
    future: [],
  })),

  undo: async () => {
    const s = get()
    const op = s.past[s.past.length - 1]
    if (!op) return null
    const inverse = await invert(op)
    set((s2) => ({
      past: s2.past.slice(0, -1),
      future: inverse ? [...s2.future, inverse] : s2.future,
    }))
    return op
  },

  redo: async () => {
    const s = get()
    const op = s.future[s.future.length - 1]
    if (!op) return null
    const inverse = await invert(op)
    set((s2) => ({
      future: s2.future.slice(0, -1),
      past: inverse ? [...s2.past, inverse] : s2.past,
    }))
    return op
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))
