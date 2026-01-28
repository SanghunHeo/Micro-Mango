import type { Provider } from '@/utils/constants'

export interface GenerationRequest {
  prompt: string
  referenceImages?: string[] // base64
  resolution: string
  aspectRatio: string
}

export interface StreamCallbacks {
  onThoughtText?: (text: string) => void
  onInterimImage?: (base64: string) => void
  onFinalImage: (base64: string) => void
  onError: (error: string) => void
  onComplete: () => void
}

export interface ProviderConfig {
  provider: Provider
  model: string
  apiKey: string
}

export interface IImageProvider {
  generateImageStream(
    config: ProviderConfig,
    request: GenerationRequest,
    callbacks: StreamCallbacks
  ): Promise<void>

  generateImage?(
    config: ProviderConfig,
    request: GenerationRequest
  ): Promise<{ image: string } | { error: string }>
}

// Google-specific types
export interface GenerationPart {
  thought?: boolean
  text?: string
  inlineData?: {
    mimeType: string
    data: string // base64
  }
  thoughtSignature?: string
}

export interface GenerationChunk {
  candidates: Array<{
    content: {
      parts: GenerationPart[]
    }
  }>
}

// Analysis types
export interface AnalysisResult {
  keywords: string[]
  description: string
  suggestedPrompt?: string
  style?: string
}
