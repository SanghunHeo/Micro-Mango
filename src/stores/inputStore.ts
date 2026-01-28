import { create } from 'zustand'

interface InputState {
  currentText: string
  currentImages: File[]
}

interface InputActions {
  setCurrentText: (text: string) => void
  setCurrentImages: (images: File[]) => void
  addImage: (image: File) => void
  removeImage: (index: number) => void
  clearInput: () => void
}

type InputStore = InputState & InputActions

export const useInputStore = create<InputStore>((set) => ({
  currentText: '',
  currentImages: [],

  setCurrentText: (text) => set({ currentText: text }),

  setCurrentImages: (images) => set({ currentImages: images }),

  addImage: (image) => set((state) => ({
    currentImages: [...state.currentImages, image],
  })),

  removeImage: (index) => set((state) => ({
    currentImages: state.currentImages.filter((_, i) => i !== index),
  })),

  clearInput: () => set({ currentText: '', currentImages: [] }),
}))
