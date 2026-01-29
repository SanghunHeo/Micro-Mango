import { PROVIDER_ENDPOINTS } from '@/utils/constants'
import type { GenerationRequest, StreamCallbacks, ProviderConfig, IImageProvider } from '../types'

// OpenAI API endpoints
const OPENAI_GENERATIONS_ENDPOINT = PROVIDER_ENDPOINTS.openai
const OPENAI_EDITS_ENDPOINT = 'https://api.openai.com/v1/images/edits'

class OpenAIImagesProvider implements IImageProvider {
  async generateImageStream(
    config: ProviderConfig,
    request: GenerationRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const hasReferenceImages = request.referenceImages && request.referenceImages.length > 0

    console.log('[OpenAI] API request started, model:', config.model, 'hasReferenceImages:', hasReferenceImages)
    callbacks.onProgress?.(10, 'API 요청 중...')

    // Map resolution to OpenAI size format
    const size = this.mapResolution(request.resolution, request.aspectRatio)

    // gpt-image-* models use output_format, dall-e-* models use response_format
    const isGptImageModel = config.model.startsWith('gpt-image')

    try {
      let response: Response

      if (hasReferenceImages) {
        // Use edits endpoint with FormData for image editing
        const formData = new FormData()
        formData.append('model', config.model)
        formData.append('prompt', request.prompt)
        formData.append('n', '1')
        formData.append('size', size)

        if (isGptImageModel) {
          formData.append('output_format', 'png')
        } else {
          formData.append('response_format', 'b64_json')
        }

        // Add reference images (OpenAI edits endpoint uses 'image' for the first image)
        // For multiple images, we use 'image[]' array format
        for (const imageBase64 of request.referenceImages!) {
          const blob = this.base64ToBlob(imageBase64, 'image/png')
          formData.append('image[]', blob, 'image.png')
        }

        console.log('[OpenAI] Using edits endpoint with', request.referenceImages!.length, 'reference image(s)')

        response = await fetch(OPENAI_EDITS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: formData,
        })
      } else {
        // Use generations endpoint with JSON for text-to-image
        const body = {
          model: config.model,
          prompt: request.prompt,
          n: 1,
          size,
          ...(isGptImageModel
            ? { output_format: 'png' }
            : { response_format: 'b64_json' }
          ),
        }

        response = await fetch(OPENAI_GENERATIONS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `API error: ${response.status}`
        console.error('[OpenAI] API error:', errorMessage)
        callbacks.onError(errorMessage)
        callbacks.onComplete()
        return
      }

      console.log('[OpenAI] Response received')
      callbacks.onProgress?.(80, '이미지 수신 중...')
      const data = await response.json()

      if (data.data && data.data[0]) {
        const imageData = data.data[0].b64_json || data.data[0].url

        if (data.data[0].url && !data.data[0].b64_json) {
          // If we got a URL, fetch and convert to base64
          console.log('[OpenAI] Converting URL to base64')
          const imageBase64 = await this.urlToBase64(data.data[0].url)
          callbacks.onFinalImage(imageBase64)
        } else {
          callbacks.onFinalImage(imageData)
        }

        console.log('[OpenAI] Image processed successfully')
        callbacks.onProgress?.(100, '완료!')
        callbacks.onComplete()
      } else {
        console.error('[OpenAI] No image was generated')
        callbacks.onError('No image was generated')
        callbacks.onComplete()
      }
    } catch (error) {
      console.error('[OpenAI] Error:', error)
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error')
      callbacks.onComplete()
    }
  }

  async generateImage(
    config: ProviderConfig,
    request: GenerationRequest
  ): Promise<{ image: string } | { error: string }> {
    const hasReferenceImages = request.referenceImages && request.referenceImages.length > 0
    const size = this.mapResolution(request.resolution, request.aspectRatio)

    // gpt-image-* models use output_format, dall-e-* models use response_format
    const isGptImageModel = config.model.startsWith('gpt-image')

    try {
      let response: Response

      if (hasReferenceImages) {
        // Use edits endpoint with FormData for image editing
        const formData = new FormData()
        formData.append('model', config.model)
        formData.append('prompt', request.prompt)
        formData.append('n', '1')
        formData.append('size', size)

        if (isGptImageModel) {
          formData.append('output_format', 'png')
        } else {
          formData.append('response_format', 'b64_json')
        }

        // Add reference images
        for (const imageBase64 of request.referenceImages!) {
          const blob = this.base64ToBlob(imageBase64, 'image/png')
          formData.append('image[]', blob, 'image.png')
        }

        response = await fetch(OPENAI_EDITS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: formData,
        })
      } else {
        // Use generations endpoint with JSON for text-to-image
        const body = {
          model: config.model,
          prompt: request.prompt,
          n: 1,
          size,
          ...(isGptImageModel
            ? { output_format: 'png' }
            : { response_format: 'b64_json' }
          ),
        }

        response = await fetch(OPENAI_GENERATIONS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { error: errorData.error?.message || `API error: ${response.status}` }
      }

      const data = await response.json()

      if (data.data && data.data[0]) {
        if (data.data[0].b64_json) {
          return { image: data.data[0].b64_json }
        } else if (data.data[0].url) {
          const imageBase64 = await this.urlToBase64(data.data[0].url)
          return { image: imageBase64 }
        }
      }

      return { error: 'No image was generated' }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private mapResolution(resolution: string, aspectRatio: string): string {
    // OpenAI supports: 1024x1024, 1536x1024, 1024x1536
    if (resolution === '1024x1024' || resolution === '1536x1024' || resolution === '1024x1536') {
      return resolution
    }

    // Map based on aspect ratio
    if (aspectRatio === '1:1') {
      return '1024x1024'
    } else if (aspectRatio === '3:2' || aspectRatio === '16:9') {
      return '1536x1024'
    } else if (aspectRatio === '2:3' || aspectRatio === '9:16') {
      return '1024x1536'
    }

    return '1024x1024' // Default to square
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  private async urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      throw new Error('Failed to convert image URL to base64')
    }
  }
}

export const openaiProvider = new OpenAIImagesProvider()
