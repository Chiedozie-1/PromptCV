# Waitlist setup

The waitlist uses the existing static site, a Vercel serverless function, Supabase Postgres, and Resend. Signup data and email credentials are handled server-side; do not add service keys to JavaScript or commit local environment files.

## Supabase

Apply [`supabase/migrations/202610090001_waitlist.sql`](./supabase/migrations/202610090001_waitlist.sql) to the project database before enabling signups. The migration creates the subscriber table, an admin-notification outbox, and an hourly per-IP signup limit. Subscriber data is not accessible to the public roles.

## Environment variables

Set these in Vercel Project Settings → Environment Variables and in the local environment used by `vercel dev`:

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only database access |
| `RESEND_API_KEY` | For admin alerts | Resend API credential |
| `EMAIL_FROM` | For admin alerts | Verified sender, such as `PromptCV <updates@example.com>` |
| `ADMIN_NOTIFICATION_EMAIL` | No | Alert recipient; defaults to `nictech005@gmail.com` |

The site can store signups without Resend configured; the outbox event stays `pending` and the visitor still receives an accurate signup confirmation. Provider failures are recorded as `failed`. Review these records in Supabase; automatic retries and an authenticated admin dashboard are not part of this signup endpoint.

## Local verification

1. Install or use the Vercel CLI.
2. Provide the environment variables without committing them.
3. Start the project with `vercel dev`.
4. Open the site through the Vercel local server, submit a test address, and confirm the subscriber and notification event in Supabase.
5. Configure and verify the sender domain and email authentication (SPF, DKIM, and DMARC) before relying on admin email delivery.
