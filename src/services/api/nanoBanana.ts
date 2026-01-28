import { GEMINI_MODELS, API_ENDPOINT } from '@/utils/constants'
import type { GenerationRequest, GenerationPart } from './types'

// Retry configuration
const RETRY_INTERVAL_MS = 30 * 1000 // 30 seconds
const MAX_RETRIES = 30

export interface StreamCallbacks {
  onThoughtText?: (text: string) => void
  onInterimImage?: (base64: string) => void
  onFinalImage: (base64: string) => void
  onError: (error: string) => void
  onComplete: () => void
  onProgress?: (progress: number, message: string) => void
}

// Helper to check if error is retryable (server issues)
function isRetryableError(error: unknown, statusCode?: number): boolean {
  // Server errors (5xx)
  if (statusCode && statusCode >= 500) return true

  // Rate limiting (429)
  if (statusCode === 429) return true

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) return true

  // Timeout or abort errors
  if (error instanceof DOMException && error.name === 'AbortError') return true

  // Generic network/server messages
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch') ||
        msg.includes('server') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
      return true
    }
  }

  return false
}

// Helper to wait
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generateImageStream(
  apiKey: string,
  request: GenerationRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const model = GEMINI_MODELS.IMAGE_GENERATION
  const endpoint = `${API_ENDPOINT}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

  // Build request body (reusable for retries)
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

  let attempt = 0

  while (attempt < MAX_RETRIES) {
    attempt++
    const isRetry = attempt > 1

    if (isRetry) {
      console.log(`[NanoBanana] Retry attempt ${attempt}/${MAX_RETRIES}`)
      callbacks.onProgress?.(5, `재시도 중... (${attempt}/${MAX_RETRIES})`)
    } else {
      console.log('[NanoBanana] API request started, model:', model)
      callbacks.onProgress?.(5, 'API 연결 중...')
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
        console.error('[NanoBanana] API error:', errorMessage, 'status:', response.status)

        // Check if we should retry
        if (isRetryableError(null, response.status) && attempt < MAX_RETRIES) {
          console.log(`[NanoBanana] Retryable error, waiting ${RETRY_INTERVAL_MS / 1000}s before retry...`)
          callbacks.onProgress?.(5, `서버 오류, ${RETRY_INTERVAL_MS / 1000}초 후 재시도... (${attempt}/${MAX_RETRIES})`)
          await sleep(RETRY_INTERVAL_MS)
          continue
        }

        callbacks.onError(errorMessage)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        console.error('[NanoBanana] No response body')

        if (attempt < MAX_RETRIES) {
          console.log(`[NanoBanana] No response body, waiting ${RETRY_INTERVAL_MS / 1000}s before retry...`)
          callbacks.onProgress?.(5, `응답 없음, ${RETRY_INTERVAL_MS / 1000}초 후 재시도... (${attempt}/${MAX_RETRIES})`)
          await sleep(RETRY_INTERVAL_MS)
          continue
        }

        callbacks.onError('No response body')
        return
      }

      console.log('[NanoBanana] SSE stream connected')
      callbacks.onProgress?.(10, isRetry ? `스트림 연결됨 (재시도 ${attempt})` : '스트림 연결됨')

      const decoder = new TextDecoder()
      let buffer = ''
      let hasFinalImage = false
      let chunkCount = 0
      let thoughtCount = 0
      let interimCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunkCount++
        console.log('[NanoBanana] Chunk received, count:', chunkCount, 'size:', value?.length || 0)
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
              const chunkParts = chunk.candidates?.[0]?.content?.parts || []

              for (const part of chunkParts as GenerationPart[]) {
                if (part.thought) {
                  // Thought content
                  if (part.text) {
                    thoughtCount++
                    console.log('[NanoBanana] Thought text parsed, count:', thoughtCount)
                    const progress = Math.min(20 + thoughtCount * 2, 45)
                    callbacks.onProgress?.(progress, `AI 사고 중... (${thoughtCount})`)
                    callbacks.onThoughtText?.(part.text)
                  }
                  if (part.inlineData?.data) {
                    interimCount++
                    console.log('[NanoBanana] Interim image parsed, count:', interimCount)
                    const progress = 50 + interimCount * 10
                    callbacks.onProgress?.(Math.min(progress, 65), `중간 이미지 생성 중... (${interimCount})`)
                    callbacks.onInterimImage?.(part.inlineData.data)
                  }
                } else {
                  // Final content
                  if (part.inlineData?.data) {
                    console.log('[NanoBanana] Final image parsed, size:', part.inlineData.data.length)
                    callbacks.onProgress?.(90, '최종 이미지 처리 중...')
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
        console.error('[NanoBanana] No image was generated')

        // Retry if no image was generated (server might have issues)
        if (attempt < MAX_RETRIES) {
          console.log(`[NanoBanana] No image generated, waiting ${RETRY_INTERVAL_MS / 1000}s before retry...`)
          callbacks.onProgress?.(5, `이미지 생성 실패, ${RETRY_INTERVAL_MS / 1000}초 후 재시도... (${attempt}/${MAX_RETRIES})`)
          await sleep(RETRY_INTERVAL_MS)
          continue
        }

        callbacks.onError('No image was generated after multiple retries')
        return
      }

      // Success!
      console.log('[NanoBanana] Stream complete, total chunks:', chunkCount, isRetry ? `(attempt ${attempt})` : '')
      callbacks.onProgress?.(100, '완료!')
      callbacks.onComplete()
      return

    } catch (error) {
      console.error('[NanoBanana] Error:', error)

      // Check if we should retry
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        console.log(`[NanoBanana] Retryable error, waiting ${RETRY_INTERVAL_MS / 1000}s before retry...`)
        callbacks.onProgress?.(5, `네트워크 오류, ${RETRY_INTERVAL_MS / 1000}초 후 재시도... (${attempt}/${MAX_RETRIES})`)
        await sleep(RETRY_INTERVAL_MS)
        continue
      }

      callbacks.onError(error instanceof Error ? error.message : 'Unknown error')
      return
    }
  }

  // Max retries reached
  console.error(`[NanoBanana] Max retries (${MAX_RETRIES}) reached`)
  callbacks.onError(`Maximum retries (${MAX_RETRIES}) reached. Please try again later.`)
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
