import { useQueueStore } from '@/stores'
import { QueueItemRow } from './QueueItemRow'
import { Sparkles } from 'lucide-react'

export function QueueList() {
  const { items } = useQueueStore()

  // Sort: generating first, then pending, then completed (newest first)
  const sortedItems = [...items].sort((a, b) => {
    const statusOrder = { generating: 0, pending: 1, completed: 2, error: 3 }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return b.createdAt - a.createdAt
  })

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Sparkles className="h-20 w-20 mb-6 text-yellow-400/30" />
        <h2 className="text-2xl font-medium text-gray-300 mb-3">Welcome to Micro Mango</h2>
        <p className="text-center max-w-md text-gray-500 leading-relaxed">
          Enter a prompt above to start generating images.
          <br />
          <span className="text-sm">Drag & drop or paste images as reference.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 max-w-5xl mx-auto px-0 sm:px-4">
        {sortedItems.map((item) => (
          <QueueItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
