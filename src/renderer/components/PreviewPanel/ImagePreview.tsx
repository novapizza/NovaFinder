import { novaFileUrl } from '../../lib/formatters'

type Props = { filePath: string }

export function ImagePreview({ filePath }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
      <img
        src={novaFileUrl(filePath)}
        alt=""
        className="max-w-full max-h-full object-contain rounded"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}
