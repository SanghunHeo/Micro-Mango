import { useState, useCallback } from 'react'
import { Sparkles, X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useQueueStore, type QueueItem } from '@/stores'
import { GalleryCard } from './GalleryCard'
import { downloadImage } from '@/services/download'
import { cn } from '@/utils/cn'

type FilterType = 'all' | 'generating' | 'completed' | 'error'

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

export function MasonryGallery() {
  const { items } = useQueueStore()
  const [filter, setFilter] = useState<FilterType>('all')
  const [lightboxItem, setLightboxItem] = useState<QueueItem | null>(null)
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0)

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'generating') return item.status === 'generating' || item.status === 'pending'
    return item.status === filter
  })

  // Sort: generating first, then pending, then completed (newest first)
  const sortedItems = [...filteredItems].sort((a, b) => {
    const statusOrder = { generating: 0, pending: 1, completed: 2, error: 3 }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return b.createdAt - a.createdAt
  })

  // Count items by status
  const generatingCount = items.filter((i) => i.status === 'generating' || i.status === 'pending').length
  const completedCount = items.filter((i) => i.status === 'completed').length
  const errorCount = items.filter((i) => i.status === 'error').length

  // Handle image click for lightbox
  const handleImageClick = useCallback((item: QueueItem, imageIndex: number) => {
    setLightboxItem(item)
    setLightboxImageIndex(imageIndex)
  }, [])

  // Lightbox navigation
  const lightboxImages = lightboxItem ? getFinalImages(lightboxItem) : []

  const handleLightboxPrev = () => {
    if (lightboxImageIndex > 0) {
      setLightboxImageIndex(lightboxImageIndex - 1)
    }
  }

  const handleLightboxNext = () => {
    if (lightboxImageIndex < lightboxImages.length - 1) {
      setLightboxImageIndex(lightboxImageIndex + 1)
    }
  }

  const handleLightboxDownload = () => {
    if (!lightboxItem || !lightboxImages[lightboxImageIndex]) return
    downloadImage({
      imageBase64: lightboxImages[lightboxImageIndex],
      metadata: {
        prompt: lightboxItem.prompt,
        resolution: lightboxItem.resolution,
        model: lightboxItem.model,
        aspectRatio: lightboxItem.aspectRatio,
        generationTime: lightboxItem.elapsedTime || 0,
        timestamp: new Date(lightboxItem.completedAt || lightboxItem.createdAt).toISOString(),
      },
    })
  }

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!lightboxItem) return
    if (e.key === 'Escape') {
      setLightboxItem(null)
    } else if (e.key === 'ArrowLeft') {
      handleLightboxPrev()
    } else if (e.key === 'ArrowRight') {
      handleLightboxNext()
    }
  }, [lightboxItem, lightboxImageIndex, lightboxImages.length])

  // Empty state
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
        <Sparkles className="h-20 w-20 mb-6 text-yellow-400/30" />
        <h2 className="text-2xl font-medium text-gray-300 mb-3">Welcome to Micro Mango</h2>
        <p className="text-center max-w-md text-gray-500 leading-relaxed">
          Enter a prompt above to start generating images.
          <br />
          <span className="text-sm">Drag & drop or paste images as reference.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Filter Tabs */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <FilterTab
            label="All"
            count={items.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          {generatingCount > 0 && (
            <FilterTab
              label="Generating"
              count={generatingCount}
              active={filter === 'generating'}
              onClick={() => setFilter('generating')}
              color="yellow"
            />
          )}
          <FilterTab
            label="Completed"
            count={completedCount}
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
            color="green"
          />
          {errorCount > 0 && (
            <FilterTab
              label="Errors"
              count={errorCount}
              active={filter === 'error'}
              onClick={() => setFilter('error')}
              color="red"
            />
          )}
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {sortedItems.map((item) => (
            <div key={item.id} className="break-inside-avoid">
              <GalleryCard item={item} onImageClick={handleImageClick} />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxItem && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2 mb-2">
              <div className="flex items-center gap-2">
                {lightboxImages.length > 1 && (
                  <span className="text-sm text-gray-400">
                    {lightboxImageIndex + 1} / {lightboxImages.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLightboxDownload}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setLightboxItem(null)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="relative flex-1 flex items-center justify-center">
              {lightboxImages.length > 1 && (
                <>
                  <button
                    onClick={handleLightboxPrev}
                    disabled={lightboxImageIndex === 0}
                    className="absolute left-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleLightboxNext}
                    disabled={lightboxImageIndex === lightboxImages.length - 1}
                    className="absolute right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              <img
                src={getImageSrc(lightboxImages[lightboxImageIndex])}
                alt={lightboxItem.prompt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>

            {/* Prompt */}
            <div className="px-4 py-3 mt-2 bg-gray-900/80 rounded-lg mx-4">
              <p className="text-sm text-gray-300 line-clamp-3">
                {lightboxItem.prompt}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{lightboxItem.resolution}</span>
                <span>•</span>
                <span>{lightboxItem.aspectRatio}</span>
                <span>•</span>
                <span>{lightboxItem.model}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Filter tab component
function FilterTab({
  label,
  count,
  active,
  onClick,
  color = 'gray',
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  color?: 'gray' | 'yellow' | 'green' | 'red'
}) {
  const colorClasses = {
    gray: active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800',
    yellow: active ? 'bg-yellow-500/20 text-yellow-400' : 'text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/10',
    green: active ? 'bg-green-500/20 text-green-400' : 'text-green-400/70 hover:text-green-400 hover:bg-green-500/10',
    red: active ? 'bg-red-500/20 text-red-400' : 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        colorClasses[color]
      )}
    >
      <span>{label}</span>
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded',
        active ? 'bg-white/10' : 'bg-gray-800'
      )}>
        {count}
      </span>
    </button>
  )
}
