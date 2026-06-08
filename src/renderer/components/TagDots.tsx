import { type TagColor } from '../store/tagStore'
import { useAllTagDefs } from '../store/settingsStore'

export function TagDots({ colors, size = 8 }: { colors: TagColor[]; size?: number }) {
  const allTagDefs = useAllTagDefs()
  if (!colors.length) return null
  return (
    <span className="inline-flex items-center gap-[3px] ml-1.5 flex-shrink-0 align-middle">
      {colors.slice(0, 4).map((c) => {
        const def = allTagDefs.find((t) => t.name === c)
        const bg = def ? def.hex : `var(--tag-${c})`
        return (
          <span
            key={c}
            style={{ backgroundColor: bg, width: size, height: size, boxShadow: 'inset 0 0 0 0.5px hsl(0 0% 0% / 0.25)' }}
            className="rounded-full"
          />
        )
      })}
    </span>
  )
}
