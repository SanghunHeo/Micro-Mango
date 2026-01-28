import { GEMINI_MODELS, API_ENDPOINT } from '@/utils/constants'
import type { GenerationRequest, GenerationPart } from './types'

export interface StreamCallbacks {
  onThoughtText: (text: string) => void
  onInterimImage: (base64: string) => void
  onFinalImage: (base64: string) => void
  onError: (error: string) => void
  onComplete: () => void
}

export async function generateImageStream(
  apiKey: string,
  request: GenerationRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const model = GEMINI_MODELS.IMAGE_GENERATION
  const endpoint = `${API_ENDPOINT}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

  // Build request body
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = []

  // Add prompt
  parts.push({ text: request.prompt })

  // Add reference images
  if (request.referenceImages) {
    for (const imageBase64 of request.referenceImages) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: imageBase64,
        },
      })
    }
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: request.aspectRatio,
        imageSize: request.resolution,
      },
    },
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `API error: ${response.status}`
      callbacks.onError(errorMessage)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let hasFinalImage = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process SSE events
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const chunk = JSON.parse(data)
            const parts = chunk.candidates?.[0]?.content?.parts || []

            for (const part of parts as GenerationPart[]) {
              if (part.thought) {
                // Thought content
                if (part.text) {
                  callbacks.onThoughtText(part.text)
                }
                if (part.inlineData?.data) {
                  callbacks.onInterimImage(part.inlineData.data)
                }
              } else {
                // Final content
                if (part.inlineData?.data) {
                  hasFinalImage = true
                  callbacks.onFinalImage(part.inlineData.data)
                }
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    if (!hasFinalImage) {
      callbacks.onError('No image was generated')
      return
    }

    callbacks.onComplete()
  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : 'Unknown error')
  }
}

// Non-streaming version for simpler use cases
export async function generateImage(
  apiKey: string,
  request: GenerationRequest
): Promise<{ image: string; text?: string } | { error: string }> {
  const model = GEMINI_MODELS.IMAGE_GENERATION
  const endpoint = `${API_ENDPOINT}/${model}:generateContent?key=${apiKey}`

  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = []
  parts.push({ text: request.prompt })

  if (request.referenceImages) {
    for (const imageBase64 of request.referenceImages) {
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: imageBase64,
        },
      })
    }
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: request.aspectRatio,
        imageSize: request.resolution,
      },
    },
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { error: errorData.error?.message || `API error: ${response.status}` }
    }

    const data = await response.json()
    const responseParts = data.candidates?.[0]?.content?.parts || []

    let image = ''
    let text = ''

    for (const part of responseParts) {
      if (part.inlineData?.data && !part.thought) {
        image = part.inlineData.data
      }
      if (part.text && !part.thought) {
        text = part.text
      }
    }

    if (!image) {
      return { error: 'No image was generated' }
    }

    return { image, text }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
