import { base64ToBlob, generateImageFilename } from '@/utils/imageUtils'

export interface ImageMetadata {
  prompt: string
  resolution: string
  model: string
  aspectRatio: string
  generationTime: number
  timestamp: string
  referenceImages?: string[]
  generatedImage?: string
}

interface DownloadOptions {
  imageBase64: string
  metadata: ImageMetadata
  includeMetadataFile?: boolean
}

export function downloadImage(options: DownloadOptions): void {
  const { imageBase64, metadata, includeMetadataFile = true } = options

  const filename = generateImageFilename(metadata.prompt, metadata.resolution)

  // Download image
  const imageBlob = base64ToBlob(imageBase64, 'image/png')
  const imageUrl = URL.createObjectURL(imageBlob)
  const imageLink = document.createElement('a')
  imageLink.href = imageUrl
  imageLink.download = `${filename}.png`
  document.body.appendChild(imageLink)
  imageLink.click()
  document.body.removeChild(imageLink)
  URL.revokeObjectURL(imageUrl)

  // Download metadata JSON
  if (includeMetadataFile) {
    const metadataWithImage = {
      ...metadata,
      generatedImage: imageBase64,
    }

    const metadataBlob = new Blob(
      [JSON.stringify(metadataWithImage, null, 2)],
      { type: 'application/json' }
    )
    const metadataUrl = URL.createObjectURL(metadataBlob)
    const metadataLink = document.createElement('a')
    metadataLink.href = metadataUrl
    metadataLink.download = `${filename}_metadata.json`
    document.body.appendChild(metadataLink)

    // Small delay to ensure both downloads start
    setTimeout(() => {
      metadataLink.click()
      document.body.removeChild(metadataLink)
      URL.revokeObjectURL(metadataUrl)
    }, 100)
  }
}

export function downloadMetadataOnly(metadata: ImageMetadata, filename: string): void {
  const metadataBlob = new Blob(
    [JSON.stringify(metadata, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(metadataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_metadata.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
