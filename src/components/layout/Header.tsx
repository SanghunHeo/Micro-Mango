import { Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import { TokenEstimator } from './TokenEstimator'

interface HeaderProps {
  onOpenSettings: () => void
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Sparkles className="h-6 w-6 text-yellow-400" />
          <h1 className="text-lg font-bold text-white">Nano Banana</h1>
          <span className="text-xs text-gray-500 hidden lg:inline">AI Image Generator</span>
        </div>

        {/* Token Estimator - Center */}
        <div className="hidden md:flex flex-1 justify-center mx-4">
          <TokenEstimator />
        </div>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="text-gray-400 hover:text-white flex-shrink-0"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Token Estimator */}
      <div className="md:hidden border-t border-gray-800 px-4 py-2 flex justify-center">
        <TokenEstimator />
      </div>
    </header>
  )
}
