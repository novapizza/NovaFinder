import { TAG_COLORS, type TagColor } from '../store/tagStore'

export function TagDots({ colors, size = 8 }: { colors: TagColor[]; size?: number }) {
  if (!colors.length) return null
  return (
    <span className="inline-flex items-center gap-[3px] ml-1.5 flex-shrink-0 align-middle">
      {colors.slice(0, 4).map((c) => {
        const def = TAG_COLORS.find((t) => t.name === c)
        if (!def) return null
        return (
          <span
            key={c}
            style={{ backgroundColor: `var(--tag-${def.name})`, width: size, height: size, boxShadow: 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.25)' }}
            className="rounded-full"
          />
        )
      })}
    </span>
  )
}
