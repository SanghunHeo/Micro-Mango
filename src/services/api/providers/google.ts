import { PROVIDER_ENDPOINTS } from '@/utils/constants'
import type { GenerationRequest, StreamCallbacks, ProviderConfig, GenerationPart, IImageProvider } from '../types'

// Retry configuration with exponential backoff
const INITIAL_RETRY_INTERVAL_MS = 60 * 1000 // 1 minute
const BACKOFF_THRESHOLD = 10 // Start increasing interval after 10 same-type failures
const BACKOFF_MULTIPLIER = 1.5 // Increase interval by 50% each time after threshold
const MAX_RETRY_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours max single interval
const MAX_RETRIES = 100 // Give up after 100 total attempts

// Helper to check if error is retryable (server issues)
function isRetryableError(error: unknown, statusCode?: number): boolean {
  if (statusCode && statusCode >= 500) return true
  if (statusCode === 429) return true
  if (error instanceof TypeError && error.message.includes('fetch')) return true
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch') ||
        msg.includes('server') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
      return true
    }
  }
  return false
}

// Calculate retry interval with exponential backoff after threshold
function getRetryInterval(consecutiveSameErrors: number): number {
  if (consecutiveSameErrors <= BACKOFF_THRESHOLD) {
    return INITIAL_RETRY_INTERVAL_MS
  }
  // Exponential backoff after threshold
  const backoffCount = consecutiveSameErrors - BACKOFF_THRESHOLD
  const interval = INITIAL_RETRY_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, backoffCount)
  return Math.min(interval, MAX_RETRY_INTERVAL_MS)
}

// Format duration for display
function formatDuration(ms: number): string {
  if (ms < 60 * 1000) return `${Math.round(ms / 1000)}초`
  if (ms < 60 * 60 * 1000) return `${Math.round(ms / 60 / 1000)}분`
  return `${(ms / 60 / 60 / 1000).toFixed(1)}시간`
}

