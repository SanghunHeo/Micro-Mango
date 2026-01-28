import { useState, useEffect, useCallback } from 'react'
import { Download, RotateCcw, Copy, Trash2, AlertCircle, Clock, ImageIcon, X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useQueueStore, useInputStore, type QueueItem } from '@/stores'
import { downloadImage } from '@/services/download'
import { cn } from '@/utils/cn'

interface QueueItemRowProps {
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

// Get all final images (supports both finalImage and finalImages)
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
  // If there's a meaningful status message from the API (not initial messages), use it
  const isInitialMessage = !item.statusMessage ||
    item.statusMessage === 'Generating...' ||
    item.statusMessage === '요청 준비 중...'

  if (!isInitialMessage) {
    return item.statusMessage!
  }

  // Show elapsed time when waiting for server response
  const elapsed = item.elapsedTime ? Math.floor(item.elapsedTime / 1000) : 0
  if (elapsed > 0) {
    return `서버 응답 대기 중... (${elapsed}초)`
  }
  return '요청 준비 중...'
}

export function QueueItemRow({ item }: QueueItemRowProps) {
  const { removeItem, rerunItem, loadItemImages } = useQueueStore()
  const { setPendingPrompt } = useInputStore()
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null)
  const [isHoveringInfo, setIsHoveringInfo] = useState(false)
  const [modalImageIndex, setModalImageIndex] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const finalImages = getFinalImages(item)
  const imageCount = finalImages.length
  const referenceImages = item.referenceImages || []

  // Load images from IndexedDB if not in memory
  useEffect(() => {
    loadItemImages(item.id)
  }, [item.id, loadItemImages])

  // Copy prompt to clipboard
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(item.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy prompt:', err)
    }
  }, [item.prompt])

  // Handle keyboard navigation in modal
  useEffect(() => {
    if (modalImageIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalImageIndex(null)
      } else if (e.key === 'ArrowLeft' && modalImageIndex > 0) {
        setModalImageIndex(modalImageIndex - 1)
      } else if (e.key === 'ArrowRight' && modalImageIndex < referenceImages.length - 1) {
        setModalImageIndex(modalImageIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalImageIndex, referenceImages.length])

  const handleDownload = (imageIndex: number = 0) => {
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

  const handleRerun = async () => {
    await rerunItem(item.id)
  }

  const handleUse = async () => {
    // If reference images not in memory, load from IndexedDB
    let images = item.referenceImages
    if ((!images || images.length === 0) && item.status !== 'pending') {
      await loadItemImages(item.id)
      // Get updated item from store
      images = useQueueStore.getState().items.find((i) => i.id === item.id)?.referenceImages
    }
    setPendingPrompt(item.prompt, images)
  }

  const handleRemove = () => {
    removeItem(item.id)
  }

  // Calculate aspect ratio for placeholder
  const getAspectRatio = () => {
    const [w, h] = item.aspectRatio.split(':').map(Number)
    return w / h
  }

  // Render image grid based on count (1, 2, 3, or 4)
  const renderImageGrid = () => {
    if (item.status === 'completed' && imageCount > 0) {
      return (
        <div className={cn(
          'relative w-full h-full',
          imageCount === 1 && 'grid grid-cols-1',
          imageCount === 2 && 'grid grid-cols-2 gap-0.5',
          imageCount === 3 && 'grid grid-cols-2 gap-0.5',
          imageCount === 4 && 'grid grid-cols-2 grid-rows-2 gap-0.5'
        )}>
          {finalImages.map((image, index) => (
            <div
              key={index}
              className={cn(
                'relative overflow-hidden',
                imageCount === 3 && index === 2 && 'col-span-2'
              )}
              onMouseEnter={() => setHoveredImageIndex(index)}
              onMouseLeave={() => setHoveredImageIndex(null)}
            >
              <img
                src={getImageSrc(image)}
                alt={`${item.prompt} - ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Download button on individual image hover */}
              {hoveredImageIndex === index && (
                <button
                  onClick={() => handleDownload(index)}
                  className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full text-white transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )
    }

    // Generating state
    if (item.status === 'generating') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Interim image if available */}
          {item.interimImages && item.interimImages.length > 0 ? (
            <img
              src={getImageSrc(item.interimImages[item.interimImages.length - 1])}
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
              {getDisplayMessage(item)}
            </span>

            {/* Progress bar */}
            <div className="w-full max-w-[80%] h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${item.progress ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      )
    }

    // Pending state
    if (item.status === 'pending') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-gray-600 border-t-yellow-400 animate-spin mb-2" />
          <span className="text-sm text-gray-500">Queued</span>
        </div>
      )
    }

    // Error state
    if (item.status === 'error') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
          <span className="text-sm text-red-400">Error</span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="group flex bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors">
      {/* Image Section (Left) */}
      <div
        className="relative flex-shrink-0 bg-gray-800 w-48 sm:w-56 md:w-64"
        style={{ aspectRatio: getAspectRatio() }}
      >
        {renderImageGrid()}
      </div>

      {/* Info Section (Right) */}
      <div
        className="flex-1 p-4 flex flex-col min-w-0"
        onMouseEnter={() => setIsHoveringInfo(true)}
        onMouseLeave={() => setIsHoveringInfo(false)}
      >
        {/* Prompt */}
        <div className="flex items-start gap-2 mb-3">
          <p className={cn(
            'flex-1 text-sm text-gray-200',
            item.status === 'completed' ? 'line-clamp-3' : 'line-clamp-2'
          )}>
            {item.prompt}
          </p>
          <button
            onClick={handleCopyPrompt}
            className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-300 transition-colors"
            title="Copy prompt"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded">
            {getProviderName(item.provider)}
          </span>
          <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-400 rounded truncate max-w-[120px]">
            {item.model}
          </span>
          <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
            {item.resolution}
          </span>
          <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
            {item.aspectRatio}
          </span>
          {item.elapsedTime && (
            <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(item.elapsedTime)}
            </span>
          )}
        </div>

        {/* Reference images thumbnails */}
        {referenceImages.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-3 w-3 text-gray-500 flex-shrink-0" />
            <div className="flex gap-1.5">
              {referenceImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setModalImageIndex(index)}
                  className="h-8 w-8 rounded border border-gray-700 hover:border-blue-500 overflow-hidden transition-colors"
                >
                  <img
                    src={getImageSrc(img)}
                    alt={`Reference ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              참조 {referenceImages.length}장
            </span>
          </div>
        )}

        {/* Thought text for generating */}
        {item.status === 'generating' && item.thoughtTexts && item.thoughtTexts.length > 0 && (
          <p className="text-xs text-gray-500 italic line-clamp-2 mb-3">
            "{item.thoughtTexts[item.thoughtTexts.length - 1]}"
          </p>
        )}

        {/* Elapsed time for generating */}
        {item.status === 'generating' && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{formatTime(item.elapsedTime)}</span>
          </div>
        )}

        {/* Error message */}
        {item.status === 'error' && item.error && (
          <p className="text-xs text-red-400 line-clamp-2">
            {item.error}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className={cn(
          'flex gap-2 transition-opacity',
          item.status === 'completed'
            ? isHoveringInfo ? 'opacity-100' : 'opacity-0'
            : 'opacity-100'
        )}>
          {/* Rerun - only for completed */}
          {item.status === 'completed' && (
            <button
              onClick={handleRerun}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 hover:text-white transition-colors"
              title="Rerun with same settings"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Rerun</span>
            </button>
          )}
          {/* Use - always visible */}
          <button
            onClick={handleUse}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 hover:text-white transition-colors"
            title="Copy prompt and images to input"
          >
            <Copy className="h-4 w-4" />
            <span>Use</span>
          </button>
          {/* Trash - always visible */}
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-red-600 rounded text-sm text-gray-300 hover:text-white transition-colors"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
          </button>
        </div>
      </div>

      {/* Reference Image Modal */}
      {modalImageIndex !== null && referenceImages[modalImageIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setModalImageIndex(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setModalImageIndex(null)}
              className="absolute -top-10 right-0 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation buttons */}
            {referenceImages.length > 1 && (
              <>
                <button
                  onClick={() => setModalImageIndex(Math.max(0, modalImageIndex - 1))}
                  disabled={modalImageIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setModalImageIndex(Math.min(referenceImages.length - 1, modalImageIndex + 1))}
                  disabled={modalImageIndex === referenceImages.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={getImageSrc(referenceImages[modalImageIndex])}
              alt={`Reference ${modalImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />

            {/* Image counter */}
            {referenceImages.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-gray-400">
                {modalImageIndex + 1} / {referenceImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
