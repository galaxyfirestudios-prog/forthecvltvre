const { createClient } = require('@supabase/supabase-js')

const BUCKET = 'for-the-culture-artist-submissions'
const DEFAULT_TO = 'fortheculture184@gmail.com'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function clean(value, max = 5000) { return String(value ?? '').trim().slice(0, max) }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const body = req.body || {}
    if (body.website) return res.status(400).json({ error: 'Invalid submission.' })

    const artistName = clean(body.artistName, 120)
    const email = clean(body.email, 180)
    const country = clean(body.country, 80)
    const city = clean(body.city, 100)
    const genre = clean(body.genre, 100)
    const songTitle = clean(body.songTitle, 180)
    const releaseDate = clean(body.releaseDate, 40)
    const social = clean(body.social, 500)
    const bio = clean(body.bio, 1800)
    const description = clean(body.description, 1800)
    const streamingLink = clean(body.streamingLink, 1000)
    const consideration = clean(body.consideration, 80)
    const audioPath = clean(body.audioPath, 500)
    const artworkPath = clean(body.artworkPath, 500)

    if (!artistName || !email || !songTitle || !genre || !consideration || (!audioPath && !streamingLink)) {
      return res.status(400).json({ error: 'Please complete the required fields and provide an audio upload or streaming/download link.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
    if (!['RADIO', 'EDITORIAL', 'BOTH'].includes(consideration)) return res.status(400).json({ error: 'Invalid submission type.' })

    const links = []
    if (audioPath) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(audioPath, 60 * 60 * 24 * 30, { download: true })
      if (error) throw error
      links.push(`<p><strong>Uploaded audio:</strong> <a href="${esc(data.signedUrl)}">Download / review the submitted song</a> <span style="color:#777">(link valid for 30 days)</span></p>`)
    }
    if (artworkPath) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(artworkPath, 60 * 60 * 24 * 30)
      if (!error && data?.signedUrl) links.push(`<p><strong>Artwork:</strong> <a href="${esc(data.signedUrl)}">View submitted artwork</a> <span style="color:#777">(link valid for 30 days)</span></p>`)
    }
    if (streamingLink) links.push(`<p><strong>Streaming / download link:</strong> <a href="${esc(streamingLink)}">${esc(streamingLink)}</a></p>`)

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return res.status(503).json({ error: 'Submission email service is not configured yet.' })
    }

    const to = process.env.FOR_THE_CULTURE_SUBMISSION_EMAIL || DEFAULT_TO
    const subject = `FOR THE CULTURE — Artist Submission: ${songTitle} by ${artistName}`
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;line-height:1.55"><h2>FOR THE CULTURE — New Artist Submission</h2><p>A new artist has submitted music for consideration.</p><table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px">${[
      ['Artist', artistName], ['Email', email], ['Country', country], ['City', city], ['Genre', genre], ['Song', songTitle], ['Release date', releaseDate], ['Consideration', consideration === 'BOTH' ? 'Radio + Editorial' : consideration === 'RADIO' ? 'Radio' : 'Editorial / Blog'], ['Social links', social],
    ].filter(([, value]) => value).map(([label, value]) => `<tr><td style="border-bottom:1px solid #eee;font-weight:700;width:170px">${esc(label)}</td><td style="border-bottom:1px solid #eee">${esc(value)}</td></tr>`).join('')}</table><h3>Artist bio</h3><p>${esc(bio || 'Not provided.').replace(/\n/g, '<br>')}</p><h3>Song description</h3><p>${esc(description || 'Not provided.').replace(/\n/g, '<br>')}</p>${links.join('')}<p style="margin-top:28px;padding:12px;border-left:4px solid #e50914;background:#f7f7f7"><strong>Status: UNDER REVIEW</strong><br>Submission does not guarantee radio play, editorial coverage, publication or other placement.</p></body></html>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], reply_to: email, subject, html }),
    })
    if (!response.ok) throw new Error(`Resend error ${response.status}: ${await response.text()}`)

    return res.status(200).json({ ok: true, message: 'Submission received. Thank you — the FOR THE CULTURE team will review your music.' })
  } catch (error) {
    console.error('Artist submission failed:', error)
    return res.status(500).json({ error: 'We could not complete the submission. Please try again.' })
  }
}
