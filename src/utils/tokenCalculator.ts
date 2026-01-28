import type { Provider } from './constants'

// Token estimation constants
const TOKENS_PER_CHAR_ENGLISH = 0.25 // ~4 chars per token
const TOKENS_PER_CHAR_KOREAN = 0.5  // ~2 chars per token (more tokens for CJK)

// Image input tokens (based on resolution)
// Small images (≤384px): 258 tokens
// Larger images: tiled at 768x768, each tile = 258 tokens
const IMAGE_INPUT_TOKENS_BASE = 258
const IMAGE_INPUT_TOKENS_MEDIUM = 516  // ~2 tiles
const IMAGE_INPUT_TOKENS_LARGE = 1032  // ~4 tiles

// Provider-specific image output costs (USD per image)
const PROVIDER_IMAGE_COST: Record<Provider, Record<string, number>> = {
  google: {
    '1K': 0.039,
    '2K': 0.134,
    '4K': 0.240,
  },
  openai: {
    '1024x1024': 0.02,     // ~$0.02 (low quality estimate)
    '1536x1024': 0.07,     // ~$0.07 (medium quality)
    '1024x1536': 0.07,     // ~$0.07 (medium quality)
  },
  byteplus: {
    '2K': 0.04,
    '4K': 0.08,
  },
}

// Provider-specific output tokens (for display)
const PROVIDER_OUTPUT_TOKENS: Record<Provider, Record<string, number>> = {
  google: {
    '1K': 1290,
    '2K': 1120,
    '4K': 2000,
  },
  openai: {
    '1024x1024': 1000,
    '1536x1024': 1500,
    '1024x1536': 1500,
  },
  byteplus: {
    '2K': 4096,
    '4K': 8192,
  },
}

// Default fallback cost
const DEFAULT_IMAGE_COST = 0.10

// Exchange rate USD to KRW (approximate, updated periodically)
const USD_TO_KRW = 1450

export interface TokenEstimate {
  inputTokens: {
    text: number
    images: number
    total: number
  }
  outputTokens: {
    image: number
    text: number // estimated response text
    total: number
  }
  cost: {
    input: number
    output: number
    total: number
  }
}

/**
 * Estimate tokens for text input
 * Uses heuristic based on character count and language detection
 */
function estimateTextTokens(text: string): number {
  if (!text) return 0

  // Simple language detection: count Korean characters
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length
  const totalChars = text.length
  const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0

  // Weighted average based on language mix
  const tokensPerChar = TOKENS_PER_CHAR_ENGLISH * (1 - koreanRatio) +
                        TOKENS_PER_CHAR_KOREAN * koreanRatio

  return Math.ceil(text.length * tokensPerChar)
}

/**
 * Estimate tokens for image input based on file size/dimensions
 */
function estimateImageInputTokens(imageFiles: File[]): number {
  let totalTokens = 0

  for (const file of imageFiles) {
    // Estimate based on file size as proxy for image complexity
    const sizeInKB = file.size / 1024

    if (sizeInKB < 100) {
      // Small image, likely single tile
      totalTokens += IMAGE_INPUT_TOKENS_BASE
    } else if (sizeInKB < 500) {
      // Medium image, ~2 tiles
      totalTokens += IMAGE_INPUT_TOKENS_MEDIUM
    } else {
      // Large image, ~4+ tiles
      totalTokens += IMAGE_INPUT_TOKENS_LARGE
    }
  }

  return totalTokens
}

/**
 * Get image output cost for a provider and resolution
 */
function getImageOutputCost(provider: Provider, resolution: string): number {
  const providerCosts = PROVIDER_IMAGE_COST[provider]
  return providerCosts?.[resolution] ?? DEFAULT_IMAGE_COST
}

/**
 * Get image output tokens for display
 */
function getImageOutputTokens(provider: Provider, resolution: string): number {
  const providerTokens = PROVIDER_OUTPUT_TOKENS[provider]
  return providerTokens?.[resolution] ?? 1000
}

/**
 * Calculate cost from tokens (provider-aware)
 */
function calculateCost(
  inputTokens: number,
  resolution: string,
  provider: Provider
): {
  input: number
  output: number
  total: number
} {
  // Input cost is roughly similar across providers
  const inputCost = (inputTokens / 1_000_000) * 2.00 // ~$2 per 1M input tokens
  const outputImageCost = getImageOutputCost(provider, resolution)

  return {
    input: inputCost,
    output: outputImageCost,
    total: inputCost + outputImageCost,
  }
}

/**
 * Main function to estimate tokens and cost (provider-aware)
 */
export function estimateTokensAndCost(
  text: string,
  imageFiles: File[],
  resolution: string,
  provider: Provider = 'google'
): TokenEstimate {
  const textTokens = estimateTextTokens(text)
  const imageInputTokens = estimateImageInputTokens(imageFiles)
  const totalInputTokens = textTokens + imageInputTokens

  const imageOutputTokens = getImageOutputTokens(provider, resolution)
  const textOutputTokens = 100 // Estimated response text tokens
  const totalOutputTokens = imageOutputTokens + textOutputTokens

  const cost = calculateCost(totalInputTokens, resolution, provider)

  return {
    inputTokens: {
      text: textTokens,
      images: imageInputTokens,
      total: totalInputTokens,
    },
    outputTokens: {
      image: imageOutputTokens,
      text: textOutputTokens,
      total: totalOutputTokens,
    },
    cost,
  }
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  return `${(tokens / 1000).toFixed(1)}K`
}

/**
 * Convert USD to KRW
 */
export function usdToKrw(usd: number): number {
  return usd * USD_TO_KRW
}

/**
 * Format cost for display (KRW)
 */
export function formatCostKRW(costUSD: number): string {
  const costKRW = usdToKrw(costUSD)
  if (costKRW < 1) return '< 1원'
  if (costKRW < 10) return `${costKRW.toFixed(1)}원`
  if (costKRW < 1000) return `${Math.round(costKRW)}원`
  return `${Math.round(costKRW).toLocaleString('ko-KR')}원`
}

/**
 * Format cost for display (USD) - kept for reference
 */
export function formatCostUSD(cost: number): string {
  if (cost < 0.001) return '< $0.001'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

/**
 * Get exchange rate info
 */
export function getExchangeRate(): { rate: number; currency: string } {
  return { rate: USD_TO_KRW, currency: 'KRW' }
}
