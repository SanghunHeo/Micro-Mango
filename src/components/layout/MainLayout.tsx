import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    // pt-14 for header, md:pt-14 for desktop, pt-24 for mobile (header + token estimator)
    <main className="min-h-screen bg-gray-950 pt-24 md:pt-14">
      <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] md:h-[calc(100vh-3.5rem)] flex flex-col">
        {children}
      </div>
    </main>
  )
}
