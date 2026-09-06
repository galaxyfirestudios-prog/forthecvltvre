const { createClient } = require('@supabase/supabase-js')

const VIDEO_FETCH_TIMEOUT_MS = Number(process.env.EDITORIAL_VIDEO_FETCH_TIMEOUT_MS || 3500)

function absoluteUrl(value, baseUrl) {
  if (!value) return ''
  try { return new URL(value, baseUrl).toString() } catch { return '' }
}

function normalizeVideoUrl(value, baseUrl) {
  const url = absoluteUrl(value, baseUrl)
  if (!url) return ''
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (host.includes('youtu.be')) return url
    if (host.includes('youtube.com')) return url
    if (host.includes('vimeo.com')) return url
    if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(parsed.pathname)) return url
  } catch {}
  return ''
}

function videoFromHtml(html, pageUrl) {
  const candidates = [
    html.match(/<meta[^>]+property=[\"']og:video(?::secure_url|:url)?[\"'][^>]+content=[\"']([^\"']+)[\"']/i)?.[1],
    html.match(/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:video(?::secure_url|:url)?[\"']/i)?.[1],
    html.match(/<iframe[^>]+src=[\"']([^\"']+)[\"']/i)?.[1],
    html.match(/<video[^>]+src=[\"']([^\"']+)[\"']/i)?.[1],
    html.match(/<source[^>]+src=[\"']([^\"']+)[\"']/i)?.[1],
  ]
  for (const value of candidates) {
    const video = normalizeVideoUrl(value, pageUrl)
    if (video) return video
  }
  return ''
}

async function detectVideo(story) {
  if (!story?.source_url) return { video_url: '', media_type: '' }
  const direct = normalizeVideoUrl(story.video_url, story.source_url)
  if (direct) return { video_url: direct, media_type: 'video' }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VIDEO_FETCH_TIMEOUT_MS)
    const response = await fetch(story.source_url, {
      headers: {
        'User-Agent': 'FOR-THE-CULTURE-Editorial-Video-Radar/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!response.ok) return { video_url: '', media_type: '' }
    const html = (await response.text()).slice(0, 1200000)
    const video = videoFromHtml(html, story.source_url)
    return video ? { video_url: video, media_type: 'video' } : { video_url: '', media_type: '' }
  } catch {
    return { video_url: '', media_type: '' }
  }
}

async function enrichVideos(stories) {
  const results = []
  const concurrency = 6
  let cursor = 0
  async function worker() {
    while (cursor < stories.length) {
      const index = cursor++
      const story = stories[index]
      const video = await detectVideo(story)
      results[index] = { ...story, ...video }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, stories.length) }, worker))
  return results
}

function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(status).json(body)
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return json(res, 503, { error: 'Editorial feed is not configured', stories: [] })
  }

  try {
    const supabase = createClient(url, key)
    const limit = Math.min(Math.max(Number(req.query?.limit || 12), 1), 24)

    const baseSelect = 'id,headline,dek,body,category,source_name,source_url,image_url,published_at'
    const extendedSelect = `${baseSelect},video_url,video_id,media_type`

    let data
    let error

    const extended = await supabase
      .from('editorial_stories')
      .select(extendedSelect)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (!extended.error) {
      data = extended.data || []
    } else {
      const fallback = await supabase
        .from('editorial_stories')
        .select(baseSelect)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit)
      data = fallback.data || []
      error = fallback.error
    }

    if (error) throw error

    // Only inspect the freshest items on each request so the serverless feed
    // stays fast; older stories can still expose stored video metadata.
    const videoCandidates = data.slice(0, Math.min(data.length, 12))
    const enrichedCandidates = await enrichVideos(videoCandidates)
    const enrichedById = new Map(enrichedCandidates.map(story => [String(story.id), story]))
    const enriched = data.map(story => enrichedById.get(String(story.id)) || story)

    return json(res, 200, {
      stories: enriched,
      count: enriched.length,
      source: 'FOR THE CULTURE Editorial Engine'
    })
  } catch (error) {
    console.error('editorial-feed:', error)
    return json(res, 500, { error: 'Editorial feed unavailable', stories: [] })
  }
}
