import { cn } from '@/utils/cn'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-600 border-t-blue-500',
        sizes[size],
        className
      )}
    />
  )
}

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="h-2 w-2 bg-blue-500 rounded-full animate-thinking-dot" />
      <div className="h-2 w-2 bg-blue-500 rounded-full animate-thinking-dot" />
      <div className="h-2 w-2 bg-blue-500 rounded-full animate-thinking-dot" />
    </div>
  )
}
