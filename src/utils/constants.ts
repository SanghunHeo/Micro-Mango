// Provider definitions
export const PROVIDERS = ['google', 'openai', 'byteplus'] as const
export type Provider = typeof PROVIDERS[number]

export const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google Nano Banana',
  openai: 'OpenAI Images',
  byteplus: 'BytePlus Seedream',
}

// Provider-specific models
export const PROVIDER_MODELS: Record<Provider, readonly string[]> = {
  google: ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'] as const,
  openai: ['gpt-image-1.5', 'gpt-image-1', 'dall-e-3'] as const,
  byteplus: ['seedream-4-5-251128', 'seedream-4-0'] as const,
}

export const PROVIDER_DEFAULT_MODEL: Record<Provider, string> = {
  google: 'gemini-3-pro-image-preview',
  openai: 'gpt-image-1.5',
  byteplus: 'seedream-4-5-251128',
}

// Provider-specific resolutions
export const PROVIDER_RESOLUTIONS: Record<Provider, readonly string[]> = {
  google: ['1K', '2K', '4K'] as const,
  openai: ['1024x1024', '1536x1024', '1024x1536'] as const,
  byteplus: ['2K', '4K'] as const,
}

export const PROVIDER_RESOLUTION_LABELS: Record<Provider, Record<string, string>> = {
  google: {
    '1K': '1K (1024px)',
    '2K': '2K (2048px)',
    '4K': '4K (4096px)',
  },
  openai: {
    '1024x1024': '1K 정사각',
    '1536x1024': '1.5K 가로',
    '1024x1536': '1.5K 세로',
  },
  byteplus: {
    '2K': '2K (2048px)',
    '4K': '4K (4096px)',
  },
}

// Provider-specific aspect ratios
export const PROVIDER_ASPECT_RATIOS: Record<Provider, readonly string[]> = {
  google: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '3:2', '2:3', '5:4', '4:5'] as const,
  openai: ['1:1', '3:2', '2:3'] as const,
  byteplus: ['1:1', '3:2', '4:3', '16:9', '21:9'] as const,
}

// Provider API endpoints
export const PROVIDER_ENDPOINTS: Record<Provider, string> = {
  google: 'https://generativelanguage.googleapis.com/v1beta/models',
  openai: 'https://api.openai.com/v1/images/generations',
  byteplus: 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations',
}

// Provider billing/console URLs
export const PROVIDER_CONSOLE_URLS: Record<Provider, string> = {
  google: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/usage',
  byteplus: 'https://console.byteplus.com',
}

// Legacy exports for backward compatibility
export const MODELS = {
  FLASH: 'gemini-2.5-flash-image',
  PRO: 'gemini-3-pro-image-preview',
} as const

export const RESOLUTIONS = ['1K', '2K', '4K'] as const
export type Resolution = typeof RESOLUTIONS[number]

// All supported aspect ratios (union of all providers)
export const ASPECT_RATIOS = [
  '16:9',  // Widescreen (default) - TV, monitors, landscape mobile
  '9:16',  // Portrait - YouTube Shorts, TikTok, Instagram Stories
  '1:1',   // Square - Instagram posts, profile pictures
  '4:3',   // Fullscreen - traditional media
  '3:4',   // Portrait fullscreen
  '21:9',  // Ultra-wide cinematic
  '3:2',   // Classic photo ratio
  '2:3',   // Portrait classic
  '5:4',   // Medium format
  '4:5',   // Instagram portrait
] as const
export type AspectRatio = typeof ASPECT_RATIOS[number]

// Aspect ratio display labels (Korean)
export const ASPECT_RATIO_LABELS: Record<string, string> = {
  '16:9': '16:9 와이드',
  '9:16': '9:16 세로',
  '1:1': '1:1 정사각',
  '4:3': '4:3 표준',
  '3:4': '3:4 세로',
  '21:9': '21:9 시네마',
  '3:2': '3:2 사진',
  '2:3': '2:3 세로사진',
  '5:4': '5:4 중형',
  '4:5': '4:5 인스타',
}

export const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export const GEMINI_MODELS = {
  IMAGE_GENERATION: 'gemini-3-pro-image-preview',
  IMAGE_ANALYSIS: 'gemini-3-flash-preview',
} as const

export const MAX_IMAGES = 4
export const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const
