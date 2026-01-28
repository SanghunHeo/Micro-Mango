import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Provider } from '@/utils/constants'

// ============================================================================
// Detailed Pricing Tables (Updated January 2026)
// Sources:
// - Google: https://ai.google.dev/gemini-api/docs/pricing
// - OpenAI: https://openai.com/api/pricing/
// - BytePlus: https://docs.byteplus.com/en/docs/ModelArk/1544106
// ============================================================================

// Google Gemini Image Generation Pricing
// Token-based: 1K/2K = 1120 tokens, 4K = 2000 tokens
// gemini-3-pro-image-preview: $120/1M tokens
// gemini-2.5-flash-image (Nano Banana): $30/1M tokens
export const GOOGLE_PRICING: Record<string, Record<string, number>> = {
  'gemini-3-pro-image-preview': {
    '1K': 0.134,    // 1120 tokens × $120/1M
    '2K': 0.134,    // 1120 tokens × $120/1M
    '4K': 0.24,     // 2000 tokens × $120/1M
  },
  'gemini-2.5-flash-image': {
    '1K': 0.039,    // 1290 tokens × $30/1M
    '2K': 0.039,    // estimated same as 1K
    '4K': 0.078,    // estimated 2x 1K price
  },
}

// OpenAI Image Generation Pricing
// gpt-image-1.5/gpt-image-1: Low/Medium/High quality options
// Resolution affects price for DALL-E 3
export const OPENAI_PRICING: Record<string, Record<string, number>> = {
  'gpt-image-1.5': {
    '1024x1024': 0.167,     // High quality square
    '1536x1024': 0.190,     // High quality landscape
    '1024x1536': 0.190,     // High quality portrait
  },
  'gpt-image-1': {
    '1024x1024': 0.167,     // High quality square
    '1536x1024': 0.190,     // High quality landscape
    '1024x1536': 0.190,     // High quality portrait
  },
  'dall-e-3': {
    '1024x1024': 0.040,     // Standard quality
    '1536x1024': 0.080,     // HD landscape
    '1024x1536': 0.080,     // HD portrait
  },
}

// BytePlus Seedream Pricing
// Flat rate per image regardless of resolution (1K-4K)
export const BYTEPLUS_PRICING: Record<string, Record<string, number>> = {
  'seedream-4-5-251128': {
    '2K': 0.040,    // $0.03-0.045 official range
    '4K': 0.040,    // Same price for all resolutions
  },
  'seedream-4-0': {
    '2K': 0.035,    // $0.03-0.035 official range
    '4K': 0.035,    // Same price for all resolutions
  },
}

// Combined pricing lookup by provider
export const DETAILED_PRICING: Record<Provider, Record<string, Record<string, number>>> = {
  google: GOOGLE_PRICING,
  openai: OPENAI_PRICING,
  byteplus: BYTEPLUS_PRICING,
}

// Get price for a specific generation
export function getGenerationPrice(
  provider: Provider,
  model: string,
  resolution: string
): number {
  const providerPricing = DETAILED_PRICING[provider]
  const modelPricing = providerPricing?.[model]

  if (modelPricing && modelPricing[resolution] !== undefined) {
    return modelPricing[resolution]
  }

  // Fallback: try to find any price for this model
  if (modelPricing) {
    const resolutions = Object.keys(modelPricing)
    if (resolutions.length > 0) {
      return modelPricing[resolutions[0]]
    }
  }

  // Last resort fallback
  return PROVIDER_PRICING[provider].perGeneration
}

// Legacy simple pricing for display purposes
export const PROVIDER_PRICING: Record<Provider, {
  perGeneration: number // Average USD per image generation
  currency: string
  note: string
}> = {
  google: {
    perGeneration: 0.134, // Average for gemini-3-pro
    currency: 'USD',
    note: 'Pro: $0.13-0.24 / Flash: $0.04-0.08 (해상도별)',
  },
  openai: {
    perGeneration: 0.167, // GPT-image-1 high quality
    currency: 'USD',
    note: 'GPT-Image: $0.17 / DALL-E 3: $0.04-0.08',
  },
  byteplus: {
    perGeneration: 0.040, // Seedream 4.5
    currency: 'USD',
    note: 'Seedream 4.5: $0.04 / 4.0: $0.035',
  },
}

