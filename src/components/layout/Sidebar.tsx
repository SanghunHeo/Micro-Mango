import { useState } from 'react'
import {
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  DollarSign,
} from 'lucide-react'
import { useSettingsStore, useUsageStore, useQueueStore, formatCost } from '@/stores'
import { PROVIDER_LABELS } from '@/utils/constants'
import { cn } from '@/utils/cn'

interface SidebarProps {
  onOpenSettings: () => void
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const { currentProvider } = useSettingsStore()
  const { totalGenerations, totalEstimatedCost } = useUsageStore()
  const { items } = useQueueStore()

  const generatingCount = items.filter((i) => i.status === 'generating' || i.status === 'pending').length

  return (
    <aside
      className={cn(
        'h-full bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo - click to expand when collapsed */}
      <button
        onClick={() => collapsed && setCollapsed(false)}
        className={cn(
          'h-14 flex items-center px-4 border-b border-[var(--border-subtle)] w-full text-left',
          collapsed && 'hover:bg-[var(--bg-tertiary)] cursor-pointer'
        )}
      >
        <Sparkles className="h-6 w-6 text-yellow-400 flex-shrink-0" />
        {!collapsed && (
          <span className="ml-2 text-lg font-bold text-white whitespace-nowrap">
            Micro Mango
          </span>
        )}
      </button>

      {/* Current Provider Display */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-[var(--border-subtle)]">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Current Provider
          </div>
          <div className="text-sm text-white font-medium">
            {PROVIDER_LABELS[currentProvider]}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      <div className={cn(
        'border-t border-[var(--border-subtle)]',
        collapsed ? 'p-2' : 'px-3 py-3'
      )}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center">
              <Zap className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-white font-medium">{totalGenerations}</span>
            </div>
            <div className="flex flex-col items-center">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-green-400 font-medium">
                {formatCost(totalEstimatedCost).replace('$', '')}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Generations
              </span>
              <span className="text-white font-medium">{totalGenerations}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Est. Cost
              </span>
              <span className="text-green-400 font-medium">
                {formatCost(totalEstimatedCost)}
              </span>
            </div>
            {generatingCount > 0 && (
              <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-700">
                <span className="text-yellow-400/70">In progress</span>
                <span className="text-yellow-400 font-medium">{generatingCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings & Collapse */}
      <div className={cn(
        'p-2 border-t border-[var(--border-subtle)]',
        collapsed ? 'flex flex-col gap-1' : 'flex items-center gap-1'
      )}>
        <button
          onClick={onOpenSettings}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors',
            collapsed ? 'justify-center' : 'flex-1'
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors',
            collapsed && 'w-full flex justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
