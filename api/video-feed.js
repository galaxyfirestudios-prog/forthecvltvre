const fs = require('node:fs')
const path = require('node:path')

function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900')
  return res.status(status).json(body)
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed', videos: [] })

  try {
    const file = path.join(process.cwd(), 'public', 'video-feed.json')
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const requested = Math.min(Math.max(Number(req.query?.limit || 12), 1), 24)
    const category = String(req.query?.category || '').trim().toUpperCase()

    const videos = Array.isArray(data.videos)
      ? data.videos.filter((video) => !category || String(video.category || '').toUpperCase() === category).slice(0, requested)
      : []

    return json(res, 200, {
      videos,
      count: videos.length,
      generated_at: data.generated_at || null,
      source: data.source || 'FOR THE CULTURE YouTube Video Engine',
    })
  } catch (error) {
    console.error('video-feed:', error)
    return json(res, 500, { error: 'Video feed unavailable', videos: [] })
  }
}
