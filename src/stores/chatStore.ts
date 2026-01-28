import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  images?: string[] // base64 images
  metadata?: {
    resolution?: string
    generationTime?: number
    model?: string
    prompt?: string
  }
  timestamp: number
}

interface ChatState {
  messages: ChatMessage[]
}

interface ChatActions {
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  deleteMessage: (id: string) => void
  clearHistory: () => void
}

type ChatStore = ChatState & ChatActions

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],

      addMessage: (message) => {
        const id = crypto.randomUUID()
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id,
              timestamp: Date.now(),
            },
          ],
        }))
        return id
      },

      updateMessage: (id, updates) => set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      })),

      deleteMessage: (id) => set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
      })),

      clearHistory: () => set({ messages: [] }),
    }),
    {
      name: 'nanobanana-chat',
    }
  )
)
