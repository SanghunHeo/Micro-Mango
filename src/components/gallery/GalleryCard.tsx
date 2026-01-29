import { useState, useEffect, useCallback } from 'react'
import { Download, RotateCcw, Copy, Trash2, AlertCircle, Clock, Check, Maximize2 } from 'lucide-react'
import { useQueueStore, useInputStore, type QueueItem } from '@/stores'
import { downloadImage } from '@/services/download'
import { formatTime } from '@/utils/timeUtils'
import { cn } from '@/utils/cn'

interface GalleryCardProps {
  item: QueueItem
  onImageClick?: (item: QueueItem, imageIndex: number) => void
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

// Get provider color
const getProviderColor = (provider: string) => {
  const colors: Record<string, string> = {
    google: 'bg-blue-500/20 text-blue-400',
    openai: 'bg-green-500/20 text-green-400',
    byteplus: 'bg-purple-500/20 text-purple-400',
  }
  return colors[provider] || 'bg-gray-500/20 text-gray-400'
}

// Get all final images
const getFinalImages = (item: QueueItem): string[] => {
  if (item.finalImages && item.finalImages.length > 0) {
    return item.finalImages
  }
  if (item.finalImage) {
    return [item.finalImage]
  }
  return []
}

// Get image src with data URI prefix if needed
const getImageSrc = (image: string) => {
  return image.startsWith('data:') ? image : `data:image/png;base64,${image}`
}

// Get dynamic status message with elapsed time
const getDisplayMessage = (item: QueueItem): string => {
  const isInitialMessage = !item.statusMessage ||
    item.statusMessage === 'Generating...' ||
    item.statusMessage === '요청 준비 중...'

  if (!isInitialMessage) {
    return item.statusMessage!
  }

  const elapsed = item.elapsedTime ? Math.floor(item.elapsedTime / 1000) : 0
  if (elapsed > 0) {
    return `서버 응답 대기 중... (${elapsed}초)`
  }
  return '요청 준비 중...'
}

export function GalleryCard({ item, onImageClick }: GalleryCardProps) {
  const { removeItem, rerunItem, loadItemImages } = useQueueStore()
  const { setPendingPrompt } = useInputStore()
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)

  const finalImages = getFinalImages(item)

  // Load images from IndexedDB if not in memory
  useEffect(() => {
    loadItemImages(item.id)
  }, [item.id, loadItemImages])

  // Copy prompt to clipboard
  const handleCopyPrompt = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(item.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy prompt:', err)
    }
  }, [item.prompt])

  const handleDownload = (e: React.MouseEvent, imageIndex: number = 0) => {
    e.stopPropagation()
    const image = finalImages[imageIndex]
    if (!image) return
    downloadImage({
      imageBase64: image,
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

  const handleRerun = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await rerunItem(item.id)
  }

  const handleUse = async (e: React.MouseEvent) => {
    e.stopPropagation()
    let images = item.referenceImages
    if ((!images || images.length === 0) && item.status !== 'pending') {
      await loadItemImages(item.id)
      images = useQueueStore.getState().items.find((i) => i.id === item.id)?.referenceImages
    }
    setPendingPrompt(item.prompt, images)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeItem(item.id)
  }

  const handleImageClick = () => {
    if (item.status === 'completed' && finalImages.length > 0 && onImageClick) {
      onImageClick(item, 0)
    }
  }

  // Calculate aspect ratio
  const getAspectRatio = () => {
    const [w, h] = item.aspectRatio.split(':').map(Number)
    return w / h
  }

  return (
    <div
      className={cn(
        'group relative bg-gray-900 rounded-xl overflow-hidden border transition-all duration-200',
        'hover:border-gray-600 hover:shadow-xl hover:shadow-black/20',
        item.status === 'error' ? 'border-red-900/50' : 'border-gray-800'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div
        className="relative w-full bg-gray-800 cursor-pointer"
        style={{ aspectRatio: getAspectRatio() }}
        onClick={handleImageClick}
      >
        {/* Completed State */}
        {item.status === 'completed' && finalImages.length > 0 && (
          <>
            <img
              src={getImageSrc(finalImages[0])}
              alt={item.prompt}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Multi-image indicator */}
            {finalImages.length > 1 && (
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white font-medium">
                +{finalImages.length - 1}
              </div>
            )}

            {/* Hover Overlay */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-200',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              {/* Top Actions */}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={(e) => handleDownload(e, 0)}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleImageClick}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                  title="Expand"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm line-clamp-2 mb-2">
                  {item.prompt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', getProviderColor(item.provider))}>
                      {getProviderName(item.provider)}
                    </span>
                    {item.elapsedTime && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.elapsedTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
                      title="Copy prompt"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={handleRerun}
                      className="p-1.5 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
                      title="Rerun"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleRemove}
                      className="p-1.5 hover:bg-red-500/20 rounded text-gray-300 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Generating State */}
        {item.status === 'generating' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {/* Interim image background */}
            {item.interimImages && item.interimImages.length > 0 && (
              <img
                src={getImageSrc(item.interimImages[item.interimImages.length - 1])}
                alt="Generating..."
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}

            <div className="relative z-10 flex flex-col items-center">
              {/* Progress Circle */}
              <div className="relative mb-3">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-700"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={175.9}
                    strokeDashoffset={175.9 - (175.9 * (item.progress ?? 0)) / 100}
                    className="text-yellow-400 transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                  {item.progress ?? 0}%
                </span>
              </div>

              {/* Status message */}
              <span className="text-sm text-yellow-400 text-center">
                {getDisplayMessage(item)}
              </span>

              {/* Thought text */}
              {item.thoughtTexts && item.thoughtTexts.length > 0 && (
                <p className="mt-2 text-xs text-gray-400 text-center line-clamp-2 italic">
                  "{item.thoughtTexts[item.thoughtTexts.length - 1]}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pending State */}
        {item.status === 'pending' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-gray-600 border-t-yellow-400 animate-spin mb-2" />
            <span className="text-sm text-gray-400">Queued</span>
          </div>
        )}

        {/* Error State */}
        {item.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
            <span className="text-sm text-red-400 mb-1">Generation Failed</span>
            <p className="text-xs text-gray-500 text-center line-clamp-2">
              {item.error}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Info Bar (for non-completed states) */}
      {item.status !== 'completed' && (
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-xs px-1.5 py-0.5 rounded', getProviderColor(item.provider))}>
              {getProviderName(item.provider)}
            </span>
            <span className="text-xs text-gray-500 truncate">
              {item.model}
            </span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">
            {item.prompt}
          </p>

          {/* Action buttons for non-completed */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleUse}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 hover:text-white transition-colors"
              title="Use prompt"
            >
              <Copy className="h-3 w-3" />
              <span>Use</span>
            </button>
            <button
              onClick={handleRemove}
              className="flex items-center justify-center gap-1 px-2 py-1 bg-gray-800 hover:bg-red-600 rounded text-xs text-gray-400 hover:text-white transition-colors"
              title="Remove"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
