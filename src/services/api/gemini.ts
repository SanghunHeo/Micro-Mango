import { GEMINI_MODELS, API_ENDPOINT } from '@/utils/constants'
import type { AnalysisResult } from './types'

export async function analyzeImage(
  apiKey: string,
  imageBase64: string
): Promise<AnalysisResult | { error: string }> {
  const model = GEMINI_MODELS.IMAGE_ANALYSIS
  const endpoint = `${API_ENDPOINT}/${model}:generateContent?key=${apiKey}`

  const systemPrompt = `Analyze the provided image and extract the following information in JSON format:
{
  "keywords": ["list", "of", "key", "visual", "elements"],
  "description": "A detailed description of the image",
  "suggestedPrompt": "A prompt that could recreate this image",
  "style": "The art style or visual style of the image"
}

Focus on:
1. Key visual elements and subjects
2. Color palette and mood
3. Art style (realistic, anime, illustration, etc.)
4. Composition and layout
5. Notable details

Respond ONLY with valid JSON, no other text.`

  const body = {
    contents: [{
      parts: [
        { text: systemPrompt },
        {
          inline_data: {
            mime_type: 'image/png',
            data: imageBase64,
          },
        },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { error: errorData.error?.message || `API error: ${response.status}` }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return { error: 'No analysis result' }
    }

    try {
      const result = JSON.parse(text) as AnalysisResult
      return result
    } catch {
      return { error: 'Failed to parse analysis result' }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
