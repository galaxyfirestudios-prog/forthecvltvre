const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { sendSaleEmail } = require('./_sale-email')
const { claimSaleNotification, releaseSaleNotification } = require('./_notification-log')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ verified: false, message: 'Method not allowed' })
  try {
    const { reference, expectedAmount, beat, license, customer } = req.body || {}
    if (!reference || !expectedAmount || !beat?.id || !beat?.title || !license || !customer?.name || !customer?.email || !customer?.phone) return res.status(400).json({ verified: false, message: 'Missing beat purchase information.' })
    if (!process.env.PAYSTACK_SECRET_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ verified: false, message: 'Beat marketplace payment is not fully configured on the server.' })

    const verify = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } })
    const result = await verify.json()
    if (!verify.ok || !result.status || result.data?.status !== 'success') return res.status(400).json({ verified: false, message: 'Payment verification failed.' })
    if (Number(result.data.amount) !== Number(expectedAmount)) return res.status(400).json({ verified: false, message: 'Payment amount could not be verified.' })

    const { data, error } = await supabase.rpc('record_beat_sale', {
      p_beat_id: beat.id,
      p_beat_title: beat.title,
      p_license: license,
      p_amount: Number(result.data.amount) / 100,
      p_customer_name: customer.name,
      p_customer_email: customer.email,
      p_customer_phone: customer.phone,
      p_paystack_reference: reference,
    })
    if (error) {
      console.error('Beat sale recording error:', error)
      if (error.message?.toLowerCase().includes('already sold')) {
        try {
          await fetch('https://api.paystack.co/refund', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: reference, customer_note: 'The beat was already sold exclusively before this payment could be completed.', merchant_note: `Automatic refund: exclusive beat ${beat.id} was already sold.` }),
          })
        } catch (refundError) {
          console.error('Automatic Paystack refund request failed:', refundError)
        }
        return res.status(409).json({ verified: false, refunded: true, message: 'This beat has already been sold exclusively. A refund request has been submitted for this payment.' })
      }
      return res.status(500).json({ verified: false, message: 'Payment was verified but the order could not be recorded. Please contact Galaxy Fire Studios with your Paystack reference.' })
    }

    const sale = Array.isArray(data) ? data[0] : data
    const orderReference = sale?.order_reference
    const exclusiveSold = !!sale?.exclusive_sold
    if (sale?.created) {
      try {
        const notification = await claimSaleNotification(reference, 'Beat')
        if (notification.claimed) await sendSaleEmail({ type: 'Beat', beatTitle: beat.title, title: beat.title, license, amount: Number(result.data.amount) / 100, customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, paystackReference: reference, orderReference, exclusiveSold })
      } catch (emailError) { console.error('Beat sale email error:', emailError); await releaseSaleNotification(reference) }
    }
    return res.json({ verified: true, orderReference, exclusiveSold })
  } catch (error) {
    console.error('Beat payment verification error:', error)
    return res.status(500).json({ verified: false, message: 'Could not verify the beat payment right now.' })
  }
}
