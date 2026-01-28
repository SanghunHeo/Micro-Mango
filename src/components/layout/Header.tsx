import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react'
import { useDropzone } from 'react-dropzone'
import { Settings, Sparkles, ChevronDown, Image as ImageIcon, X, History, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useSettingsStore, useInputStore } from '@/stores'
import {
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_RESOLUTIONS,
  PROVIDER_RESOLUTION_LABELS,
  PROVIDER_ASPECT_RATIOS,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGES,
} from '@/utils/constants'
import { cn } from '@/utils/cn'
import { resizeImagesIfNeeded } from '@/utils/imageUtils'
import type { Provider } from '@/utils/constants'

interface AttachedImage {
  id: string
  file: File
  preview: string
}

// Individual image thumbnail with drag-to-replace support
function ImageThumbnail({
  image,
  onRemove,
  onReplace,
}: {
  image: AttachedImage
  onRemove: (id: string) => void
  onReplace: (id: string, file: File) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    )
    if (files.length > 0) {
      onReplace(image.id, files[0])
    }
  }

  return (
    <div
      className={cn(
        'relative group',
        isDragOver && 'ring-2 ring-blue-500 ring-offset-1 ring-offset-gray-900'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <img
        src={image.preview}
        alt="Attached"
        className={cn(
          'h-8 w-8 object-cover rounded border border-gray-700',
          isDragOver && 'opacity-50'
        )}
      />
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] text-blue-400 font-medium">교체</span>
        </div>
      )}
      <button
        onClick={() => onRemove(image.id)}
        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  )
}

interface HeaderProps {
  onOpenSettings: () => void
  onSubmit: (prompt: string, images: File[]) => void
  disabled?: boolean
  onHeightChange?: (height: number) => void
}

