import { Download, X, AlertCircle, Clock } from 'lucide-react'
import { useQueueStore, type QueueItem } from '@/stores'
import { downloadImage } from '@/services/download'
import { cn } from '@/utils/cn'

interface ImageCardProps {
  item: QueueItem
}

// Format elapsed time
const formatTime = (ms: number | undefined) => {
  if (!ms) return '0.0s'
  return `${(ms / 1000).toFixed(1)}s`
}

// Get provider display name
const getProviderName = (provider: string) => {
  const names: Record<string, string> = {
    google: 'Google',
    openai: 'OpenAI',
    byteplus: 'BytePlus',
  }
  return names[provider] || provider
}

export function ImageCard({ item }: ImageCardProps) {
  const { removeItem } = useQueueStore()

  const handleDownload = () => {
    if (!item.finalImage) return
    downloadImage({
      imageBase64: item.finalImage,
      metadata: {
        prompt: item.prompt,
        resolution: item.resolution,
        model: item.model,
        aspectRatio: item.aspectRatio,
        generationTime: item.elapsedTime || 0,
        timestamp: new Date(item.completedAt || item.createdAt).toISOString(),
      },
    })
  }

  const handleRemove = () => {
    removeItem(item.id)
  }

  // Calculate aspect ratio for placeholder
  const getAspectRatio = () => {
    const [w, h] = item.aspectRatio.split(':').map(Number)
    return w / h
  }

  return (
    <div className="group relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors">
      {/* Image or Placeholder */}
      <div
        className="relative w-full bg-gray-800"
        style={{ aspectRatio: getAspectRatio() }}
      >
        {item.status === 'completed' && item.finalImage ? (
          <img
            src={item.finalImage.startsWith('data:') ? item.finalImage : `data:image/png;base64,${item.finalImage}`}
            alt={item.prompt}
            className="w-full h-full object-cover"
          />
        ) : item.status === 'generating' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Interim image if available */}
            {item.interimImages && item.interimImages.length > 0 ? (
              <img
                src={item.interimImages[item.interimImages.length - 1].startsWith('data:')
                  ? item.interimImages[item.interimImages.length - 1]
                  : `data:image/png;base64,${item.interimImages[item.interimImages.length - 1]}`}
                alt="Generating..."
                className="w-full h-full object-cover opacity-40"
              />
            ) : null}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 p-4">
              {/* Progress percentage */}
              <div className="text-3xl font-bold text-white mb-1">
                {item.progress ?? 0}%
              </div>

              {/* Status message */}
              <span className="text-sm text-blue-400 mb-3">
                {item.statusMessage || 'Generating...'}
              </span>

              {/* Progress bar */}
              <div className="w-full max-w-[80%] h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${item.progress ?? 0}%` }}
                />
              </div>

              {/* Thought text */}
              {item.thoughtTexts && item.thoughtTexts.length > 0 && (
                <p className="text-xs text-gray-400 px-2 text-center line-clamp-2 mb-2">
                  "{item.thoughtTexts[item.thoughtTexts.length - 1]}"
                </p>
              )}

              {/* Elapsed time */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatTime(item.elapsedTime)}</span>
              </div>
            </div>
          </div>
        ) : item.status === 'pending' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-gray-600 border-t-yellow-400 animate-spin mb-2" />
            <span className="text-sm text-gray-500">Queued</span>
          </div>
        ) : item.status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
            <span className="text-sm text-red-400">Error</span>
            <p className="text-xs text-gray-500 mt-1 px-4 text-center line-clamp-2">
              {item.error}
            </p>
          </div>
        ) : null}

        {/* Hover overlay for completed images */}
        {item.status === 'completed' && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
            <div className="flex-1">
              <p className="text-white text-sm line-clamp-2">{item.prompt}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs text-gray-400">{item.resolution}</span>
                <span className="text-xs text-gray-400">{item.aspectRatio}</span>
                {item.elapsedTime && (
                  <span className="text-xs text-gray-400">{(item.elapsedTime / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={cn(
        'absolute top-2 right-2 flex gap-1',
        item.status === 'completed' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
      )}>
        {item.status === 'completed' && (
          <button
            onClick={handleDownload}
            className="p-1.5 bg-gray-900/80 hover:bg-gray-800 rounded-full text-gray-300 hover:text-white transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleRemove}
          className="p-1.5 bg-gray-900/80 hover:bg-red-600 rounded-full text-gray-300 hover:text-white transition-colors"
          title="Remove"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Prompt preview and badges for non-completed */}
      {item.status !== 'completed' && (
        <div className="p-2 border-t border-gray-800">
          {/* Provider and Model badges */}
          <div className="flex gap-1 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-400 rounded">
              {getProviderName(item.provider)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded truncate max-w-[100px]">
              {item.model}
            </span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-1">{item.prompt}</p>
        </div>
      )}
    </div>
  )
}