// Helper to wait
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class GoogleNanoBananaProvider implements IImageProvider {
  async generateImageStream(
    config: ProviderConfig,
    request: GenerationRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const endpoint = `${PROVIDER_ENDPOINTS.google}/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`

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
    let consecutiveSameErrors = 0
    let lastErrorType = ''
    let completed = false

    try {
    while (attempt < MAX_RETRIES) {
      attempt++
      const isRetry = attempt > 1

      if (isRetry) {
        console.log(`[Google] Retry attempt ${attempt} (consecutive same errors: ${consecutiveSameErrors})`)
        callbacks.onProgress?.(5, `재시도 중... (${attempt}회, 동일 오류 ${consecutiveSameErrors}회)`)
      } else {
        console.log('[Google] API request started, model:', config.model)
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
          const errorType = `http_${response.status}`
          console.error('[Google] API error:', errorMessage, 'status:', response.status)

          if (isRetryableError(null, response.status)) {
            // Track consecutive same errors for backoff
            if (errorType === lastErrorType) {
              consecutiveSameErrors++
            } else {
              consecutiveSameErrors = 1
              lastErrorType = errorType
            }

            const retryInterval = getRetryInterval(consecutiveSameErrors)
            console.log(`[Google] Retryable error, waiting ${formatDuration(retryInterval)} before retry... (consecutive: ${consecutiveSameErrors})`)
            callbacks.onProgress?.(5, `서버 오류, ${formatDuration(retryInterval)} 후 재시도... (${attempt}회)`)
            await sleep(retryInterval)
            continue
          }

          callbacks.onError(errorMessage)
          return
        }

        // Success - reset error tracking
        consecutiveSameErrors = 0
        lastErrorType = ''

        const reader = response.body?.getReader()
        if (!reader) {
          const errorType = 'no_body'
          console.error('[Google] No response body')

          // Track consecutive same errors
          if (errorType === lastErrorType) {
            consecutiveSameErrors++
          } else {
            consecutiveSameErrors = 1
            lastErrorType = errorType
          }

          const retryInterval = getRetryInterval(consecutiveSameErrors)
          console.log(`[Google] No response body, waiting ${formatDuration(retryInterval)} before retry...`)
          callbacks.onProgress?.(5, `응답 없음, ${formatDuration(retryInterval)} 후 재시도... (${attempt}회)`)
          await sleep(retryInterval)
          continue
        }

        console.log('[Google] SSE stream connected')
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
          console.log('[Google] Chunk received, count:', chunkCount, 'size:', value?.length || 0)
          buffer += decoder.decode(value, { stream: true })

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
                    if (part.text) {
                      thoughtCount++
                      console.log('[Google] Thought text parsed, count:', thoughtCount)
                      const progress = Math.min(20 + thoughtCount * 2, 45)
                      callbacks.onProgress?.(progress, `AI 사고 중... (${thoughtCount})`)
                      callbacks.onThoughtText?.(part.text)
                    }
                    if (part.inlineData?.data) {
                      interimCount++
                      console.log('[Google] Interim image parsed, count:', interimCount)
                      const progress = 50 + interimCount * 10
                      callbacks.onProgress?.(Math.min(progress, 65), `중간 이미지 생성 중... (${interimCount})`)
                      callbacks.onInterimImage?.(part.inlineData.data)
                    }
                  } else {
                    if (part.inlineData?.data) {
                      console.log('[Google] Final image parsed, size:', part.inlineData.data.length)
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
          const errorType = 'no_image'
          console.error('[Google] No image was generated')

          // Track consecutive same errors
          if (errorType === lastErrorType) {
            consecutiveSameErrors++
          } else {
            consecutiveSameErrors = 1
            lastErrorType = errorType
          }

          const retryInterval = getRetryInterval(consecutiveSameErrors)
          console.log(`[Google] No image generated, waiting ${formatDuration(retryInterval)} before retry... (consecutive: ${consecutiveSameErrors})`)
          callbacks.onProgress?.(5, `이미지 생성 실패, ${formatDuration(retryInterval)} 후 재시도... (${attempt}회)`)
          await sleep(retryInterval)
          continue
        }

        // Success!
        console.log('[Google] Stream complete, total chunks:', chunkCount, isRetry ? `(attempt ${attempt})` : '')
        callbacks.onProgress?.(100, '완료!')
        completed = true
        callbacks.onComplete()
        return

      } catch (error) {
        console.error('[Google] Error:', error)

        if (isRetryableError(error)) {
          const errorType = 'network'

          // Track consecutive same errors
          if (errorType === lastErrorType) {
            consecutiveSameErrors++
          } else {
            consecutiveSameErrors = 1
            lastErrorType = errorType
          }

          const retryInterval = getRetryInterval(consecutiveSameErrors)
          console.log(`[Google] Retryable error, waiting ${formatDuration(retryInterval)} before retry... (consecutive: ${consecutiveSameErrors})`)
          callbacks.onProgress?.(5, `네트워크 오류, ${formatDuration(retryInterval)} 후 재시도... (${attempt}회)`)
          await sleep(retryInterval)
          continue
        }

        callbacks.onError(error instanceof Error ? error.message : 'Unknown error')
        return
      }
    }

    // Max retries reached
    console.error(`[Google] Max retries (${MAX_RETRIES}) reached`)
    callbacks.onError(`최대 재시도 횟수(${MAX_RETRIES}회)를 초과했습니다. 나중에 다시 시도해주세요.`)
    } finally {
      if (!completed) {
        callbacks.onComplete()
      }
    }
  }

  async generateImage(
    config: ProviderConfig,
    request: GenerationRequest
  ): Promise<{ image: string; text?: string } | { error: string }> {
    const endpoint = `${PROVIDER_ENDPOINTS.google}/${config.model}:generateContent?key=${config.apiKey}`

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
}

export const googleProvider = new GoogleNanoBananaProvider()
