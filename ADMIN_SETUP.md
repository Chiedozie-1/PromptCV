# PromptCV admin dashboard setup

The dashboard is available at `/admin`. It uses the existing static-site and Vercel Functions stack; private data and service credentials stay server-side. All data APIs require an administrator session.

## Apply the migration

Review and apply [the admin dashboard migration](./supabase/migrations/202610090002_admin_dashboard.sql) after the existing [waitlist migration](./supabase/migrations/202610090001_waitlist.sql). It adds launch-campaign and per-recipient delivery tables, indexes, and service-role-only database functions. It does not alter or delete existing subscriber records.

The migration relies on the table definitions in the waitlist migration, including the subscriber `status`, `consent_status`, and launch-notification columns. Check that the deployed Supabase schema matches that migration before applying the dashboard migration.

## Configure authentication

1. In Supabase Auth, create the single administrator user manually. Do not enable public account registration for dashboard access.
2. Set `ADMIN_EMAIL` to that user's verified email address.
3. Set `SUPABASE_ANON_KEY` to the project's Supabase anon/publishable key. It is used only by the server-side sign-in function and is not included in dashboard JavaScript.
4. Generate a high-entropy signing secret, for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`, and set it as `ADMIN_SESSION_SECRET`. Use at least 32 characters and do not reuse a public key.
5. Set `SUPABASE_URL` and a server-only `SUPABASE_SERVICE_ROLE_KEY`. The admin APIs accept either that name or `SUPABASE_SECRET_KEY`; the existing public signup endpoint still reads `SUPABASE_SECRET_KEY`, so set both names to the same service-role key until that endpoint is separately updated. Never put a service-role key in a `NEXT_PUBLIC_*` variable or frontend code.
6. Preserve `WAITLIST_IP_HASH_SECRET`, which is separately required by the existing public waitlist signup endpoint.

Sign-in is authenticated by Supabase Auth. The server issues a signed, `HttpOnly`, `Secure`, `SameSite=Strict` cookie after verifying the configured administrator email and confirmed email status. Sessions expire with the Supabase access-token lifetime (up to eight hours). Admin API routes validate the signed session independently and reject cross-origin state-changing requests.

## Configure email

Set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel to enable test emails and launch campaigns. The sender must be verified with Resend. The optional `ADMIN_NOTIFICATION_EMAIL` continues to control signup-alert recipients; test emails go only to the signed-in administrator.

An administrator must be signed in and keep the Launch Broadcast page open while a campaign is processing. Campaign membership is snapshotted at creation. The dashboard sends a maximum of 5 recipients per server request, stores per-recipient progress, retries transient failures at most three times, and uses a stable Resend idempotency key per recipient. Reopening the dashboard resumes a campaign left queued or processing. “Accepted” means the email provider accepted the request; delivery/bounce webhooks are not configured, so the dashboard does not report acceptance as confirmed delivery.

Campaign messages are plain text and include the public PromptCV URL and a signed unsubscribe link. The unsubscribe endpoint confirms browser requests before changing status and also supports provider one-click unsubscribe posts. Unsubscribed or non-consented contacts are excluded from the campaign snapshot and rechecked before sending.

## Analytics

Website analytics are not connected. The dashboard explicitly reports this rather than showing fabricated traffic values. A privacy-conscious provider such as Plausible can be added later; configure its reporting API credentials server-side before displaying visitor, session, or page-view metrics.

Subscriber “last 7 days” and “last 30 days” counts use rolling 7 × 24-hour and 30 × 24-hour windows against database time. Signup trend bars group by UTC calendar day for the last 30 days. Displayed timestamps use the administrator's browser locale.

## Local testing and rollout

Do not use VS Code Live Server or open `admin/index.html` directly: those serve only static files and cannot run the `/api/admin` Vercel functions. This causes the browser to receive an HTML 404 page instead of the JSON login response.

Install/use the Vercel CLI, configure the same environment variables locally, then run `vercel dev` from the project root and open `http://localhost:3000/admin`. Apply the migrations to a non-production Supabase project first. Verify sign-in, protected API responses, paginated waitlist search, CSV export, activity filtering, test email, and an explicitly approved test campaign using addresses intended for testing.

Do not start a real campaign during setup. Before production use, confirm that the active and consented audience count and message are correct in the final confirmation dialog.
