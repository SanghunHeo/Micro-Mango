import { PROVIDER_ENDPOINTS } from '@/utils/constants'
import type { GenerationRequest, StreamCallbacks, ProviderConfig, IImageProvider } from '../types'

class BytePlusSeedreamProvider implements IImageProvider {
  async generateImageStream(
    config: ProviderConfig,
    request: GenerationRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const endpoint = PROVIDER_ENDPOINTS.byteplus

    console.log('[BytePlus] API request started, model:', config.model)
    callbacks.onProgress?.(10, 'API 요청 중...')

    // Map resolution to BytePlus size format
    const size = this.mapResolution(request.resolution)

    const body: Record<string, unknown> = {
      model: config.model,
      prompt: request.prompt,
      size,
      response_format: 'url',
    }

    // Add reference images if provided (BytePlus supports up to 14)
    if (request.referenceImages && request.referenceImages.length > 0) {
      body.image = request.referenceImages.map(img => ({
        type: 'base64',
        data: img,
      }))
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `API error: ${response.status}`
        console.error('[BytePlus] API error:', errorMessage)
        callbacks.onError(errorMessage)
        return
      }

      console.log('[BytePlus] Response received')
      callbacks.onProgress?.(80, '이미지 수신 중...')
      const data = await response.json()

      if (data.data && data.data[0]) {
        let imageBase64: string

        if (data.data[0].b64_json) {
          imageBase64 = data.data[0].b64_json
        } else if (data.data[0].url) {
          // Fetch image from URL and convert to base64
          console.log('[BytePlus] Converting URL to base64')
          imageBase64 = await this.urlToBase64(data.data[0].url)
        } else {
          console.error('[BytePlus] No image data in response')
          callbacks.onError('No image data in response')
          return
        }

        console.log('[BytePlus] Image processed successfully')
        callbacks.onProgress?.(100, '완료!')
        callbacks.onFinalImage(imageBase64)
        callbacks.onComplete()
      } else {
        console.error('[BytePlus] No image was generated')
        callbacks.onError('No image was generated')
      }
    } catch (error) {
      console.error('[BytePlus] Error:', error)
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async generateImage(
    config: ProviderConfig,
    request: GenerationRequest
  ): Promise<{ image: string } | { error: string }> {
    const endpoint = PROVIDER_ENDPOINTS.byteplus

    const size = this.mapResolution(request.resolution)

    const body: Record<string, unknown> = {
      model: config.model,
      prompt: request.prompt,
      size,
      response_format: 'url',
    }

    if (request.referenceImages && request.referenceImages.length > 0) {
      body.image = request.referenceImages.map(img => ({
        type: 'base64',
        data: img,
      }))
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      })

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

  private mapResolution(resolution: string): string {
    // BytePlus supports: 2048x2048 (2K), 4096x4096 (4K)
    if (resolution === '4K' || resolution === '4096x4096') {
      return '4096x4096'
    }
    // Default to 2K
    return '2048x2048'
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

export const byteplusProvider = new BytePlusSeedreamProvider()
