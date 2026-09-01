const { createClient } = require('@supabase/supabase-js')

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ sold: {} })
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ sold: {} })
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await supabase.from('beat_catalog').select('beat_id, exclusive_sold')
    if (error) throw error
    const sold = Object.fromEntries((data || []).filter((row) => row.exclusive_sold).map((row) => [row.beat_id, true]))
    return res.status(200).json({ sold })
  } catch (error) {
    console.error('Beat status error:', error)
    return res.status(200).json({ sold: {} })
  }
}
