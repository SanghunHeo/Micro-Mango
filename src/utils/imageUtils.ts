export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

export function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`
}

export function generateImageFilename(prompt: string, resolution: string): string {
  const sanitized = prompt
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '_')
    .slice(0, 30)
  const timestamp = new Date().toISOString().slice(0, 10)
  return `nanobanana_${sanitized}_${resolution}_${timestamp}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_IMAGE_DIMENSION = 4096

/**
 * Resize image if it exceeds 4K (4096px) in any dimension.
 * Always converts to PNG format for API compatibility.
 * Maintains aspect ratio and returns a new File object.
 */
export async function resizeImageIfNeeded(file: File): Promise<File> {
  console.log(`[Resize] Processing: ${file.name}, size: ${formatFileSize(file.size)}, type: ${file.type}`)

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { width, height } = img
      console.log(`[Resize] Image loaded: ${width}x${height}`)

      // Check if resize is needed
      const needsResize = width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION
      // Always convert to PNG for API compatibility (providers expect PNG MIME type)
      const needsConversion = file.type !== 'image/png'

      if (!needsResize && !needsConversion) {
        console.log(`[Resize] No processing needed, already PNG within ${MAX_IMAGE_DIMENSION}px`)
        resolve(file)
        return
      }

      // Calculate new dimensions maintaining aspect ratio (only if resize needed)
      let newWidth = width
      let newHeight = height

      if (needsResize) {
        if (width > height) {
          if (width > MAX_IMAGE_DIMENSION) {
            newWidth = MAX_IMAGE_DIMENSION
            newHeight = Math.round((height / width) * MAX_IMAGE_DIMENSION)
          }
        } else {
          if (height > MAX_IMAGE_DIMENSION) {
            newHeight = MAX_IMAGE_DIMENSION
            newWidth = Math.round((width / height) * MAX_IMAGE_DIMENSION)
          }
        }
      }

      // Create canvas and resize
      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Use high quality image smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'))
            return
          }

          // Create new file with same name
          const resizedFile = new File([blob], file.name, {
            type: 'image/png',
            lastModified: Date.now(),
          })

          const action = needsResize ? 'resized' : 'converted to PNG'
          console.log(
            `[Resize] Image ${action}: ${width}x${height} -> ${newWidth}x${newHeight} (${formatFileSize(file.size)} -> ${formatFileSize(resizedFile.size)})`
          )

          resolve(resizedFile)
        },
        'image/png',
        0.92 // Quality for PNG (mainly affects metadata)
      )
    }

    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      console.error(`[Resize] Failed to load image: ${file.name}`, e)
      reject(new Error(`Failed to load image: ${file.name}`))
    }

    img.src = url
    console.log(`[Resize] Loading image from blob URL...`)
  })
}

/**
 * Resize multiple images in parallel
 */
export async function resizeImagesIfNeeded(files: File[]): Promise<File[]> {
  return Promise.all(files.map(resizeImageIfNeeded))
}
