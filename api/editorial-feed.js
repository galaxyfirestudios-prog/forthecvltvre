const { createClient } = require('@supabase/supabase-js')

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

    const { data, error } = await supabase
      .from('editorial_stories')
      .select('id,headline,dek,body,category,source_name,source_url,image_url,published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return json(res, 200, {
      stories: data || [],
      count: data?.length || 0,
      source: 'FOR THE CULTURE Editorial Engine'
    })
  } catch (error) {
    console.error('editorial-feed:', error)
    return json(res, 500, { error: 'Editorial feed unavailable', stories: [] })
  }
}