interface ProviderUsage {
  generationCount: number
  successCount: number
  failureCount: number
  totalTokensEstimate: number // Rough estimate
  estimatedCost: number
  lastUsed: number | null
}

interface UsageState {
  usage: Record<Provider, ProviderUsage>
  totalGenerations: number
  totalEstimatedCost: number
}

interface GenerationDetails {
  model: string
  resolution: string
}

interface UsageActions {
  recordGeneration: (provider: Provider, success: boolean, details?: GenerationDetails) => void
  resetUsage: (provider?: Provider) => void
  getProviderUsage: (provider: Provider) => ProviderUsage
}

type UsageStore = UsageState & UsageActions

const createEmptyUsage = (): ProviderUsage => ({
  generationCount: 0,
  successCount: 0,
  failureCount: 0,
  totalTokensEstimate: 0,
  estimatedCost: 0,
  lastUsed: null,
})

const initialState: UsageState = {
  usage: {
    google: createEmptyUsage(),
    openai: createEmptyUsage(),
    byteplus: createEmptyUsage(),
  },
  totalGenerations: 0,
  totalEstimatedCost: 0,
}

export const useUsageStore = create<UsageStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordGeneration: (provider, success, details) => {
        // Calculate price based on model and resolution if provided
        let costIncrement = 0
        let tokensEstimate = 1000 // Default token estimate

        if (success && details) {
          costIncrement = getGenerationPrice(provider, details.model, details.resolution)

          // Estimate tokens based on provider and resolution
          if (provider === 'google') {
            tokensEstimate = details.resolution === '4K' ? 2000 : 1120
          } else if (provider === 'openai') {
            // OpenAI uses image tokens, estimate based on resolution
            tokensEstimate = details.resolution.includes('1536') ? 5000 : 3000
          } else {
            tokensEstimate = 1000 // BytePlus doesn't use token-based pricing
          }
        } else if (success) {
          // Fallback to average pricing if no details provided
          costIncrement = PROVIDER_PRICING[provider].perGeneration
        }

        set((state) => {
          const providerUsage = state.usage[provider]
          const updatedProviderUsage: ProviderUsage = {
            generationCount: providerUsage.generationCount + 1,
            successCount: providerUsage.successCount + (success ? 1 : 0),
            failureCount: providerUsage.failureCount + (success ? 0 : 1),
            totalTokensEstimate: providerUsage.totalTokensEstimate + (success ? tokensEstimate : 0),
            estimatedCost: providerUsage.estimatedCost + costIncrement,
            lastUsed: Date.now(),
          }

          return {
            usage: {
              ...state.usage,
              [provider]: updatedProviderUsage,
            },
            totalGenerations: state.totalGenerations + 1,
            totalEstimatedCost: state.totalEstimatedCost + costIncrement,
          }
        })
      },

      resetUsage: (provider) => {
        if (provider) {
          set((state) => {
            const resetProviderUsage = state.usage[provider]
            return {
              usage: {
                ...state.usage,
                [provider]: createEmptyUsage(),
              },
              totalGenerations: state.totalGenerations - resetProviderUsage.generationCount,
              totalEstimatedCost: state.totalEstimatedCost - resetProviderUsage.estimatedCost,
            }
          })
        } else {
          set(initialState)
        }
      },

      getProviderUsage: (provider) => {
        return get().usage[provider]
      },
    }),
    {
      name: 'micromango-usage',
    }
  )
)

// Helper to format cost
export function formatCost(cost: number, currency: string = 'USD'): string {
  if (currency === 'USD') {
    return `$${cost.toFixed(4)}`
  }
  return `${cost.toFixed(4)} ${currency}`
}

// Helper to format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}
