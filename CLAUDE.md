# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Micro Mango (codenamed "Nano Banana") is a multi-provider AI image generation web application. It supports three AI image providers:
- **Google Nano Banana** (Gemini 3 Pro Image) - with real-time thinking/streaming
- **OpenAI Images** (GPT-Image-1.5)
- **BytePlus Seedream** (Seedream 4.5)

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript compile + Vite production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Architecture

### Multi-Provider System

The app uses a factory pattern for provider abstraction:

- **IImageProvider interface** ([types.ts](src/services/api/types.ts)) - defines `generateImageStream()` contract with callbacks for thinking text, interim images, and final output
- **Provider Factory** ([providerFactory.ts](src/services/api/providerFactory.ts)) - returns the appropriate provider implementation based on `Provider` type
- **Provider implementations** in `src/services/api/providers/` - each implements streaming generation with provider-specific API handling

When adding a new provider:
1. Add to `PROVIDERS` array in [constants.ts](src/utils/constants.ts)
2. Configure provider-specific models, resolutions, aspect ratios, and endpoints
3. Implement `IImageProvider` interface in `src/services/api/providers/`
4. Register in provider factory

### State Management (Zustand)

Four stores with localStorage persistence via zustand middleware:

| Store | Purpose |
|-------|---------|
| `settingsStore` | API keys (per-provider), current provider, resolution, aspect ratio, model |
| `generationStore` | Generation state, thought texts, interim/final images, timing |
| `chatStore` | Message history with images |
| `inputStore` | Current input state for real-time token calculation |

The settings store handles provider switching by resetting resolution/aspectRatio to valid values for the new provider.

### Streaming Generation Flow

1. User submits prompt → `ChatInput` dispatches to generation store
2. `useImageGeneration` hook calls provider via factory
3. Provider streams SSE responses, invoking callbacks:
   - `onThoughtText` - AI thinking process (Google only)
   - `onInterimImage` - intermediate previews
   - `onFinalImage` - completed generation
4. Store updates trigger UI re-renders

### Component Organization

- `components/chat/` - Chat UI (input, messages, image preview)
- `components/generation/` - Progress panel with thinking display
- `components/layout/` - Header, main layout, token estimator
- `components/settings/` - Settings panel (slide-over)
- `components/ui/` - Reusable UI primitives (Button, Card, Input, etc.)

### Path Aliases

Uses `@/` alias for `src/` directory (configured in tsconfig).

## Tech Stack

- React 19 + TypeScript + Vite 7
- Tailwind CSS 4 (via @tailwindcss/vite plugin)
- Zustand 5 with persist middleware
- @google/generative-ai SDK
- lucide-react icons
- react-dropzone for image upload
