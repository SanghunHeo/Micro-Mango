import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import { useDropzone } from 'react-dropzone'
import { Send, Image as ImageIcon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import { ImagePreview, type AttachedImage } from './ImagePreview'
import { useSettingsStore, useInputStore } from '@/stores'
import {
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_RESOLUTIONS,
  PROVIDER_RESOLUTION_LABELS,
  PROVIDER_ASPECT_RATIOS,
  ASPECT_RATIO_LABELS,
  SUPPORTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGES,
} from '@/utils/constants'
import { cn } from '@/utils/cn'
import type { Provider } from '@/utils/constants'

interface ChatInputProps {
  onSubmit: (prompt: string, images: File[]) => void
  disabled?: boolean
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [prompt, setPrompt] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    currentProvider,
    setCurrentProvider,
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
  } = useSettingsStore()
  const { setCurrentText, setCurrentImages } = useInputStore()

  // Get provider-specific options
  const providerResolutions = PROVIDER_RESOLUTIONS[currentProvider]
  const providerResolutionLabels = PROVIDER_RESOLUTION_LABELS[currentProvider]
  const providerAspectRatios = PROVIDER_ASPECT_RATIOS[currentProvider]

  // Sync prompt with inputStore for token estimation
  useEffect(() => {
    setCurrentText(prompt)
  }, [prompt, setCurrentText])

  // Sync images with inputStore for token estimation
  useEffect(() => {
    setCurrentImages(attachedImages.map(img => img.file))
  }, [attachedImages, setCurrentImages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [prompt])

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles
      .filter((file) => file.size <= MAX_FILE_SIZE)
      .slice(0, MAX_IMAGES - attachedImages.length)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }))

    setAttachedImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES))
  }, [attachedImages.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_IMAGE_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    noClick: true,
    noKeyboard: true,
  })

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'))
      if (imageItems.length === 0) return

      e.preventDefault()

      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)

      onDrop(files)
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [onDrop])

  // Remove image
  const handleRemoveImage = (id: string) => {
    setAttachedImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter((img) => img.id !== id)
    })
  }

  // Handle submit
  const handleSubmit = () => {
    if (!prompt.trim() && attachedImages.length === 0) return
    if (disabled) return

    onSubmit(prompt.trim(), attachedImages.map((img) => img.file))
    setPrompt('')

    // Cleanup previews
    attachedImages.forEach((img) => URL.revokeObjectURL(img.preview))
    setAttachedImages([])
  }

  // Handle keyboard
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-t border-gray-800 bg-gray-900/50 p-4',
        isDragActive && 'bg-blue-900/20 border-blue-500'
      )}
    >
      <input {...getInputProps()} />

      {/* Image previews */}
      <ImagePreview images={attachedImages} onRemove={handleRemoveImage} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-900/30 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <p className="text-blue-300 font-medium">Drop images here</p>
        </div>
      )}

      <div className="flex gap-2 items-end flex-wrap">
        {/* Provider selector */}
        <div className="flex-shrink-0">
          <select
            value={currentProvider}
            onChange={(e) => setCurrentProvider(e.target.value as Provider)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
            title="AI 프로바이더 선택"
          >
            {PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>
            ))}
          </select>
        </div>

        {/* Resolution selector */}
        <div className="flex-shrink-0">
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
            title="해상도 선택"
          >
            {providerResolutions.map((res) => (
              <option key={res} value={res}>{providerResolutionLabels[res] || res}</option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio selector */}
        <div className="flex-shrink-0">
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
            title="이미지 비율 선택"
          >
            {providerAspectRatios.map((ratio) => (
              <option key={ratio} value={ratio}>{ASPECT_RATIO_LABELS[ratio] || ratio}</option>
            ))}
          </select>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image you want to generate..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-[200px]"
            rows={1}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
            className="absolute right-2 bottom-2 text-gray-500 hover:text-gray-300 transition-colors"
            disabled={disabled || attachedImages.length >= MAX_IMAGES}
          >
            <ImageIcon size={20} />
          </button>
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={disabled || (!prompt.trim() && attachedImages.length === 0)}
          className="flex-shrink-0"
        >
          {disabled ? (
            <Sparkles className="h-5 w-5 animate-pulse" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      <p className="text-xs text-gray-500 mt-2 text-center">
        Drag & drop images or paste from clipboard (Ctrl+V) | Max {MAX_IMAGES} images
      </p>
    </div>
  )
}
