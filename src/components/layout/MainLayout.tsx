import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-950">
      {children}
    </main>
  )
}
