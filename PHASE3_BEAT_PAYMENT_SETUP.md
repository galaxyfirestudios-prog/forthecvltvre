# Galaxy Fire Studios — Phase 3 Payment + Site-Wide Sale Notifications

The Beat Store and the existing Studio/Visual Booking and Equipment Store payments now share a centralized sale-notification layer.

## 1. Supabase

Run the complete `supabase-beats-marketplace.sql` in the Supabase SQL Editor. In addition to the beat tables, it creates `sale_notifications`, which prevents duplicate sale emails when both the browser verification path and Paystack webhook process the same payment.

## 2. Vercel environment variables

Set these as server-side variables:

- `PAYSTACK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SALES_NOTIFICATION_EMAIL=galaxyfirestudios@gmail.com`

Keep `VITE_PAYSTACK_PUBLIC_KEY` as the frontend public key. Never put a Paystack secret key or Supabase service-role key in a `VITE_` variable.

`RESEND_FROM_EMAIL` must be an address/domain permitted by your Resend account. The destination can remain `galaxyfirestudios@gmail.com`.

## 3. Paystack webhook

Set the Paystack webhook URL to:

`https://YOUR-DOMAIN.com/api/paystack-webhook`

The webhook validates Paystack's `x-paystack-signature`, listens for `charge.success`, and handles Beat Store, Equipment Store, and Studio/Visual Booking transactions. Paystack recommends webhooks as the reliable server-side confirmation mechanism for successful payments.

## 4. Notifications

A successful verified payment can generate one notification to `galaxyfirestudios@gmail.com` containing the relevant sale information:

- Beat: title, license, customer, amount, references and exclusive status.
- Equipment: products, quantities, customer and delivery details.
- Studio/Visual Booking: service, customer, date/time, amount and references.

The `sale_notifications` table makes the notification idempotent so a webhook retry or browser verification does not create duplicate emails.

## 5. Beat exclusive behavior

Exclusive purchases keep the beat visible and playable for its short preview, but mark it sold in Supabase and prevent future purchases.

## 6. Full-quality masters

The Beat Store currently contains only short MP3 previews. Full WAV/stem/license delivery remains a separate secure fulfillment phase.
