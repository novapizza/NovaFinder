// Match KeyboardEvents against Electron-style accelerator strings, and record
// new ones from a keypress. Shared canonical format lives in shared/commands.

// The layout-independent token for an event's main key, e.g. "N", "1",
// "Space", "Backspace". Uses e.code for letters/digits so that Option-key
// character composition on macOS (⌥T → "†") doesn't break matching.
function eventToken(e: KeyboardEvent): string | null {
  if (e.code.startsWith('Key')) return e.code.slice(3) // KeyN -> N
  if (e.code.startsWith('Digit')) return e.code.slice(5) // Digit1 -> 1
  switch (e.key) {
    case ' ': return 'Space'
    case 'Backspace': return 'Backspace'
    case 'Delete': return 'Delete'
    case 'Enter': return 'Enter'
    case 'Escape': return 'Escape'
    case 'Tab': return 'Tab'
    case 'ArrowUp': return 'Up'
    case 'ArrowDown': return 'Down'
    case 'ArrowLeft': return 'Left'
    case 'ArrowRight': return 'Right'
  }
  if (/^F\d{1,2}$/.test(e.key)) return e.key
  return null
}

type Wanted = { cmd: boolean; ctrl: boolean; alt: boolean; shift: boolean; key: string }

function parse(accel: string): Wanted | null {
  const w: Wanted = { cmd: false, ctrl: false, alt: false, shift: false, key: '' }
  for (const p of accel.split('+')) {
    switch (p) {
      case 'Cmd': case 'Command': case 'Meta': case 'CmdOrCtrl': w.cmd = true; break
      case 'Ctrl': case 'Control': w.ctrl = true; break
      case 'Alt': case 'Option': w.alt = true; break
      case 'Shift': w.shift = true; break
      default: w.key = p
    }
  }
  return w.key ? w : null
}

/** True when the event exactly matches the accelerator (modifiers and key). */
export function matchesAccel(e: KeyboardEvent, accel: string): boolean {
  if (!accel) return false
  const w = parse(accel)
  if (!w) return false
  if (e.metaKey !== w.cmd || e.ctrlKey !== w.ctrl || e.altKey !== w.alt || e.shiftKey !== w.shift) return false
  const tok = eventToken(e)
  return tok !== null && tok.toLowerCase() === w.key.toLowerCase()
}

/**
 * Build a canonical accelerator string from a keypress, for the Settings
 * recorder. Returns null while only modifiers are held (keep listening).
 */
export function accelFromEvent(e: KeyboardEvent): string | null {
  const tok = eventToken(e)
  if (!tok) return null
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Cmd')
  parts.push(tok)
  return parts.join('+')
}
