import { X, Key, Monitor, Ratio, Cpu } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useSettingsStore } from '@/stores'
import {
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  PROVIDER_RESOLUTIONS,
  PROVIDER_RESOLUTION_LABELS,
  PROVIDER_ASPECT_RATIOS,
  ASPECT_RATIO_LABELS,
  PROVIDER_CONSOLE_URLS,
} from '@/utils/constants'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    apiKeys,
    currentProvider,
    resolution,
    aspectRatio,
    model,
    autoDownload,
    setApiKey,
    setCurrentProvider,
    setResolution,
    setAspectRatio,
    setModel,
    toggleAutoDownload,
  } = useSettingsStore()

  // Get provider-specific options
  const providerModels = PROVIDER_MODELS[currentProvider]
  const providerResolutions = PROVIDER_RESOLUTIONS[currentProvider]
  const providerResolutionLabels = PROVIDER_RESOLUTION_LABELS[currentProvider]
  const providerAspectRatios = PROVIDER_ASPECT_RATIOS[currentProvider]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-900 border-l border-gray-800 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Current Provider */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Cpu className="h-4 w-4" />
              AI Provider
            </label>
            <div className="flex gap-2 flex-wrap">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  onClick={() => setCurrentProvider(provider)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    currentProvider === provider
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {PROVIDER_LABELS[provider]}
                </button>
              ))}
            </div>
          </div>

          {/* API Keys for all providers */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Key className="h-4 w-4" />
              API Keys
            </label>
            <div className="space-y-3">
              {PROVIDERS.map((provider) => (
                <div key={provider}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{PROVIDER_LABELS[provider]}</span>
                    {currentProvider === provider && (
                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">현재</span>
                    )}
                  </div>
                  <Input
                    type="password"
                    value={apiKeys[provider]}
                    onChange={(e) => setApiKey(provider, e.target.value)}
                    placeholder={`Enter ${PROVIDER_LABELS[provider]} API key`}
                  />
                  <a
                    href={PROVIDER_CONSOLE_URLS[provider]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Get API key
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Model (provider-specific) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Cpu className="h-4 w-4" />
              Model ({PROVIDER_LABELS[currentProvider]})
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providerModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Resolution (provider-specific) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Monitor className="h-4 w-4" />
              Resolution
            </label>
            <div className="flex gap-2 flex-wrap">
              {providerResolutions.map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    resolution === res
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {providerResolutionLabels[res] || res}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio (provider-specific) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Ratio className="h-4 w-4" />
              Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {providerAspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {ASPECT_RATIO_LABELS[ratio] || ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Download */}
          <div>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">
                Auto-download generated images
              </span>
              <button
                onClick={toggleAutoDownload}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoDownload ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    autoDownload ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Settings are saved automatically
          </p>
        </div>
      </div>
    </>
  )
}
