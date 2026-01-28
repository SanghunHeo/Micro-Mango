import { PROVIDER_ENDPOINTS } from '@/utils/constants'
import type { GenerationRequest, StreamCallbacks, ProviderConfig, IImageProvider } from '../types'

class OpenAIImagesProvider implements IImageProvider {
  async generateImageStream(
    config: ProviderConfig,
    request: GenerationRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const endpoint = PROVIDER_ENDPOINTS.openai

    console.log('[OpenAI] API request started, model:', config.model)
    callbacks.onProgress?.(10, 'API 요청 중...')

    // Map resolution to OpenAI size format
    const size = this.mapResolution(request.resolution, request.aspectRatio)

    const body = {
      model: config.model,
      prompt: request.prompt,
      n: 1,
      size,
      response_format: 'b64_json',
      output_format: 'png',
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
        console.error('[OpenAI] API error:', errorMessage)
        callbacks.onError(errorMessage)
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
      }
    } catch (error) {
      console.error('[OpenAI] Error:', error)
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  async generateImage(
    config: ProviderConfig,
    request: GenerationRequest
  ): Promise<{ image: string } | { error: string }> {
    const endpoint = PROVIDER_ENDPOINTS.openai

    const size = this.mapResolution(request.resolution, request.aspectRatio)

    const body = {
      model: config.model,
      prompt: request.prompt,
      n: 1,
      size,
      response_format: 'b64_json',
      output_format: 'png',
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
