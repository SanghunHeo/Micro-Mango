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
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
        <Sparkles className="h-16 w-16 mb-4 text-yellow-400/50" />
        <h2 className="text-xl font-medium text-gray-400 mb-2">Welcome to Micro Mango</h2>
        <p className="text-center max-w-md text-gray-500">
          Enter a prompt above to start generating images.
          <br />
          <span className="text-sm">Drag & drop or paste images as reference.</span>
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4 max-w-4xl mx-auto">
        {sortedItems.map((item) => (
          <QueueItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
