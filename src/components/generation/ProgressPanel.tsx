import { ThinkingDots, ProgressBar } from '@/components/ui'
import type { GenerationStep } from '@/stores'
import { base64ToDataUrl } from '@/utils/imageUtils'
import { Brain, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ProgressPanelProps {
  step: GenerationStep
  thoughtTexts: string[]
  interimImages: string[]
  elapsedTime: number
}

export function ProgressPanel({ step, thoughtTexts, interimImages, elapsedTime }: ProgressPanelProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${seconds}s`
  }

  const getProgress = () => {
    switch (step) {
      case 'thinking': return 30
      case 'generating': return 70
      case 'complete': return 100
      case 'error': return 0
      default: return 0
    }
  }

  const getStepIcon = () => {
    switch (step) {
      case 'thinking':
        return <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
      case 'generating':
        return <ImageIcon className="h-5 w-5 text-blue-400 animate-pulse" />
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />
      default:
        return null
    }
  }

  const getStepLabel = () => {
    switch (step) {
      case 'thinking': return 'Thinking...'
      case 'generating': return 'Generating image...'
      case 'complete': return 'Complete!'
      case 'error': return 'Error occurred'
      default: return ''
    }
  }

  return (
    <div className="p-4 bg-gray-900/50 border-y border-gray-800">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStepIcon()}
          <span className="text-sm font-medium text-white">{getStepLabel()}</span>
          {step !== 'complete' && step !== 'error' && <ThinkingDots />}
        </div>
        <span className="text-xs text-gray-500">{formatTime(elapsedTime)}</span>
      </div>

      {/* Progress bar */}
      <ProgressBar progress={getProgress()} className="mb-4" />

      {/* Thought texts */}
      {thoughtTexts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI Thinking Process
          </h4>
          <div className="bg-gray-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
            {thoughtTexts.map((text, index) => (
              <p
                key={index}
                className={cn(
                  'text-sm text-gray-300',
                  index === thoughtTexts.length - 1 && 'text-white'
                )}
              >
                {text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Interim images */}
      {interimImages.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Interim Images ({interimImages.length}/2)
          </h4>
          <div className="flex gap-2 flex-wrap">
            {interimImages.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={base64ToDataUrl(image)}
                  alt={`Interim ${index + 1}`}
                  className="h-24 w-auto rounded-lg border border-gray-700 opacity-70"
                />
                <span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-1 rounded">
                  Draft {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
