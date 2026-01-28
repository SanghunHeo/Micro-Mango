import { useMemo } from 'react'
import { Coins, Image as ImageIcon, Type, ArrowRight, Receipt, ExternalLink } from 'lucide-react'
import { useInputStore, useSettingsStore } from '@/stores'
import { estimateTokensAndCost, formatTokenCount, formatCostKRW, usdToKrw } from '@/utils/tokenCalculator'
import { PROVIDER_CONSOLE_URLS, PROVIDER_LABELS } from '@/utils/constants'
import { cn } from '@/utils/cn'

export function TokenEstimator() {
  const { currentText, currentImages } = useInputStore()
  const { resolution, currentProvider } = useSettingsStore()

  const estimate = useMemo(() => {
    return estimateTokensAndCost(currentText, currentImages, resolution, currentProvider)
  }, [currentText, currentImages, resolution, currentProvider])

  const hasInput = currentText.length > 0 || currentImages.length > 0
  const costKRW = usdToKrw(estimate.cost.total)

  return (
    <div className={cn(
      'flex items-center gap-2 text-xs transition-opacity duration-200',
      hasInput ? 'opacity-100' : 'opacity-50'
    )}>
      {/* Input Tokens */}
      <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1">
        <div className="flex items-center gap-1 text-gray-400">
          <ArrowRight className="h-3 w-3" />
          <span>In</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          {/* Text tokens */}
          <div className="flex items-center gap-0.5" title="텍스트 토큰">
            <Type className="h-3 w-3 text-blue-400" />
            <span>{formatTokenCount(estimate.inputTokens.text)}</span>
          </div>
          {/* Image tokens */}
          {currentImages.length > 0 && (
            <div className="flex items-center gap-0.5" title="이미지 토큰">
              <ImageIcon className="h-3 w-3 text-green-400" />
              <span>{formatTokenCount(estimate.inputTokens.images)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Output Tokens */}
      <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1">
        <div className="flex items-center gap-1 text-gray-400">
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span>Out</span>
        </div>
        <div className="flex items-center gap-0.5 text-gray-300" title={`${resolution} 이미지 출력`}>
          <ImageIcon className="h-3 w-3 text-purple-400" />
          <span>{formatTokenCount(estimate.outputTokens.image)}</span>
          <span className="text-gray-500 text-[10px]">({resolution})</span>
        </div>
      </div>

      {/* Estimated Cost in KRW */}
      <div className={cn(
        'flex items-center gap-1 rounded-lg px-2 py-1 font-medium',
        costKRW > 150 ? 'bg-yellow-900/30 text-yellow-400' :
        costKRW > 70 ? 'bg-orange-900/30 text-orange-400' :
        'bg-gray-800/50 text-gray-300'
      )} title={`예상 비용: $${estimate.cost.total.toFixed(4)} USD`}>
        <Receipt className="h-3 w-3" />
        <span>{formatCostKRW(estimate.cost.total)}</span>
      </div>

      {/* Total Tokens */}
      <div className="flex items-center gap-1 text-gray-500" title="총 토큰 (입력 + 출력)">
        <Coins className="h-3 w-3" />
        <span>{formatTokenCount(estimate.inputTokens.total + estimate.outputTokens.total)}</span>
      </div>

      {/* Billing Link */}
      <a
        href={PROVIDER_CONSOLE_URLS[currentProvider]}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-0.5 text-gray-500 hover:text-blue-400 transition-colors"
        title={`${PROVIDER_LABELS[currentProvider]} 콘솔에서 청구 내역 확인`}
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}
