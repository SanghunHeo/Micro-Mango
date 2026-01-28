// Legacy exports (for backward compatibility)
export { generateImageStream, generateImage } from './nanoBanana'

// Provider-based exports
export { getImageProvider, isProviderSupported } from './providerFactory'
export { googleProvider, openaiProvider, byteplusProvider } from './providers'

// Gemini analysis
export { analyzeImage } from './gemini'

// Types
export type {
  GenerationRequest,
  AnalysisResult,
  StreamCallbacks,
  ProviderConfig,
  IImageProvider,
} from './types'
