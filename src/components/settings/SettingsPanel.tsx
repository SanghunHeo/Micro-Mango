import { useState } from 'react'
import { X, Key, BarChart3, RefreshCw, Copy, Check, Download } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useSettingsStore, useUsageStore, formatCost, PROVIDER_PRICING } from '@/stores'
import {
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_CONSOLE_URLS,
} from '@/utils/constants'
import type { Provider } from '@/utils/constants'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [copiedProvider, setCopiedProvider] = useState<Provider | null>(null)

  const {
    apiKeys,
    currentProvider,
    autoDownload,
    setApiKey,
    toggleAutoDownload,
  } = useSettingsStore()

  const { usage, totalGenerations, totalEstimatedCost, resetUsage } = useUsageStore()

  // Copy API key to clipboard
  const handleCopyApiKey = async (provider: Provider) => {
    const key = apiKeys[provider]
    if (!key) return

    try {
      await navigator.clipboard.writeText(key)
      setCopiedProvider(provider)
      setTimeout(() => setCopiedProvider(null), 2000)
    } catch (err) {
      console.error('Failed to copy API key:', err)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* API Keys */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
              <Key className="h-4 w-4" />
              API Keys
            </label>
            <div className="space-y-4">
              {PROVIDERS.map((provider) => (
                <div key={provider} className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-300 font-medium">{PROVIDER_LABELS[provider]}</span>
                    {currentProvider === provider && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">사용 중</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={apiKeys[provider]}
                      onChange={(e) => setApiKey(provider, e.target.value)}
                      placeholder="API key 입력"
                      className="flex-1 text-sm"
                    />
                    {apiKeys[provider] && (
                      <button
                        onClick={() => handleCopyApiKey(provider)}
                        className="px-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
                        title="Copy API key"
                      >
                        {copiedProvider === provider ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <a
                    href={PROVIDER_CONSOLE_URLS[provider]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                  >
                    API key 발급받기 →
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Auto Download */}
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
            <label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  자동 다운로드
                </span>
              </div>
              <button
                onClick={toggleAutoDownload}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoDownload ? 'bg-yellow-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    autoDownload ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              생성 완료 시 이미지 자동 저장
            </p>
          </div>

          {/* Usage Statistics */}
          <div className="border-t border-[var(--border-subtle)] pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <BarChart3 className="h-4 w-4" />
                사용량 통계
              </label>
              <button
                onClick={() => resetUsage()}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                title="통계 초기화"
              >
                <RefreshCw className="h-3 w-3" />
                초기화
              </button>
            </div>

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg p-4 mb-4 border border-yellow-900/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">총 생성 횟수</p>
                  <p className="text-2xl font-bold text-white">{totalGenerations}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">예상 총 비용</p>
                  <p className="text-2xl font-bold text-green-400">{formatCost(totalEstimatedCost)}</p>
                </div>
              </div>
            </div>

            {/* Per-Provider Usage */}
            <div className="space-y-3">
              {PROVIDERS.map((provider) => {
                const providerUsage = usage[provider as Provider]
                const pricing = PROVIDER_PRICING[provider as Provider]
                const successRate = providerUsage.generationCount > 0
                  ? Math.round((providerUsage.successCount / providerUsage.generationCount) * 100)
                  : 0

                return (
                  <div
                    key={provider}
                    className={`p-3 rounded-lg border transition-colors ${
                      currentProvider === provider
                        ? 'bg-yellow-900/10 border-yellow-700/50'
                        : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        {PROVIDER_LABELS[provider as Provider]}
                      </span>
                      {currentProvider === provider && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">사용 중</span>
                      )}
                    </div>

                    {providerUsage.generationCount > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">생성</span>
                          <span className="text-gray-300">
                            {providerUsage.successCount}회 성공 / {providerUsage.failureCount}회 실패
                            <span className="text-gray-500 ml-1">({successRate}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">예상 비용</span>
                          <span className="text-green-400 font-medium">{formatCost(providerUsage.estimatedCost)}</span>
                        </div>
                        {providerUsage.lastUsed && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">마지막 사용</span>
                            <span className="text-gray-400">
                              {new Date(providerUsage.lastUsed).toLocaleString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">아직 사용 기록 없음</p>
                    )}

                    <p className="text-[10px] text-gray-600 mt-2">{pricing.note}</p>
                  </div>
                )
              })}
            </div>

            <p className="text-[10px] text-gray-600 mt-4 text-center">
              * 예상 비용은 참고용이며 실제 청구 금액과 다를 수 있습니다
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-gray-500 text-center">
            설정은 자동으로 저장됩니다
          </p>
        </div>
      </div>
    </>
  )
}
