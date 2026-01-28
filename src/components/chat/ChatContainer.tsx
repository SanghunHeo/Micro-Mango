import { useRef, useEffect } from 'react'
import { useChatStore, useGenerationStore } from '@/stores'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ProgressPanel } from '@/components/generation/ProgressPanel'
import { downloadImage } from '@/services/download/imageDownloader'
import { Sparkles } from 'lucide-react'

interface ChatContainerProps {
  onGenerate: (prompt: string, images: File[]) => void
}

export function ChatContainer({ onGenerate }: ChatContainerProps) {
  const { messages } = useChatStore()
  const { isGenerating, currentStep, thoughtTexts, interimImages, elapsedTime } = useGenerationStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thoughtTexts, interimImages])

  const handleDownload = (message: typeof messages[0]) => {
    if (message.images && message.images.length > 0 && message.metadata) {
      downloadImage({
        imageBase64: message.images[0],
        metadata: {
          prompt: message.metadata.prompt || message.content,
          resolution: message.metadata.resolution || '4K',
          model: message.metadata.model || 'gemini-3-pro-image-preview',
          aspectRatio: '16:9',
          generationTime: message.metadata.generationTime || 0,
          timestamp: new Date(message.timestamp).toISOString(),
        },
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
            <Sparkles className="h-16 w-16 mb-4 text-yellow-400/50" />
            <h2 className="text-xl font-medium text-gray-400 mb-2">Welcome to Nano Banana</h2>
            <p className="text-center max-w-md">
              Describe the image you want to create, or drop a reference image to get started.
            </p>
          </div>
        ) : (
          <div className="pb-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onDownload={
                  message.type === 'assistant' && message.images?.length
                    ? () => handleDownload(message)
                    : undefined
                }
              />
            ))}

            {/* Progress panel during generation */}
            {isGenerating && (
              <ProgressPanel
                step={currentStep}
                thoughtTexts={thoughtTexts}
                interimImages={interimImages}
                elapsedTime={elapsedTime}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSubmit={onGenerate} disabled={isGenerating} />
    </div>
  )
}
