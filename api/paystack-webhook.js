const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { sendSaleEmail } = require('./_sale-email')
const { claimSaleNotification, releaseSaleNotification } = require('./_notification-log')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const LICENSE_PRICES = { Basic: 20000, Premium: 40000, Unlimited: 80000, Exclusive: 150000 }

function signatureIsValid(rawBody, signature) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')
  const expected = Buffer.from(hash, 'utf8')
  const actual = Buffer.from(String(signature), 'utf8')
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function getMetadata(data) {
  const fields = data?.metadata?.custom_fields || []
  return Object.fromEntries(fields.map((field) => [field.variable_name, field.value]))
}

async function processBeat(data, metadata) {
  const beatId = metadata.beat_id
  const beatTitle = metadata.beat_title
  const license = metadata.license
  const expectedAmount = LICENSE_PRICES[license]
  if (!beatId || !beatTitle || !expectedAmount || Number(data.amount) !== expectedAmount) throw new Error('Invalid beat payment payload')

  const customer = data.customer || {}
  const { data: saleData, error } = await supabase.rpc('record_beat_sale', {
    p_beat_id: beatId,
    p_beat_title: beatTitle,
    p_license: license,
    p_amount: Number(data.amount) / 100,
    p_customer_name: customer.first_name ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ''}` : customer.email || 'Paystack Customer',
    p_customer_email: customer.email || '',
    p_customer_phone: customer.phone || '',
    p_paystack_reference: data.reference,
  })

  if (error) {
    if (error.message?.toLowerCase().includes('already sold')) {
      await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: data.reference, customer_note: 'The beat was already sold exclusively.', merchant_note: `Automatic refund: exclusive beat ${beatId} was already sold.` }),
      })
      return { refunded: true }
    }
    throw error
  }

  const sale = Array.isArray(saleData) ? saleData[0] : saleData
  if (!sale?.created) return { created: false, orderReference: sale?.order_reference, exclusiveSold: !!sale?.exclusive_sold }

  const notification = await claimSaleNotification(data.reference, 'Beat')
  if (notification.claimed) {
    try {
      await sendSaleEmail({
        type: 'Beat', beatTitle, title: beatTitle, license,
        amount: Number(data.amount) / 100,
        customerName: customer.first_name ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ''}` : customer.email || 'Paystack Customer',
        customerEmail: customer.email || '', customerPhone: customer.phone || '',
        paystackReference: data.reference, orderReference: sale.order_reference,
        exclusiveSold: !!sale.exclusive_sold,
      })
    } catch (emailError) { console.error('Beat sale email error:', emailError); await releaseSaleNotification(data.reference) }
  }
  return { created: true, orderReference: sale.order_reference, exclusiveSold: !!sale.exclusive_sold }
}

async function processGenericSale(data, metadata) {
  const orderType = metadata.order_type
  const customer = data.customer || {}
  const customerName = customer.first_name ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ''}` : customer.email || 'Paystack Customer'
  let order

  if (orderType === 'Galaxy Fire Studio Equipment Store') {
    const items = String(metadata.products || '').split(' | ').filter(Boolean).map((item) => {
      const match = item.match(/^(.*) x(\d+)$/)
      return match ? { name: match[1], quantity: Number(match[2]) } : { name: item, quantity: 1 }
    })
    order = {
      type: 'Equipment Store', items, amount: Number(data.amount) / 100,
      customerName, customerEmail: customer.email || '', customerPhone: customer.phone || '',
      city: metadata.delivery_city, address: metadata.delivery_address,
      paystackReference: data.reference,
    }
  } else if (orderType === 'Galaxy Fire Studio Booking') {
    order = {
      type: 'Studio / Visual Booking', service: metadata.service,
      amount: Number(data.amount) / 100, customerName, customerEmail: customer.email || '', customerPhone: customer.phone || '',
      bookingDate: metadata.booking_date, bookingTime: metadata.preferred_time,
      paystackReference: data.reference,
    }
  } else {
    return { ignored: true }
  }

  const notification = await claimSaleNotification(data.reference, order.type)
  if (!notification.claimed) return { notified: false }
  try { await sendSaleEmail(order) } catch (emailError) { console.error('Generic sale email error:', emailError); await releaseSaleNotification(data.reference) }
  return { notified: true }
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  try {
    const rawBody = await readRawBody(req)
    if (!signatureIsValid(rawBody, req.headers['x-paystack-signature'])) return res.status(401).send('Invalid signature')
    const event = JSON.parse(rawBody)
    if (event.event !== 'charge.success') return res.status(200).json({ received: true })

    const data = event.data || {}
    const metadata = getMetadata(data)
    let result
    if (metadata.order_type === 'Galaxy Fire Beats Marketplace') result = await processBeat(data, metadata)
    else result = await processGenericSale(data, metadata)
    return res.status(200).json({ received: true, ...result })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return res.status(500).send('Webhook processing failed')
  }
}

module.exports.config = { api: { bodyParser: false } }
