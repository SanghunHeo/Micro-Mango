import type { Provider } from '@/utils/constants'
import type { IImageProvider } from './types'
import { googleProvider, openaiProvider, byteplusProvider } from './providers'

const providers: Record<Provider, IImageProvider> = {
  google: googleProvider,
  openai: openaiProvider,
  byteplus: byteplusProvider,
}

export function getImageProvider(provider: Provider): IImageProvider {
  const imageProvider = providers[provider]
  if (!imageProvider) {
    throw new Error(`Unknown provider: ${provider}`)
  }
  return imageProvider
}

export function isProviderSupported(provider: string): provider is Provider {
  return provider in providers
}
