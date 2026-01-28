import { create } from 'zustand'

export type GenerationStep = 'idle' | 'thinking' | 'generating' | 'complete' | 'error'

interface GenerationMetadata {
  prompt: string
  resolution: string
  model: string
  aspectRatio: string
  thoughtSignature?: string
}

interface GenerationState {
  isGenerating: boolean
  currentStep: GenerationStep

  // Real data from API
  thoughtTexts: string[]
  interimImages: string[]
  finalImage: string | null

  // Time tracking
  startTime: number | null
  elapsedTime: number

  // Error handling
  error: string | null

  // Metadata for download
  metadata: GenerationMetadata | null
}

interface GenerationActions {
  startGeneration: (metadata: GenerationMetadata) => void
  addThoughtText: (text: string) => void
  addInterimImage: (image: string) => void
  setFinalImage: (image: string) => void
  updateElapsedTime: () => void
  completeGeneration: () => void
  failGeneration: (error: string) => void
  reset: () => void
}

type GenerationStore = GenerationState & GenerationActions

const initialState: GenerationState = {
  isGenerating: false,
  currentStep: 'idle',
  thoughtTexts: [],
  interimImages: [],
  finalImage: null,
  startTime: null,
  elapsedTime: 0,
  error: null,
  metadata: null,
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  ...initialState,

  startGeneration: (metadata) => set({
    isGenerating: true,
    currentStep: 'thinking',
    thoughtTexts: [],
    interimImages: [],
    finalImage: null,
    startTime: Date.now(),
    elapsedTime: 0,
    error: null,
    metadata,
  }),

  addThoughtText: (text) => set((state) => ({
    thoughtTexts: [...state.thoughtTexts, text],
  })),

  addInterimImage: (image) => set((state) => ({
    interimImages: [...state.interimImages, image],
    currentStep: 'generating',
  })),

  setFinalImage: (image) => set({
    finalImage: image,
    currentStep: 'complete',
  }),

  updateElapsedTime: () => {
    const { startTime } = get()
    if (startTime) {
      set({ elapsedTime: Date.now() - startTime })
    }
  },

  completeGeneration: () => set({
    isGenerating: false,
    currentStep: 'complete',
  }),

  failGeneration: (error) => set({
    isGenerating: false,
    currentStep: 'error',
    error,
  }),

  reset: () => set(initialState),
}))
