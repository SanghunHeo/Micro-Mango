import { X } from 'lucide-react'

export interface AttachedImage {
  id: string
  file: File
  preview: string
}

interface ImagePreviewProps {
  images: AttachedImage[]
  onRemove: (id: string) => void
}

export function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  if (images.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap p-2">
      {images.map((image) => (
        <div key={image.id} className="relative group">
          <img
            src={image.preview}
            alt="Attached"
            className="w-20 h-20 object-cover rounded-lg border border-gray-700"
          />
          <button
            onClick={() => onRemove(image.id)}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors shadow-lg"
            type="button"
          >
            <X size={12} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-gray-300 px-1 py-0.5 rounded-b-lg truncate">
            {image.file.name}
          </div>
        </div>
      ))}
    </div>
  )
}
