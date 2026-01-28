import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Provider } from '@/utils/constants'
import { PROVIDER_DEFAULT_MODEL, PROVIDER_RESOLUTIONS, PROVIDER_ASPECT_RATIOS } from '@/utils/constants'

interface ApiKeys {
  google: string
  openai: string
  byteplus: string
}

interface SettingsState {
  // Multi-provider API keys
  apiKeys: ApiKeys
  currentProvider: Provider

  // Provider-specific settings
  resolution: string
  aspectRatio: string
  model: string

  autoDownload: boolean

  // Legacy support
  apiKey: string
}

interface SettingsActions {
  setApiKey: (provider: Provider, key: string) => void
  setCurrentProvider: (provider: Provider) => void
  setResolution: (resolution: string) => void
  setAspectRatio: (ratio: string) => void
  setModel: (model: string) => void
  toggleAutoDownload: () => void

  // Helper to get current provider's API key
  getCurrentApiKey: () => string
}

type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      apiKeys: {
        google: '',
        openai: '',
        byteplus: '',
      },
      currentProvider: 'google',
      resolution: '4K',
      aspectRatio: '16:9',
      model: 'gemini-3-pro-image-preview',
      autoDownload: true,

      // Legacy support
      apiKey: '',

      setApiKey: (provider, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: key },
        // Also update legacy apiKey if it's the current provider
        ...(provider === state.currentProvider ? { apiKey: key } : {}),
      })),

      setCurrentProvider: (provider) => {
        const state = get()
        const providerResolutions = PROVIDER_RESOLUTIONS[provider]
        const providerAspectRatios = PROVIDER_ASPECT_RATIOS[provider]

        // Reset resolution and aspectRatio if not supported by new provider
        const newResolution = providerResolutions.includes(state.resolution)
          ? state.resolution
          : providerResolutions[0]

        const newAspectRatio = providerAspectRatios.includes(state.aspectRatio)
          ? state.aspectRatio
          : providerAspectRatios[0]

        set({
          currentProvider: provider,
          resolution: newResolution,
          aspectRatio: newAspectRatio,
          model: PROVIDER_DEFAULT_MODEL[provider],
          apiKey: state.apiKeys[provider],
        })
      },

      setResolution: (resolution) => set({ resolution }),
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setModel: (model) => set({ model }),
      toggleAutoDownload: () => set((state) => ({ autoDownload: !state.autoDownload })),

      getCurrentApiKey: () => {
        const state = get()
        return state.apiKeys[state.currentProvider]
      },
    }),
    {
      name: 'nanobanana-settings',
      // Migration from old single apiKey to multi-provider
      migrate: (persistedState: unknown, _version: number) => {
        const state = persistedState as SettingsState
        if (state.apiKey && !state.apiKeys?.google) {
          return {
            ...state,
            apiKeys: {
              google: state.apiKey,
              openai: '',
              byteplus: '',
            },
            currentProvider: 'google' as Provider,
          }
        }
        return state
      },
      version: 1,
    }
  )
)
