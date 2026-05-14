# MercadoPago webhook

Endpoint:

`https://<project-ref>.supabase.co/functions/v1/mp-webhook`

Configure it in MercadoPago Dashboard under webhook notifications for `payment`
events.

Required Supabase secrets:

```bash
supabase secrets set MP_ACCESS_TOKEN=APP_USR_xxx
supabase secrets set MP_WEBHOOK_SECRET=xxx
supabase secrets set MP_ENVIRONMENT=sandbox
supabase secrets set SITE_URL=https://islanegra.com.ar
```

`MP_ACCESS_TOKEN` and `MP_WEBHOOK_SECRET` must only live in Supabase Edge
Functions. Do not expose them through Vite or any frontend file.

`SITE_URL` is used by `create-payment-preference` for MercadoPago back URLs.

The function validates `x-signature` using HMAC-SHA256, fetches the canonical
payment state from MercadoPago, and uses `external_reference = orders.id` to
mark the order as paid. Repeated events are deduplicated with
`idempotency_key = mp_<paymentId>_<status>`.
