import { useState, useEffect, useRef, useCallback } from 'react'
import { Header, MainLayout } from '@/components/layout'
import { QueueList } from '@/components/gallery'
import { SettingsPanel } from '@/components/settings'
import { useSettingsStore, useQueueStore, useUsageStore } from '@/stores'
import { getImageProvider } from '@/services/api'
import type { Provider } from '@/utils/constants'
import { downloadImage } from '@/services/download'
import { fileToBase64 } from '@/utils/imageUtils'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(64) // default 64px
  const isProcessingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const { getCurrentApiKey, resolution, aspectRatio, model, currentProvider, autoDownload } = useSettingsStore()
  const {
    items,
    addItem,
    startProcessing,
    updateProgress,
    setStatusMessage,
    updateElapsedTime,
    addThoughtText,
    addInterimImage,
    completeItem,
    failItem,
    getNextPending,
    getCurrentItem,
  } = useQueueStore()
  const { recordGeneration } = useUsageStore()

  // Add new item to queue
  const handleSubmit = useCallback(async (prompt: string, images: File[]) => {
    const apiKey = getCurrentApiKey()
    if (!apiKey) {
      setSettingsOpen(true)
      return
    }

    const referenceImages = images.length > 0
      ? await Promise.all(images.map(fileToBase64))
      : undefined

    addItem({
      prompt,
      referenceImages,
      resolution,
      aspectRatio,
      model,
      provider: currentProvider,
    })
  }, [getCurrentApiKey, resolution, aspectRatio, model, currentProvider, addItem])

  // Process queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return

    const nextItem = getNextPending()
    if (!nextItem) return

    const apiKey = getCurrentApiKey()
    if (!apiKey) return

    isProcessingRef.current = true
    startProcessing(nextItem.id)
    startTimeRef.current = Date.now()

    // Set initial status message
    setStatusMessage(nextItem.id, '요청 준비 중...')

    console.log('[Queue] Processing item:', nextItem.id, {
      prompt: nextItem.prompt.substring(0, 50),
      provider: nextItem.provider,
      model: nextItem.model,
    })

    // Start timer for elapsed time updates
    timerRef.current = window.setInterval(() => {
      updateElapsedTime(nextItem.id)
    }, 100)

    try {
      // Get the correct provider based on queue item
      const provider = getImageProvider(nextItem.provider as Provider)

      await provider.generateImageStream(
        {
          provider: nextItem.provider as Provider,
          model: nextItem.model,
          apiKey,
        },
        {
          prompt: nextItem.prompt,
          referenceImages: nextItem.referenceImages,
          resolution: nextItem.resolution,
          aspectRatio: nextItem.aspectRatio,
        },
        {
          onProgress: (progress, message) => {
            updateProgress(nextItem.id, progress)
            setStatusMessage(nextItem.id, message)
          },
          onThoughtText: (text) => {
            console.log('[Generation] Thought:', text.substring(0, 80))
            addThoughtText(nextItem.id, text)
          },
          onInterimImage: (image) => {
            console.log('[Generation] Interim image received, size:', image.length)
            addInterimImage(nextItem.id, image)
          },
          onFinalImage: (base64) => {
            const elapsedTime = Date.now() - startTimeRef.current
            console.log('[Generation] Final image received, size:', base64.length, 'elapsed:', elapsedTime + 'ms')
            completeItem(nextItem.id, base64, elapsedTime)

            // Record successful generation with model and resolution details
            recordGeneration(nextItem.provider as Provider, true, {
              model: nextItem.model,
              resolution: nextItem.resolution,
            })

            // Auto-download if enabled
            if (autoDownload) {
              downloadImage({
                imageBase64: base64,
                metadata: {
                  prompt: nextItem.prompt,
                  resolution: nextItem.resolution,
                  model: nextItem.model,
                  aspectRatio: nextItem.aspectRatio,
                  generationTime: elapsedTime,
                  timestamp: new Date().toISOString(),
                },
              })
            }
          },
          onError: (error) => {
            console.error('[Generation] Error:', error)
            failItem(nextItem.id, error)
            // Record failed generation (no cost charged for failures)
            recordGeneration(nextItem.provider as Provider, false, {
              model: nextItem.model,
              resolution: nextItem.resolution,
            })
          },
          onComplete: () => {
            console.log('[Generation] Complete')
            // Cleanup
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            isProcessingRef.current = false
          },
        }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Generation] Exception:', errorMessage)
      failItem(nextItem.id, errorMessage)
      // Record failed generation (no cost charged for failures)
      recordGeneration(nextItem.provider as Provider, false, {
        model: nextItem.model,
        resolution: nextItem.resolution,
      })
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      isProcessingRef.current = false
    }
  }, [
    getNextPending,
    getCurrentApiKey,
    startProcessing,
    updateProgress,
    setStatusMessage,
    updateElapsedTime,
    addThoughtText,
    addInterimImage,
    completeItem,
    failItem,
    autoDownload,
    recordGeneration,
  ])

  // Watch for new pending items and process them
  useEffect(() => {
    const currentItem = getCurrentItem()
    if (!currentItem && !isProcessingRef.current) {
      processQueue()
    }
  }, [items, getCurrentItem, processQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  return (
    <>
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onSubmit={handleSubmit}
        disabled={false}
        onHeightChange={setHeaderHeight}
      />
      <MainLayout headerHeight={headerHeight}>
        <QueueList />
      </MainLayout>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default App
