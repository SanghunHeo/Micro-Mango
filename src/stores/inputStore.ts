import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PendingPrompt {
  prompt: string
  referenceImages?: string[] // base64
}

export interface PromptHistoryItem {
  id: string
  prompt: string
  timestamp: number
}

const MAX_HISTORY_ITEMS = 50

interface InputState {
  currentText: string
  currentImages: File[]
  pendingPrompt: PendingPrompt | null
  promptHistory: PromptHistoryItem[]
}

interface InputActions {
  setCurrentText: (text: string) => void
  setCurrentImages: (images: File[]) => void
  addImage: (image: File) => void
  removeImage: (index: number) => void
  clearInput: () => void
  setPendingPrompt: (prompt: string, referenceImages?: string[]) => void
  clearPendingPrompt: () => void
  addToHistory: (prompt: string) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
}

type InputStore = InputState & InputActions

export const useInputStore = create<InputStore>()(
  persist(
    (set, get) => ({
      currentText: '',
      currentImages: [],
      pendingPrompt: null,
      promptHistory: [],

      setCurrentText: (text) => set({ currentText: text }),

      setCurrentImages: (images) => set({ currentImages: images }),

      addImage: (image) => set((state) => ({
        currentImages: [...state.currentImages, image],
      })),

      removeImage: (index) => set((state) => ({
        currentImages: state.currentImages.filter((_, i) => i !== index),
      })),

      clearInput: () => set({ currentText: '', currentImages: [] }),

      setPendingPrompt: (prompt, referenceImages) => set({
        pendingPrompt: { prompt, referenceImages },
      }),

      clearPendingPrompt: () => set({ pendingPrompt: null }),

      addToHistory: (prompt) => {
        const trimmed = prompt.trim()
        if (!trimmed) return

        const existing = get().promptHistory
        // Remove duplicate if exists
        const filtered = existing.filter((item) => item.prompt !== trimmed)
        // Add new item at the beginning
        const newItem: PromptHistoryItem = {
          id: crypto.randomUUID(),
          prompt: trimmed,
          timestamp: Date.now(),
        }
        set({
          promptHistory: [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS),
        })
      },

      removeFromHistory: (id) => set((state) => ({
        promptHistory: state.promptHistory.filter((item) => item.id !== id),
      })),

      clearHistory: () => set({ promptHistory: [] }),
    }),
    {
      name: 'micromango-input',
      partialize: (state) => ({
        // Only persist history, not current input state
        promptHistory: state.promptHistory,
      }),
    }
  )
)
