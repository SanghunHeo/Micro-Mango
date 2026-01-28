import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
  headerHeight?: number
}

export function MainLayout({ children, headerHeight = 64 }: MainLayoutProps) {
  return (
    <main
      className="min-h-screen bg-gray-950 transition-[padding-top] duration-150"
      style={{ paddingTop: `${headerHeight}px` }}
    >
      <div
        className="overflow-y-auto"
        style={{ height: `calc(100vh - ${headerHeight}px)` }}
      >
        {children}
      </div>
    </main>
  )
}
