import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react'
import { useDropzone } from 'react-dropzone'
import { Sparkles, Image as ImageIcon, X, History, Trash2, ChevronDown, Settings2, Cpu, Settings } from 'lucide-react'
import { Button } from '@/components/ui'
import { useSettingsStore, useInputStore } from '@/stores'
import {
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  PROVIDER_RESOLUTIONS,
  PROVIDER_RESOLUTION_LABELS,
  PROVIDER_ASPECT_RATIOS,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGES,
} from '@/utils/constants'
import { cn } from '@/utils/cn'
import { resizeImagesIfNeeded } from '@/utils/imageUtils'

interface AttachedImage {
  id: string
  file: File
  preview: string
}

interface PromptAreaProps {
  onSubmit: (prompt: string, images: File[]) => void
  onOpenSettings?: () => void
  disabled?: boolean
}

export function PromptArea({ onSubmit, onOpenSettings, disabled }: PromptAreaProps) {
  const [prompt, setPrompt] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const providerRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  const {
    currentProvider,
    setCurrentProvider,
    model,
    setModel,
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

  // Get provider-specific models
  const providerModels = PROVIDER_MODELS[currentProvider]

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false)
      }
      if (providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setProviderOpen(false)
      }
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    const filesToProcess = acceptedFiles.slice(0, MAX_IMAGES - attachedImages.length)
    if (filesToProcess.length === 0) return

    setIsProcessingImages(true)
    setProcessingMessage(`이미지 처리 중... (${filesToProcess.length}장)`)

    try {
      setProcessingMessage('이미지 해상도 조정 중...')
      const resizedFiles = await resizeImagesIfNeeded(filesToProcess)

      const newImages = resizedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }))

      setAttachedImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES))
    } catch (error) {
      console.error('[PromptArea] Failed to process images:', error)
      setProcessingMessage('처리 실패, 원본 사용 중...')
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
      console.error('[PromptArea] Failed to replace image:', error)
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

    if (prompt.trim()) {
      addToHistory(prompt.trim())
    }

    onSubmit(prompt.trim(), attachedImages.map((img) => img.file))
    setPrompt('')
    attachedImages.forEach((img) => URL.revokeObjectURL(img.preview))
    setAttachedImages([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // Handle history item select
  const handleHistorySelect = (historyPrompt: string) => {
    setPrompt(historyPrompt)
    setHistoryOpen(false)
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        const newHeight = Math.max(80, Math.min(textareaRef.current.scrollHeight, 300))
        textareaRef.current.style.height = `${newHeight}px`
        textareaRef.current.focus()
      }
    })
  }

  // Auto-resize textarea
  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    const newHeight = Math.max(80, Math.min(textarea.scrollHeight, 300))
    textarea.style.height = `${newHeight}px`
  }

  // Handle keyboard
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative bg-gray-900/50 border-b border-gray-800',
        isDragActive && 'bg-blue-900/20 border-blue-500'
      )}
    >
      <input {...getInputProps()} />

      <div className="max-w-5xl mx-auto p-4">
        {/* Header Row with Logo */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <span className="text-lg font-bold text-white">Micro Mango</span>
          </div>
        </div>

        {/* Main Textarea */}
        <div className="relative" ref={historyRef}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Describe the image you want to create..."
            className={cn(
              'w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50',
              'resize-none overflow-y-auto transition-colors',
              'text-base leading-relaxed'
            )}
            style={{ minHeight: '80px', maxHeight: '300px' }}
            disabled={disabled}
          />

          {/* History button inside textarea */}
          {promptHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className={cn(
                'absolute top-3 right-3 p-1.5 rounded-lg transition-colors',
                historyOpen ? 'bg-gray-700 text-yellow-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              )}
              title="Prompt history"
            >
              <History size={18} />
            </button>
          )}

          {/* History Dropdown */}
          {historyOpen && promptHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
              <div className="p-3 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
                <span className="text-sm text-gray-400">Recent prompts</span>
                <span className="text-xs text-gray-500">{promptHistory.length} items</span>
              </div>
              {promptHistory.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-2 p-3 hover:bg-gray-800/50 cursor-pointer border-b border-gray-800/50 last:border-b-0"
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

        {/* Bottom Bar: Images, Options, Create Button */}
        <div className="flex items-center justify-between mt-3 gap-3">
          {/* Left: Attached Images & Add Image */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Attached Images */}
            {attachedImages.map((img) => (
              <ImageThumbnail
                key={img.id}
                image={img}
                onRemove={handleRemoveImage}
                onReplace={handleReplaceImage}
              />
            ))}

            {/* Add Image Button */}
            {attachedImages.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  'text-gray-400 hover:text-white hover:bg-gray-800',
                  'border border-dashed border-gray-700 hover:border-gray-600'
                )}
                disabled={disabled}
              >
                <ImageIcon size={16} />
                <span className="hidden sm:inline">Add Image</span>
              </button>
            )}

            {/* Provider & Model Selector */}
            <div className="relative" ref={providerRef}>
              <button
                type="button"
                onClick={() => setProviderOpen(!providerOpen)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <Cpu size={16} />
                <span className="hidden sm:inline text-gray-300">
                  {PROVIDER_LABELS[currentProvider].split(' ')[0]}
                </span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', providerOpen && 'rotate-180')} />
              </button>

              {/* Provider/Model Dropdown */}
              {providerOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 space-y-4 z-50">
                  {/* Provider */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Provider</label>
                    <div className="flex flex-wrap gap-1">
                      {PROVIDERS.map((provider) => (
                        <button
                          key={provider}
                          onClick={() => setCurrentProvider(provider)}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded-lg transition-colors',
                            currentProvider === provider
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-gray-800 text-gray-400 hover:text-white border border-transparent'
                          )}
                        >
                          {PROVIDER_LABELS[provider].split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Model</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    >
                      {providerModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Options */}
          <div className="flex items-center gap-2" ref={optionsRef}>
            {/* Resolution Chips */}
            <div className="hidden md:flex items-center gap-1">
              {providerResolutions.map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg transition-colors',
                    resolution === res
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                  )}
                >
                  {providerResolutionLabels[res]?.split(' ')[0] || res}
                </button>
              ))}
            </div>

            {/* Aspect Ratio */}
            <div className="relative">
              <button
                onClick={() => setOptionsOpen(!optionsOpen)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <Settings2 size={16} />
                <span className="text-gray-300">{aspectRatio}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', optionsOpen && 'rotate-180')} />
              </button>

              {/* Options Dropdown */}
              {optionsOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 space-y-4 z-50">
                  {/* Resolution (Mobile) */}
                  <div className="md:hidden">
                    <label className="block text-xs text-gray-400 mb-2">Resolution</label>
                    <div className="flex flex-wrap gap-1">
                      {providerResolutions.map((res) => (
                        <button
                          key={res}
                          onClick={() => setResolution(res)}
                          className={cn(
                            'px-2.5 py-1 text-xs rounded-lg transition-colors',
                            resolution === res
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'text-gray-400 hover:text-white bg-gray-800 border border-transparent'
                          )}
                        >
                          {providerResolutionLabels[res]?.split(' ')[0] || res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-5 gap-1">
                      {providerAspectRatios.map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={cn(
                            'px-2 py-1.5 text-xs rounded-lg transition-colors',
                            aspectRatio === ratio
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-gray-800 text-gray-400 hover:text-white border border-transparent'
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
          </div>

          {/* Right: Settings & Create */}
          <div className="flex items-center gap-2">
            {/* Settings Button */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}

            {/* Create Button */}
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={disabled || (!prompt.trim() && attachedImages.length === 0)}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl font-semibold',
                'bg-gradient-to-r from-yellow-500 to-orange-500',
                'hover:from-yellow-400 hover:to-orange-400',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'shadow-lg shadow-orange-500/20'
              )}
            >
              <Sparkles className="h-4 w-4" />
              <span>Create</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-900/40 border-2 border-dashed border-blue-400 flex items-center justify-center z-10 rounded-xl m-2">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 text-blue-400 mx-auto mb-2" />
            <p className="text-blue-300 font-medium">Drop images here</p>
          </div>
        </div>
      )}

      {/* Image processing overlay */}
      {isProcessingImages && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20">
          <div className="flex items-center gap-3 bg-gray-800 px-4 py-3 rounded-lg border border-gray-700">
            <div className="h-5 w-5 rounded-full border-2 border-gray-600 border-t-yellow-400 animate-spin" />
            <span className="text-sm text-gray-200">{processingMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Image thumbnail component
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
        isDragOver && 'ring-2 ring-yellow-500 ring-offset-1 ring-offset-gray-900'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <img
        src={image.preview}
        alt="Attached"
        className={cn(
          'h-10 w-10 object-cover rounded-lg border border-gray-700',
          isDragOver && 'opacity-50'
        )}
      />
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] text-yellow-400 font-medium">교체</span>
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
