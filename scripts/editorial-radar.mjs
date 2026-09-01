import fs from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { draftStoriesWithGemini, DEFAULT_MODEL } = require('../lib/gemini-editorial.cjs')

const SOURCES = [
  { name: 'The NATIVE', url: process.env.EDITORIAL_NATIVE_FEED || 'https://thenativemag.com/feed/', weight: 12 },
  { name: 'The NATIVE Music', url: process.env.EDITORIAL_NATIVE_MUSIC_FEED || 'https://thenativemag.com/category/music/feed/', weight: 14 },
  { name: 'NotJustOk', url: process.env.EDITORIAL_NOTJUSTOK_FEED || 'https://notjustok.com/feed/', weight: 13 },
  { name: 'tooXclusive', url: process.env.EDITORIAL_TOOXCLUSIVE_FEED || 'https://tooxclusive.com/feed/', weight: 11 },
  { name: 'Naijaloaded', url: process.env.EDITORIAL_NAIJALOADED_FEED || 'https://www.naijaloaded.com.ng/feed/', weight: 9 },
  { name: 'PUNCH Entertainment', url: 'https://rss.punchng.com/v1/category/entertainment', weight: 8 },
  { name: 'PUNCH Interviews', url: 'https://rss.punchng.com/v1/category/interview', weight: 8 },
  { name: 'PUNCH Special Features', url: 'https://rss.punchng.com/v1/category/special_feature', weight: 7 },
  { name: 'PUNCH Videos', url: 'https://rss.punchng.com/v1/category/videos', weight: 5 },
  { name: 'The Guardian Nigeria', url: process.env.EDITORIAL_GUARDIAN_FEED || 'https://guardian.ng/feed/', weight: 8 },
]

const RELEVANCE_TERMS = [
  'music','artist','singer','rapper','producer','dj','album','single','ep','mixtape','afrobeats','afrobeat','alte','hip-hop','hip hop','amapiano','fuji','highlife','nigeria','nigerian','africa','african','lagos','abuja','accra','ghana','culture','fashion','film','nollywood','photography','art','creative','creator','festival','concert','showcase','event','nightlife','radio','podcast','community','dance','entertainment','visual','design','media','label','recording','streaming','streetwear','gallery','documentary','fashion week','premiere','tour','release','record label','gaming','gaming industry','creative economy'
]

const CATEGORY_RULES = [
  ['MUSIC', /(album|single|ep|singer|rapper|producer|dj|music|afrobeats|afrobeat|alte|amapiano|fuji|highlife|record label|release|tour)/i],
  ['STYLE', /(fashion|style|streetwear|designer|design|fashion week)/i],
  ['FILM', /(film|nollywood|cinema|movie|documentary|premiere|actor|actress)/i],
  ['ART', /(art|photograph|visual|gallery|creative|creator|gaming)/i],
  ['EVENTS', /(concert|festival|showcase|event|nightlife|tour)/i],
]

const MAX_SOURCE_ITEMS = Number(process.env.EDITORIAL_SOURCE_ITEMS || 18)
const MAX_STORIES = Number(process.env.EDITORIAL_MAX_STORIES_PER_SCAN || 4)
const MAX_AGE_HOURS = Number(process.env.EDITORIAL_MAX_AGE_HOURS || 96)
const FETCH_TIMEOUT_MS = Number(process.env.EDITORIAL_FETCH_TIMEOUT_MS || 6500)
const IMAGE_FETCH_TIMEOUT_MS = Number(process.env.EDITORIAL_IMAGE_FETCH_TIMEOUT_MS || 5000)
const GEMINI_TIMEOUT_MS = Number(process.env.EDITORIAL_GEMINI_TIMEOUT_MS || 15000)

