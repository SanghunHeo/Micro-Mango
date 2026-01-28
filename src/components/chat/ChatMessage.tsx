import { User, Bot, Download } from 'lucide-react'
import { Button } from '@/components/ui'
import type { ChatMessage as ChatMessageType } from '@/stores'
import { base64ToDataUrl } from '@/utils/imageUtils'
import { cn } from '@/utils/cn'

interface ChatMessageProps {
  message: ChatMessageType
  onDownload?: () => void
}

export function ChatMessage({ message, onDownload }: ChatMessageProps) {
  const isUser = message.type === 'user'
  const isAssistant = message.type === 'assistant'

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'bg-gray-900/50' : 'bg-transparent'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-yellow-400 to-orange-500'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-white">
            {isUser ? 'You' : 'Nano Banana'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Text content */}
        {message.content && (
          <p className="text-gray-300 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="mt-3 space-y-3">
            {message.images.map((image, index) => (
              <div key={index} className="relative inline-block">
                <img
                  src={image.startsWith('data:') ? image : base64ToDataUrl(image)}
                  alt={`Generated ${index + 1}`}
                  className="max-w-full rounded-lg border border-gray-700 shadow-lg"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Metadata & Download */}
        {isAssistant && message.metadata && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex gap-2">
              {message.metadata.resolution && (
                <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                  {message.metadata.resolution}
                </span>
              )}
              {message.metadata.generationTime && (
                <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                  {(message.metadata.generationTime / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            {onDownload && message.images && message.images.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDownload}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
