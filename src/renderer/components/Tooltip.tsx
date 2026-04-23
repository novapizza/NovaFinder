import { useRef, useState } from 'react'

type Props = {
  label: string
  children: React.ReactElement
  delay?: number // ms
}

export function Tooltip({ label, children, delay = 150 }: Props) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<number | null>(null)

  function onEnter() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setShow(true), delay)
  }
  function onLeave() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setShow(false)
  }

  return (
    <span className="relative inline-flex" onMouseEnter={onEnter} onMouseLeave={onLeave} onMouseDown={onLeave}>
      {children}
      {show && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 z-[10001] px-2 py-0.5 rounded bg-[#2a2a2a]/95 text-white text-[11px] whitespace-nowrap shadow-lg"
        >
          {label}
        </span>
      )}
    </span>
  )
}