function decode(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim()
}
function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')
  return block.match(re)?.[1] || ''
}
function imageFrom(block) {
  const media = block.match(/<media:(?:content|thumbnail)[^>]+url=[\"']([^\"']+)[\"']/i)
    || block.match(/<enclosure[^>]+url=[\"']([^\"']+)[\"']/i)
    || block.match(/<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i)
  return media?.[1] || ''
}

function absoluteUrl(value, baseUrl) {
  if (!value) return ''
  try { return new URL(value, baseUrl).toString() } catch { return '' }
}

function imageFromHtml(html, pageUrl) {
  const candidates = [
    html.match(/<meta[^>]+property=[\"']og:image(?::secure_url)?[\"'][^>]+content=[\"']([^\"']+)[\"']/i)?.[1],
    html.match(/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:image(?::secure_url)?[\"']/i)?.[1],
    html.match(/<meta[^>]+name=[\"']twitter:image(?::src)?[\"'][^>]+content=[\"']([^\"']+)[\"']/i)?.[1],
    html.match(/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+name=[\"']twitter:image(?::src)?[\"']/i)?.[1],
    html.match(/<link[^>]+rel=[\"'][^\"']*image_src[^\"']*[\"'][^>]+href=[\"']([^\"']+)[\"']/i)?.[1],
  ]
  return candidates.map(value => absoluteUrl(value, pageUrl)).find(Boolean) || ''
}

async function fetchArticleImage(pageUrl) {
  if (!pageUrl) return ''
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'FOR-THE-CULTURE-Editorial-Radar/6.0',
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: controller.signal,
      redirect: 'follow'
    })
    if (!response.ok) return ''
    const html = (await response.text()).slice(0, 1000000)
    return imageFromHtml(html, pageUrl)
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

async function enrichImage(item) {
  const feedImage = absoluteUrl(item.image_url, item.source_url)
  if (feedImage) return feedImage
  return await fetchArticleImage(item.source_url)
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
function parseFeed(xml, sourceName, sourceWeight) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
  return blocks.slice(0, MAX_SOURCE_ITEMS).map(block => {
    const rawTitle = tag(block, 'title')
    const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i)
    const rawLink = decode(tag(block, 'link') || linkMatch?.[1] || '')
    const rawDate = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date')
    const description = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded') || tag(block, 'content')
    return { source_name: sourceName, source_weight: sourceWeight, title: decode(rawTitle), source_url: rawLink, excerpt: decode(description).slice(0, 1800), published_at: parseDate(rawDate), image_url: imageFrom(block) }
  }).filter(item => item.title && item.source_url)
}
async function fetchFeed(source) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(source.url, { headers: { 'User-Agent': 'FOR-THE-CULTURE-Editorial-Radar/6.0', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }, signal: controller.signal, redirect: 'follow' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return { source, items: parseFeed(await response.text(), source.name, source.weight) }
  } finally { clearTimeout(timer) }
}
function relevance(item) {
  const text = `${item.title} ${item.excerpt}`.toLowerCase(); let score = item.source_weight || 0
  for (const term of RELEVANCE_TERMS) if (text.includes(term)) score += term.includes(' ') ? 3 : 1
  if (/(nigeria|nigerian|africa|african|lagos|abuja|accra|ghana)/i.test(text)) score += 8
  const ageHours = item.published_at ? Math.max(0, (Date.now() - Date.parse(item.published_at)) / 36e5) : 999
  if (ageHours <= 6) score += 16; else if (ageHours <= 24) score += 12; else if (ageHours <= 48) score += 8; else if (ageHours <= MAX_AGE_HOURS) score += 4; else score -= 30
  return Math.max(0, Math.min(100, score))
}
function category(item) {
  const text = `${item.title} ${item.excerpt}`
  for (const [name, rule] of CATEGORY_RULES) if (rule.test(text)) return name
  return 'CULTURE'
}
function normalizeTitle(title) { return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() }
function normalizeUrl(url) { try { const parsed = new URL(url); parsed.hash = ''; parsed.search = ''; return parsed.toString().replace(/\/$/, '') } catch { return String(url || '').trim() } }
function titleTokens(title) { return new Set(normalizeTitle(title).split(/\s+/).filter(token => token.length > 2)) }
function similarity(a, b) { const A = titleTokens(a), B = titleTokens(b); if (!A.size || !B.size) return 0; let intersection = 0; for (const token of A) if (B.has(token)) intersection++; return intersection / (A.size + B.size - intersection) }

function buildBatchPrompt(items) {
  const packet = items.map((item, index) => [
    `STORY ${index + 1}`,
    `source_index: ${index}`,
    `source_name: ${item.source_name}`,
    `original_headline: ${item.title}`,
    `original_url: ${item.source_url}`,
    `source_published_at: ${item.published_at || ''}`,
    `source_excerpt: ${item.excerpt}`,
    `suggested_category: ${category(item)}`,
  ].join('\n')).join('\n\n')

  return `You are the editorial desk for FOR THE CULTURE, an African music, culture and entertainment platform by Galaxy Fire Studios.

Create ORIGINAL editorial news stories for every supplied candidate that is suitable for publication. Return one JSON object containing a "stories" array. Each story must include the exact source_index supplied for its candidate so the newsroom can match the finished story to the correct source.

Do not copy phrases, sentence structures or distinctive wording from the source. Do not invent facts, quotes, dates, names, numbers or details that are not supported by the supplied metadata. You may add useful context only when it is directly supported by the supplied material. Do not pretend to have read the full source article beyond the metadata provided here.

Each published story should feel like a confident human FOR THE CULTURE newsroom story rather than a generic AI summary:
- headline: punchy, factual and original.
- dek: one clear sentence that adds useful context.
- body: 4–6 mobile-friendly paragraphs, approximately 300–450 words.
- Give the story enough context to feel substantial, but stay strictly within the supplied facts.
- Attribute the source naturally where appropriate.
- category: MUSIC, CULTURE, STYLE, FILM, ART or EVENTS.
- Return a story for each candidate unless the supplied metadata is genuinely insufficient to write a factual story. Never invent missing information to fill a gap.

SOURCE CANDIDATES:

${packet}`
}

async function draftStories(items) {
  if (!items.length) return []

  let lastError
  const maxAttempts = Number(process.env.EDITORIAL_GEMINI_ATTEMPTS || 1)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await draftStoriesWithGemini({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.EDITORIAL_MODEL || DEFAULT_MODEL,
        prompt: buildBatchPrompt(items),
        timeoutMs: GEMINI_TIMEOUT_MS,
      })
    } catch (error) {
      lastError = error
      const message = String(error?.message || error)
      // A 429 is a quota/rate-limit response. Retrying immediately only
      // consumes more quota and cannot solve a daily free-tier exhaustion.
      const retryable = /Gemini returned (500|502|503|504)|timed out|aborted|fetch failed/i.test(message)
      if (!retryable || attempt === maxAttempts) break
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
    }
  }

  throw lastError
}

function cleanDraft(draft, item, index) {
  if (!draft || typeof draft !== 'object') throw new Error(`Gemini returned no draft for source ${index}.`)
  const headline = String(draft.headline || '').trim()
  const dek = String(draft.dek || '').trim()
  const body = String(draft.body || '').trim()
  const draftCategory = String(draft.category || '').toUpperCase().trim()
  const allowedCategories = new Set(['MUSIC', 'CULTURE', 'STYLE', 'FILM', 'ART', 'EVENTS'])
  if (!headline || !dek || !body) throw new Error(`Gemini returned an incomplete draft for "${item.title}".`)
  return {
    headline,
    dek,
    body,
    category: allowedCategories.has(draftCategory) ? draftCategory : category(item),
  }
}

async function main() {
  const fetched = await Promise.allSettled(SOURCES.map(fetchFeed))
  const sourceReport = fetched.map((result, index) => ({ source: SOURCES[index].name, ok: result.status === 'fulfilled', items: result.status === 'fulfilled' ? result.value.items.length : 0, error: result.status === 'rejected' ? String(result.reason?.message || result.reason) : null }))
  const candidates = fetched.filter(r => r.status === 'fulfilled').flatMap(r => r.value.items).map(item => ({ ...item, relevance_score: relevance(item) })).filter(item => item.relevance_score >= 10).sort((a,b) => b.relevance_score - a.relevance_score)
  const uniqueCandidates = []
  for (const item of candidates) { if (uniqueCandidates.some(existing => normalizeUrl(existing.source_url) === normalizeUrl(item.source_url) || similarity(existing.title, item.title) >= 0.68)) continue; uniqueCandidates.push(item) }

  let prior = []
  try { prior = JSON.parse(await fs.readFile('public/editorial-feed.json', 'utf8')).stories || [] } catch {}
  const priorUrls = new Set(prior.map(s => normalizeUrl(s.source_url)).filter(Boolean))
  const priorTitles = new Set(prior.map(s => s.source_title || s.headline).filter(Boolean).map(normalizeTitle))
  const newCandidates = uniqueCandidates.filter(item => !priorUrls.has(normalizeUrl(item.source_url)) && !priorTitles.has(normalizeTitle(item.title)))

  const newStories = []
  const failures = []

  const sourceBalancedCandidates = []
  const sourceBuckets = new Map()
  for (const item of newCandidates) {
    const bucket = sourceBuckets.get(item.source_name) || []
    bucket.push(item)
    sourceBuckets.set(item.source_name, bucket)
  }
  const bucketNames = [...sourceBuckets.keys()]
  // Rotate the starting source on each six-hour radar window so the same
  // publication does not repeatedly occupy the first editorial slot.
  const rotationWindow = 6 * 60 * 60 * 1000
  const rotation = bucketNames.length ? Math.floor(Date.now() / rotationWindow) % bucketNames.length : 0
  const rotatedBucketNames = bucketNames.length
    ? bucketNames.slice(rotation).concat(bucketNames.slice(0, rotation))
    : bucketNames
  let round = 0
  while (sourceBalancedCandidates.length < Math.max(MAX_STORIES * 3, 12) && rotatedBucketNames.length) {
    let added = false
    for (const name of rotatedBucketNames) {
      const bucket = sourceBuckets.get(name) || []
      if (bucket[round]) {
        sourceBalancedCandidates.push(bucket[round])
        added = true
      }
    }
    if (!added) break
    round += 1
  }

  // IMPORTANT: one Gemini request creates the complete batch. This prevents
  // four separate model calls per scan from burning through the free-tier
  // quota before the newsroom can publish multiple stories.
  const selectedCandidates = sourceBalancedCandidates.slice(0, MAX_STORIES)

  if (selectedCandidates.length) {
    try {
      const drafts = await draftStories(selectedCandidates)
      const draftByIndex = new Map()
      for (const draft of drafts) {
        const sourceIndex = Number(draft?.source_index)
        if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < selectedCandidates.length) {
          if (!draftByIndex.has(sourceIndex)) draftByIndex.set(sourceIndex, draft)
        }
      }

      const enrichedImages = await Promise.all(selectedCandidates.map(item => enrichImage(item)))

      for (let index = 0; index < selectedCandidates.length; index++) {
        const item = selectedCandidates[index]
        const draft = draftByIndex.get(index)
        if (!draft) {
          failures.push({
            title: item.title,
            error: `Gemini did not return a story for source_index ${index}.`
          })
          continue
        }

        try {
          const cleaned = cleanDraft(draft, item, index)
          newStories.push({
            id: `ftc-${Date.now()}-${newStories.length}`,
            source_name: item.source_name,
            source_url: item.source_url,
            source_title: item.title,
            source_excerpt: item.excerpt,
            image_url: enrichedImages[index] || null,
            source_published_at: item.published_at,
            relevance_score: item.relevance_score,
            headline: cleaned.headline,
            dek: cleaned.dek,
            body: cleaned.body,
            category: cleaned.category,
            status: 'published',
            published_at: new Date().toISOString()
          })
        } catch (error) {
          failures.push({ title: item.title, error: String(error?.message || error) })
        }
      }
    } catch (error) {
      // Preserve the exact Gemini error in the run report. In particular,
      // a 429 should be visible without causing the already-published feed
      // to be erased.
      failures.push({
        title: 'Batch editorial generation',
        error: String(error?.message || error)
      })
    }
  }

  const stories = [...newStories, ...prior].sort((a,b) => new Date(b.published_at || 0) - new Date(a.published_at || 0)).slice(0, 60)
  await fs.mkdir('public', { recursive: true })

  // IMPORTANT: do not rewrite a healthy feed when this scan produced no new
  // stories. This keeps the last known-good newsroom feed intact during a
  // temporary Gemini quota/auth/source failure and prevents a failed scan from
  // looking like a fresh empty publication. A genuinely empty feed is still
  // allowed during first-time initialization.
  let feedWasWritten = false
  if (newStories.length > 0 || prior.length === 0) {
    await fs.writeFile('public/editorial-feed.json', JSON.stringify({
      stories,
      count: stories.length,
      source: 'FOR THE CULTURE Editorial Engine',
      generated_at: new Date().toISOString()
    }, null, 2) + '\n')
    feedWasWritten = true
  }

  const runStatus = {
    generated_at: new Date().toISOString(),
    published_this_run: newStories.length,
    feed_story_count: stories.length,
    feed_was_written: feedWasWritten,
    feed_preserved: !feedWasWritten && prior.length > 0,
    selected_for_gemini: selectedCandidates.length,
    gemini_requests_this_run: selectedCandidates.length ? 1 : 0,
    generation_mode: 'single-batch',
    sources: sourceReport,
    candidates: candidates.length,
    new_candidates: newCandidates.length,
    failures,
    gemini_configured: Boolean(process.env.GEMINI_API_KEY),
    supabase_optional: true,
  }
  await fs.writeFile('editorial-run-status.json', JSON.stringify(runStatus, null, 2) + '\n')

  console.log(JSON.stringify({
    published: newStories.length,
    feedStories: stories.length,
    candidates: candidates.length,
    newCandidates: newCandidates.length,
    selectedForGemini: selectedCandidates.length,
    geminiRequests: selectedCandidates.length ? 1 : 0,
    sources: sourceReport,
    failures
  }, null, 2))
  if (!process.env.GEMINI_API_KEY) process.exitCode = 2
}
main().catch(error => { console.error(error); process.exit(1) })