export function Header({ onOpenSettings, onSubmit, disabled, onHeightChange }: HeaderProps) {
  const [prompt, setPrompt] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')
  const headerRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  const {
    currentProvider,
    setCurrentProvider,
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
  } = useSettingsStore()
  const { setCurrentText, setCurrentImages, pendingPrompt, clearPendingPrompt, addToHistory, promptHistory, removeFromHistory } = useInputStore()

  // Get provider-specific options
  const providerResolutions = PROVIDER_RESOLUTIONS[currentProvider]
  const providerResolutionLabels = PROVIDER_RESOLUTION_LABELS[currentProvider]
  const providerAspectRatios = PROVIDER_ASPECT_RATIOS[currentProvider]

  // Sync with inputStore for token estimation
  useEffect(() => {
    setCurrentText(prompt)
  }, [prompt, setCurrentText])

  useEffect(() => {
    setCurrentImages(attachedImages.map(img => img.file))
  }, [attachedImages, setCurrentImages])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false)
      }
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Track header height changes
  useEffect(() => {
    if (!headerRef.current || !onHeightChange) return

    const resizeObserver = new ResizeObserver(() => {
      if (headerRef.current) {
        // Use offsetHeight for accurate measurement including padding and border
        onHeightChange(headerRef.current.offsetHeight)
      }
    })

    resizeObserver.observe(headerRef.current)
    // Initial height
    onHeightChange(headerRef.current.offsetHeight)

    return () => resizeObserver.disconnect()
  }, [onHeightChange])

  // Handle pendingPrompt from Use button (QueueItemRow)
  useEffect(() => {
    if (pendingPrompt) {
      setPrompt(pendingPrompt.prompt)

      // Convert base64 reference images to File objects if available
      if (pendingPrompt.referenceImages && pendingPrompt.referenceImages.length > 0) {
        const convertBase64ToFile = async (base64: string, index: number): Promise<File> => {
          const res = await fetch(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`)
          const blob = await res.blob()
          return new File([blob], `reference-${index}.png`, { type: 'image/png' })
        }

        Promise.all(pendingPrompt.referenceImages.map((img, i) => convertBase64ToFile(img, i)))
          .then((files) => {
            const newImages = files.map((file) => ({
              id: crypto.randomUUID(),
              file,
              preview: URL.createObjectURL(file),
            }))
            setAttachedImages(newImages)
          })
          .catch(console.error)
      }

      clearPendingPrompt()
      textareaRef.current?.focus()
    }
  }, [pendingPrompt, clearPendingPrompt])

  // Handle file drop with auto-resize for large images
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Limit by count only - resize will handle large dimensions
    const filesToProcess = acceptedFiles.slice(0, MAX_IMAGES - attachedImages.length)

    if (filesToProcess.length === 0) return

    console.log('[Header] Processing images:', filesToProcess.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`))

    // Show processing UI
    setIsProcessingImages(true)
    setProcessingMessage(`이미지 처리 중... (${filesToProcess.length}장)`)

    try {
      // Resize images if they exceed 4K (this also reduces file size)
      setProcessingMessage('이미지 해상도 조정 중...')
      const resizedFiles = await resizeImagesIfNeeded(filesToProcess)

      console.log('[Header] Resized images:', resizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`))

      const newImages = resizedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }))

      setAttachedImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES))
    } catch (error) {
      console.error('[Header] Failed to process images:', error)
      setProcessingMessage('처리 실패, 원본 사용 중...')
      // Still try to add the original files if resize fails
      const newImages = filesToProcess.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }))
      setAttachedImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES))
    } finally {
      setIsProcessingImages(false)
      setProcessingMessage('')
    }
  }, [attachedImages.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_IMAGE_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    noClick: true,
    noKeyboard: true,
  })

  // Handle paste
  const handlePaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement> | globalThis.ClipboardEvent) => {
    const clipboardData = 'clipboardData' in e ? e.clipboardData : null
    const items = clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    e.preventDefault()
    const files = imageItems
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)
    onDrop(files)
  }, [onDrop])

  useEffect(() => {
    const handler = (e: globalThis.ClipboardEvent) => handlePaste(e)
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [handlePaste])

  // Remove image
  const handleRemoveImage = (id: string) => {
    setAttachedImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image) URL.revokeObjectURL(image.preview)
      return prev.filter((img) => img.id !== id)
    })
  }

  // Replace image (drag-to-replace)
  const handleReplaceImage = async (id: string, file: File) => {
    console.log('[Header] Replacing image:', id, 'with:', file.name)

    setIsProcessingImages(true)
    setProcessingMessage('이미지 교체 중...')

    try {
      const [resizedFile] = await resizeImagesIfNeeded([file])

      setAttachedImages((prev) => {
        const oldImage = prev.find((img) => img.id === id)
        if (oldImage) URL.revokeObjectURL(oldImage.preview)

        return prev.map((img) =>
          img.id === id
            ? {
                id: crypto.randomUUID(),
                file: resizedFile,
                preview: URL.createObjectURL(resizedFile),
              }
            : img
        )
      })
    } catch (error) {
      console.error('[Header] Failed to replace image:', error)
      // Still try with original file
      setAttachedImages((prev) => {
        const oldImage = prev.find((img) => img.id === id)
        if (oldImage) URL.revokeObjectURL(oldImage.preview)

        return prev.map((img) =>
          img.id === id
            ? {
                id: crypto.randomUUID(),
                file,
                preview: URL.createObjectURL(file),
              }
            : img
        )
      })
    } finally {
      setIsProcessingImages(false)
      setProcessingMessage('')
    }
  }

  // Handle submit
  const handleSubmit = () => {
    if (!prompt.trim() && attachedImages.length === 0) return
    if (disabled) return

    // Save to history before submitting
    if (prompt.trim()) {
      addToHistory(prompt.trim())
    }

    onSubmit(prompt.trim(), attachedImages.map((img) => img.file))
    setPrompt('')
    attachedImages.forEach((img) => URL.revokeObjectURL(img.preview))
    setAttachedImages([])
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // Handle history item select
  const handleHistorySelect = (historyPrompt: string) => {
    setPrompt(historyPrompt)
    setHistoryOpen(false)
    // Resize textarea after state update
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        const newHeight = Math.max(40, Math.min(textareaRef.current.scrollHeight, 120))
        textareaRef.current.style.height = `${newHeight}px`
        textareaRef.current.focus()
      }
    })
  }

  // Auto-resize textarea
  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
    // Auto-resize with minimum height
    const textarea = e.target
    textarea.style.height = 'auto'
    const newHeight = Math.max(40, Math.min(textarea.scrollHeight, 120))
    textarea.style.height = `${newHeight}px`
  }

  // Handle keyboard
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    // Shift+Enter allows line break (default behavior)
  }

  return (
    <header
      ref={headerRef}
      {...getRootProps()}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800',
        isDragActive && 'bg-blue-900/20 border-blue-500'
      )}
    >
      <input {...getInputProps()} />

      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <h1 className="text-lg font-bold text-white hidden sm:block">Micro Mango</h1>
          </div>

          {/* Main Input Area */}
          <div className="flex-1 flex items-center gap-2">
            {/* Options Button */}
            <div className="relative" ref={optionsRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOptionsOpen(!optionsOpen)}
                className="flex items-center gap-1 text-gray-300"
              >
                <span className="hidden sm:inline text-xs">
                  {PROVIDER_LABELS[currentProvider].split(' ').pop()}
                </span>
                <span className="text-xs text-gray-500">
                  {resolution} | {aspectRatio}
                </span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', optionsOpen && 'rotate-180')} />
              </Button>

              {/* Options Dropdown */}
              {optionsOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 space-y-4 z-50">
                  {/* Provider */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Provider</label>
                    <select
                      value={currentProvider}
                      onChange={(e) => setCurrentProvider(e.target.value as Provider)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PROVIDERS.map((provider) => (
                        <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Resolution */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Resolution</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {providerResolutions.map((res) => (
                        <option key={res} value={res}>{providerResolutionLabels[res] || res}</option>
                      ))}
                    </select>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Aspect Ratio</label>
                    <div className="grid grid-cols-5 gap-1">
                      {providerAspectRatios.map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={cn(
                            'px-2 py-1 text-xs rounded border transition-colors',
                            aspectRatio === ratio
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attached Images Preview */}
            {attachedImages.length > 0 && (
              <div className="flex gap-1">
                {attachedImages.map((img) => (
                  <ImageThumbnail
                    key={img.id}
                    image={img}
                    onRemove={handleRemoveImage}
                    onReplace={handleReplaceImage}
                  />
                ))}
              </div>
            )}

            {/* Text Input with History */}
            <div className="flex-1 relative" ref={historyRef}>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="What will you imagine?"
                  rows={1}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-4 py-2 pr-20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                  disabled={disabled}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {promptHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(!historyOpen)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        historyOpen ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                      )}
                      title="Prompt history"
                    >
                      <History size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                    disabled={disabled || attachedImages.length >= MAX_IMAGES}
                    title="Attach image"
                  >
                    <ImageIcon size={16} />
                  </button>
                </div>
              </div>

              {/* History Dropdown */}
              {historyOpen && promptHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Recent prompts</span>
                    <span className="text-xs text-gray-500">{promptHistory.length} items</span>
                  </div>
                  {promptHistory.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start gap-2 p-2 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-b-0"
                    >
                      <button
                        className="flex-1 text-left text-sm text-gray-300 hover:text-white line-clamp-2"
                        onClick={() => handleHistorySelect(item.prompt)}
                      >
                        {item.prompt}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromHistory(item.id)
                        }}
                        className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Remove from history"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || (!prompt.trim() && attachedImages.length === 0)}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-semibold rounded-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </Button>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="text-gray-400 hover:text-white flex-shrink-0"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-900/30 border-2 border-dashed border-blue-500 flex items-center justify-center z-10">
          <p className="text-blue-300 font-medium">Drop images here</p>
        </div>
      )}

      {/* Image processing overlay */}
      {isProcessingImages && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20">
          <div className="flex items-center gap-3 bg-gray-800 px-4 py-3 rounded-lg border border-gray-700">
            <div className="h-5 w-5 rounded-full border-2 border-gray-600 border-t-blue-400 animate-spin" />
            <span className="text-sm text-gray-200">{processingMessage}</span>
          </div>
        </div>
      )}
    </header>
  )
}
