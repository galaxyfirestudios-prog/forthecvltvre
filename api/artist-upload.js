const { createClient } = require('@supabase/supabase-js')

const BUCKET = 'for-the-culture-artist-submissions'
const MAX_AUDIO_BYTES = 4 * 1024 * 1024
const MAX_ARTWORK_BYTES = 2 * 1024 * 1024
const ALLOWED_AUDIO = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm'])
const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp'])

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function safeSegment(value) {
  return String(value || 'artist').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'artist'
}

function extension(contentType, filename) {
  const fromName = String(filename || '').match(/\.[a-z0-9]{1,8}$/i)?.[0]
  if (fromName) return fromName.toLowerCase()
  const map = { 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac', 'audio/ogg': '.ogg', 'audio/webm': '.webm', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
  return map[contentType] || ''
}

async function ensureBucket() {
  const { data: existing, error: getError } = await supabase.storage.getBucket(BUCKET)
  if (existing && !getError) return
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: '4194304',
    allowedMimeTypes: [...ALLOWED_AUDIO, ...ALLOWED_IMAGE],
  })
  if (error && !/already exists/i.test(error.message || '')) throw error
}

function readBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body)
  if (req.body instanceof Uint8Array) return Promise.resolve(Buffer.from(req.body))
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', chunk => {
      total += chunk.length
      if (total > MAX_AUDIO_BYTES) {
        reject(new Error('File is too large.'))
        try { req.destroy() } catch {}
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const type = String(req.headers['x-file-type'] || req.headers['content-type'] || '').split(';')[0].toLowerCase()
    const filename = decodeURIComponent(String(req.headers['x-file-name'] || 'upload'))
    const kind = String(req.headers['x-file-kind'] || 'audio').toLowerCase()
    const max = kind === 'artwork' ? MAX_ARTWORK_BYTES : MAX_AUDIO_BYTES
    const allowed = kind === 'artwork' ? ALLOWED_IMAGE : ALLOWED_AUDIO
    if (!allowed.has(type)) return res.status(400).json({ error: 'Unsupported file type.' })

    const body = await readBody(req)
    if (!body.length || body.length > max) return res.status(413).json({ error: `File is too large. Maximum is ${Math.round(max / 1024 / 1024)} MB.` })

    await ensureBucket()
    const artist = safeSegment(req.headers['x-artist-name'])
    const timestamp = Date.now()
    const path = `${artist}/${timestamp}-${safeSegment(filename.replace(/\.[^.]+$/, ''))}${extension(type, filename)}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: type, upsert: false, cacheControl: '3600' })
    if (error) throw error

    return res.status(200).json({ ok: true, bucket: BUCKET, path, name: filename, size: body.length, type })
  } catch (error) {
    console.error('Artist upload failed:', error)
    return res.status(500).json({ error: 'The upload could not be completed. Please try again.' })
  }
}
