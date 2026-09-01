const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
const DEFAULT_TIMEOUT_MS = 30000

const STORY_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    source_index: { type: 'integer' },
    headline: { type: 'string' },
    dek: { type: 'string' },
    body: { type: 'string' },
    category: { type: 'string', enum: ['MUSIC', 'CULTURE', 'STYLE', 'FILM', 'ART', 'EVENTS'] },
  },
  required: ['source_index', 'headline', 'dek', 'body', 'category'],
}

const BATCH_STORY_SCHEMA = {
  type: 'object',
  properties: {
    stories: {
      type: 'array',
      items: STORY_ITEM_SCHEMA,
    },
  },
  required: ['stories'],
}

function extractText(data) {
  return data?.candidates?.flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || '')
    .join('')
    .trim() || ''
}

async function callGemini({ apiKey, model = DEFAULT_MODEL, prompt, timeoutMs = DEFAULT_TIMEOUT_MS, schema }) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 6000,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
      signal: controller.signal,
    })

    const responseText = await response.text()
    if (!response.ok) throw new Error(`Gemini returned ${response.status}: ${responseText}`)

    const data = JSON.parse(responseText)
    const text = extractText(data)
    if (!text) throw new Error('Gemini returned no text output.')

    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 800)}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function draftStoriesWithGemini({ apiKey, model = DEFAULT_MODEL, prompt, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const result = await callGemini({
    apiKey,
    model,
    prompt,
    timeoutMs,
    schema: BATCH_STORY_SCHEMA,
  })
  if (!result || !Array.isArray(result.stories)) {
    throw new Error('Gemini returned an invalid batch response: stories array missing.')
  }
  return result.stories
}

// Kept for compatibility with the optional API route and any existing integrations.
async function draftStoryWithGemini({ apiKey, model = DEFAULT_MODEL, prompt, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const result = await callGemini({
    apiKey,
    model,
    prompt,
    timeoutMs,
    schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        dek: { type: 'string' },
        body: { type: 'string' },
        category: { type: 'string', enum: ['MUSIC', 'CULTURE', 'STYLE', 'FILM', 'ART', 'EVENTS'] },
      },
      required: ['headline', 'dek', 'body', 'category'],
    },
  })
  return result
}

module.exports = {
  DEFAULT_MODEL,
  STORY_ITEM_SCHEMA,
  BATCH_STORY_SCHEMA,
  draftStoriesWithGemini,
  draftStoryWithGemini,
}
