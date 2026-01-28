import { useState, useEffect, useRef } from 'react'
import { Header, MainLayout } from '@/components/layout'
import { ChatContainer } from '@/components/chat'
import { SettingsPanel } from '@/components/settings'
import { useSettingsStore, useGenerationStore, useChatStore } from '@/stores'
import { generateImageStream } from '@/services/api'
import { downloadImage } from '@/services/download'
import { fileToBase64 } from '@/utils/imageUtils'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const timerRef = useRef<number | null>(null)

  const { apiKey, resolution, aspectRatio, model, autoDownload } = useSettingsStore()
  const {
    isGenerating,
    startGeneration,
    addThoughtText,
    addInterimImage,
    setFinalImage,
    updateElapsedTime,
    completeGeneration,
    failGeneration,
    reset,
    metadata,
    finalImage,
    elapsedTime,
  } = useGenerationStore()
  const { addMessage } = useChatStore()

  // Timer for elapsed time
  useEffect(() => {
    if (isGenerating) {
      timerRef.current = window.setInterval(() => {
        updateElapsedTime()
      }, 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isGenerating, updateElapsedTime])

  // Handle generation
  const handleGenerate = async (prompt: string, images: File[]) => {
    if (!apiKey) {
      setSettingsOpen(true)
      return
    }

    // Add user message
    const userImages = await Promise.all(images.map(fileToBase64))
    addMessage({
      type: 'user',
      content: prompt,
      images: userImages.length > 0 ? userImages.map(img => `data:image/png;base64,${img}`) : undefined,
    })

    // Start generation
    startGeneration({
      prompt,
      resolution,
      aspectRatio,
      model,
    })

    try {
      await generateImageStream(
        apiKey,
        {
          prompt,
          referenceImages: userImages.length > 0 ? userImages : undefined,
          resolution,
          aspectRatio,
        },
        {
          onThoughtText: addThoughtText,
          onInterimImage: addInterimImage,
          onFinalImage: (base64) => {
            setFinalImage(base64)
          },
          onError: (error) => {
            failGeneration(error)
            addMessage({
              type: 'assistant',
              content: `Error: ${error}`,
            })
          },
          onComplete: () => {
            completeGeneration()
          },
        }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      failGeneration(errorMessage)
      addMessage({
        type: 'assistant',
        content: `Error: ${errorMessage}`,
      })
    }
  }

  // Handle generation complete - add message and auto-download
  useEffect(() => {
    if (finalImage && metadata && !isGenerating) {
      const generationTime = elapsedTime

      // Add assistant message with generated image
      addMessage({
        type: 'assistant',
        content: 'Here is your generated image:',
        images: [finalImage],
        metadata: {
          resolution: metadata.resolution,
          generationTime,
          model: metadata.model,
          prompt: metadata.prompt,
        },
      })

      // Auto-download if enabled
      if (autoDownload) {
        downloadImage({
          imageBase64: finalImage,
          metadata: {
            prompt: metadata.prompt,
            resolution: metadata.resolution,
            model: metadata.model,
            aspectRatio: metadata.aspectRatio,
            generationTime,
            timestamp: new Date().toISOString(),
          },
        })
      }

      // Reset generation state
      reset()
    }
  }, [finalImage, metadata, isGenerating, elapsedTime, autoDownload, addMessage, reset])

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <MainLayout>
        <ChatContainer onGenerate={handleGenerate} />
      </MainLayout>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default App
