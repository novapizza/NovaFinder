import { novaFileUrl } from '../../lib/formatters'

type Props = { filePath: string }

export function VideoPreview({ filePath }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
      <video
        key={filePath}
        src={novaFileUrl(filePath)}
        controls
        className="max-w-full max-h-full rounded"
      />
    </div>
  )
}
