import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveImages, deleteImages, loadAllImages, loadImages } from '@/services/imageStorage'

export type QueueItemStatus = 'pending' | 'generating' | 'completed' | 'error'

export interface QueueItem {
  id: string
  prompt: string
  referenceImages?: string[] // base64
  resolution: string
  aspectRatio: string
  model: string
  provider: string
  status: QueueItemStatus
  progress?: number
  statusMessage?: string
  thoughtTexts?: string[]
  interimImages?: string[]
  finalImage?: string // 단일 이미지 (하위 호환)
  finalImages?: string[] // 복수 이미지 (1~4장)
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  elapsedTime?: number
}

interface QueueState {
  items: QueueItem[]
  currentItemId: string | null
}

interface QueueActions {
  addItem: (item: Omit<QueueItem, 'id' | 'status' | 'createdAt'>) => string
  removeItem: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
  rerunItem: (id: string) => Promise<void>

  // Processing
  startProcessing: (id: string) => void
  updateProgress: (id: string, progress: number) => void
  setStatusMessage: (id: string, message: string) => void
  updateElapsedTime: (id: string) => void
  addThoughtText: (id: string, text: string) => void
  addInterimImage: (id: string, image: string) => void
  completeItem: (id: string, finalImage: string, elapsedTime: number) => void
  failItem: (id: string, error: string) => void

  // Getters
  getNextPending: () => QueueItem | undefined
  getCurrentItem: () => QueueItem | undefined

  // Image loading from IndexedDB
  loadItemImages: (id: string) => Promise<void>
}

type QueueStore = QueueState & QueueActions

export const useQueueStore = create<QueueStore>()(
  persist(
    (set, get) => ({
      items: [],
      currentItemId: null,

      addItem: (itemData) => {
        const id = crypto.randomUUID()
        const newItem: QueueItem = {
          ...itemData,
          id,
          status: 'pending',
          createdAt: Date.now(),
        }
        set((state) => ({
          items: [...state.items, newItem],
        }))

        // Save reference images to IndexedDB (async, fire-and-forget)
        if (itemData.referenceImages && itemData.referenceImages.length > 0) {
          saveImages(id, 'reference', itemData.referenceImages)
        }

        return id
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          currentItemId: state.currentItemId === id ? null : state.currentItemId,
        }))
        // Delete images from IndexedDB (async, fire-and-forget)
        deleteImages(id)
      },

      clearCompleted: () => {
        const itemsToDelete = get().items.filter(
          (item) => item.status === 'completed' || item.status === 'error'
        )
        set((state) => ({
          items: state.items.filter((item) => item.status !== 'completed' && item.status !== 'error'),
        }))
        // Delete images from IndexedDB for cleared items
        itemsToDelete.forEach((item) => deleteImages(item.id))
      },

      clearAll: () => {
        const allItems = get().items
        set({ items: [], currentItemId: null })
        // Delete all images from IndexedDB
        allItems.forEach((item) => deleteImages(item.id))
      },

      rerunItem: async (id) => {
        const item = get().items.find((i) => i.id === id)
        if (!item) return

        // Load reference images from IndexedDB if not in memory
        let referenceImages = item.referenceImages
        if (!referenceImages || referenceImages.length === 0) {
          referenceImages = await loadImages(id, 'reference')
        }

        get().addItem({
          prompt: item.prompt,
          referenceImages,
          resolution: item.resolution,
          aspectRatio: item.aspectRatio,
          model: item.model,
          provider: item.provider,
        })
      },

      startProcessing: (id) => {
        set((state) => ({
          currentItemId: id,
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'generating' as const,
                  progress: 0,
                  statusMessage: '요청 준비 중...',
                  startedAt: Date.now(),
                  thoughtTexts: [],
                  interimImages: [],
                }
              : item
          ),
        }))
      },

      updateProgress: (id, progress) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, progress } : item
          ),
        }))
      },

      setStatusMessage: (id, message) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, statusMessage: message } : item
          ),
        }))
      },

      updateElapsedTime: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && item.startedAt
              ? { ...item, elapsedTime: Date.now() - item.startedAt }
              : item
          ),
        }))
      },

      addThoughtText: (id, text) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, thoughtTexts: [...(item.thoughtTexts || []), text] }
              : item
          ),
        }))
      },

      addInterimImage: (id, image) => {
        const item = get().items.find((i) => i.id === id)
        const interimImages = [...(item?.interimImages || []), image].slice(-2)
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, interimImages }
              : i
          ),
        }))
        // Save interim images to IndexedDB
        saveImages(id, 'interim', interimImages)
      },

      completeItem: (id, finalImage, elapsedTime) => {
        set((state) => ({
          currentItemId: null,
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: 'completed' as const, finalImage, elapsedTime, completedAt: Date.now() }
              : item
          ),
        }))
        // Save final image to IndexedDB
        saveImages(id, 'final', [finalImage])
      },

      failItem: (id, error) => {
        set((state) => ({
          currentItemId: null,
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: 'error' as const, error, completedAt: Date.now() }
              : item
          ),
        }))
      },

      getNextPending: () => {
        return get().items.find((item) => item.status === 'pending')
      },

      getCurrentItem: () => {
        const { items, currentItemId } = get()
        return items.find((item) => item.id === currentItemId)
      },

      loadItemImages: async (id) => {
        const item = get().items.find((i) => i.id === id)
        if (!item) return

        // Skip if images are already loaded in memory
        if (item.finalImage || (item.referenceImages && item.referenceImages.length > 0)) {
          return
        }

        const { referenceImages, interimImages, finalImages } = await loadAllImages(id)

        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  referenceImages: referenceImages.length > 0 ? referenceImages : i.referenceImages,
                  interimImages: interimImages.length > 0 ? interimImages : i.interimImages,
                  finalImage: finalImages.length > 0 ? finalImages[0] : i.finalImage,
                  finalImages: finalImages.length > 0 ? finalImages : i.finalImages,
                }
              : i
          ),
        }))
      },
    }),
    {
      name: 'micromango-queue',
      partialize: (state) => ({
        // Persist items WITHOUT large image data to avoid localStorage quota exceeded
        items: state.items.map((item) => ({
          ...item,
          // Exclude large base64 image data
          referenceImages: undefined,
          finalImage: undefined,
          finalImages: undefined,
          interimImages: undefined,
          thoughtTexts: undefined,
        })),
        currentItemId: null, // Don't persist current processing state
      }),
      onRehydrateStorage: () => (state) => {
        // Reset any "generating" items to "pending" on app reload
        // (in case the browser was closed during generation)
        if (state) {
          state.items = state.items.map((item) =>
            item.status === 'generating'
              ? { ...item, status: 'pending' as const, progress: undefined, statusMessage: undefined, startedAt: undefined }
              : item
          )
        }
      },
    }
  )
)
