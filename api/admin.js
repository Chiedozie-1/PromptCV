const { randomUUID, createHmac } = require("node:crypto");
const {
    clearSessionCookie,
    createSessionCookie,
    getAdminConfig,
    getSession,
    isSameOrigin
} = require("../lib/admin-auth");

const PAGE_SIZE = 50;
const MAX_PAGE = 100000;
const MAX_BODY_BYTES = 132000;
const EMAIL_SEND_INTERVAL_MS = 650;
const SITE_URL = "https://promptcvbynic.vercel.app";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendJson(response, status, value) {
    response.setHeader("Cache-Control", "no-store, private");
    return response.status(status).json(value);
}

function getSupabaseConfig() {
    const adminConfig = getAdminConfig();
    return {
        url: adminConfig.supabaseUrl,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ""
    };
}

function getResendConfig() {
    return {
        apiKey: process.env.RESEND_API_KEY || "",
        from: process.env.EMAIL_FROM || ""
    };
}

function getBody(request) {
    const body = request.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    try {
        if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) return null;
    } catch {
        return null;
    }
    return body;
}

async function supabaseFetch(path, options = {}) {
    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
        throw new Error("Waitlist database is not configured");
    }
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
        ...options,
        headers: {
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });
    if (!response.ok) {
        let failure = null;
        try {
            failure = await response.json();
        } catch {
            // The response status is enough to report a sanitized failure.
        }
        console.error("Admin database request failed.", {
            status: response.status,
            endpoint: path.split("?")[0]
        });
        const error = new Error("The dashboard could not load data from the database");
        error.status = response.status;
        error.code = failure?.code;
        throw error;
    }
    return response;
}

async function readRows(path, options) {
    const response = await supabaseFetch(path, options);
    return response.json();
}

async function countRows(path) {
    const response = await supabaseFetch(path, {
        method: "HEAD",
        headers: { Prefer: "count=exact", Range: "0-0" }
    });
    const contentRange = response.headers.get("content-range") || "";
    const total = Number(contentRange.split("/")[1]);
    return Number.isFinite(total) ? total : 0;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function htmlMessage(body, previewText, unsubscribeUrl) {
    const paragraphText = escapeHtml(body).replace(/\r\n|\r|\n/g, "<br>");
    const safePreview = escapeHtml(previewText);
    const safeUnsubscribe = escapeHtml(unsubscribeUrl);
    return `<!doctype html><html><body style="margin:0;background:#f3f7f5;color:#172b2d;font-family:Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${safePreview}</div>
<main style="max-width:600px;margin:32px auto;padding:36px 28px;background:#fff;border-radius:16px">
<p style="color:#177f72;font-weight:bold;letter-spacing:.12em">PROMPTCV</p>
<div style="font-size:16px;line-height:1.7">${paragraphText}</div>
<p style="margin:28px 0"><a href="${SITE_URL}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#126b62;color:#fff;text-decoration:none">Visit PromptCV</a></p>
<hr style="border:0;border-top:1px solid #e2eae7;margin:32px 0">
<p style="font-size:12px;color:#647675">You received this because you joined the PromptCV waitlist. <a href="${safeUnsubscribe}">Unsubscribe</a>.</p>
</main></body></html>`;
}

async function sendResendEmail({ to, subject, text, html, idempotencyKey, headers }) {
    const config = getResendConfig();
    if (!config.apiKey || !config.from) throw new Error("Email delivery is not configured");
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
        },
        body: JSON.stringify({ from: config.from, to: [to], subject, text, html, headers })
    });
    let result = {};
    try {
        result = await response.json();
    } catch {
        // Provider errors are represented by the HTTP status; response bodies are not returned to the browser.
    }
    return { ok: response.ok, status: response.status, id: result.id || null };
}

async function sendCampaignBatch(campaignId) {
    const campaignRows = await readRows(
        `waitlist_launch_campaigns?id=eq.${campaignId}&select=id,subject,preview_text,body,status&limit=1`
    );
    const campaign = campaignRows[0];
    if (!campaign) return { error: "Campaign not found", status: 404 };
    if (campaign.status === "complete" || campaign.status === "complete_with_errors") {
        return { campaign_id: campaignId, complete: true };
    }

    const config = getAdminConfig();
    if (!config.sessionSecret || config.sessionSecret.length < 32) {
        return { error: "Campaign unsubscribe signing is not configured", status: 503 };
    }

    const claimed = await readRows("rpc/claim_waitlist_launch_batch", {
        method: "POST",
        body: JSON.stringify({ p_campaign_id: campaignId, p_batch_size: 5 })
    });

    for (const [index, delivery] of claimed.entries()) {
        if (index > 0) {
            await new Promise((resolve) => setTimeout(resolve, EMAIL_SEND_INTERVAL_MS));
        }
        const unsubscribeToken = createHmac("sha256", config.sessionSecret)
            .update(`${delivery.subscriber_id}:${campaignId}`)
            .digest("base64url");
        const unsubscribeUrl = `${SITE_URL}/api/waitlist/unsubscribe?subscriber=${delivery.subscriber_id}&campaign=${campaignId}&token=${unsubscribeToken}`;
        const attemptKey = `launch-${delivery.delivery_id}`;
        let result;
        let lastError = "Email provider rejected the message";
        try {
            result = await sendResendEmail({
                to: delivery.email_snapshot,
                subject: campaign.subject,
                text: `${campaign.preview_text ? `${campaign.preview_text}\n\n` : ""}${campaign.body}\n\nVisit PromptCV: ${SITE_URL}\n\nUnsubscribe: ${unsubscribeUrl}`,
                html: htmlMessage(campaign.body, campaign.preview_text, unsubscribeUrl),
                idempotencyKey: attemptKey,
                headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
                }
            });
            if (!result.ok) lastError = `Email provider returned status ${result.status}`;
        } catch (error) {
            console.error("Launch campaign delivery request failed.", {
                campaignId,
                deliveryId: delivery.delivery_id,
                message: error.message
            });
            result = { ok: false, status: 503, id: null };
            lastError = "Email provider could not be reached";
        }

        const retryable = !result.ok && (result.status === 429 || result.status >= 500);
        const retry = retryable && delivery.attempt_count < 3;
        await supabaseFetch(
            `waitlist_launch_deliveries?id=eq.${delivery.delivery_id}`,
            {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify(result.ok
                    ? {
                        status: "accepted",
                        provider_message_id: result.id,
                        accepted_at: new Date().toISOString(),
                        processing_at: null,
                        last_error: null
                    }
                    : {
                        status: retry ? "queued" : "failed",
                        failed_at: retry ? null : new Date().toISOString(),
                        processing_at: null,
                        last_error: lastError
                    })
            }
        );
        if (result.ok) {
            try {
                await supabaseFetch(`waitlist_subscribers?id=eq.${delivery.subscriber_id}`, {
                    method: "PATCH",
                    headers: { Prefer: "return=minimal" },
                    body: JSON.stringify({
                        launch_notified_at: new Date().toISOString(),
                        last_launch_campaign_id: campaignId
                    })
                });
            } catch (error) {
                console.error("Accepted campaign delivery could not update the subscriber summary.", {
                    campaignId,
                    deliveryId: delivery.delivery_id,
                    message: error.message
                });
            }
        }
    }

    const [queued, processing, failed] = await Promise.all([
        countRows(`waitlist_launch_deliveries?campaign_id=eq.${campaignId}&status=eq.queued&select=id`),
        countRows(`waitlist_launch_deliveries?campaign_id=eq.${campaignId}&status=eq.processing&select=id`),
        countRows(`waitlist_launch_deliveries?campaign_id=eq.${campaignId}&status=eq.failed&select=id`)
    ]);
    const complete = queued === 0 && processing === 0;
    const status = complete
        ? (failed > 0 ? "complete_with_errors" : "complete")
        : "processing";
    await supabaseFetch(`waitlist_launch_campaigns?id=eq.${campaignId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
            status,
            ...(complete ? { completed_at: new Date().toISOString() } : {})
        })
    });

    return {
        campaign_id: campaignId,
        processed: claimed.length,
        queued,
        processing,
        failed,
        complete
    };
}

async function getCampaign(campaignId) {
    if (!UUID_PATTERN.test(campaignId || "")) {
        return { error: "A valid campaign ID is required", status: 400 };
    }
    const campaigns = await readRows(
        `waitlist_launch_campaigns?id=eq.${campaignId}&select=id,subject,preview_text,initiated_by,audience_count,status,created_at,completed_at&limit=1`
    );
    const campaign = campaigns[0];
    if (!campaign) return { error: "Campaign not found", status: 404 };
    const statuses = ["queued", "processing", "accepted", "failed", "skipped"];
    const counts = await Promise.all(statuses.map(async (status) => [
        status,
        await countRows(`waitlist_launch_deliveries?campaign_id=eq.${campaignId}&status=eq.${status}&select=id`)
    ]));
    const failures = await readRows(
        `waitlist_launch_deliveries?campaign_id=eq.${campaignId}&status=eq.failed&select=email_snapshot,attempt_count,last_error,failed_at&order=failed_at.desc&limit=50`
    );
    return {
        ...campaign,
        counts: Object.fromEntries(counts),
        failures
    };
}

module.exports = async function admin(request, response) {
    const action = typeof request.query.action === "string" ? request.query.action : "";
    const config = getAdminConfig();
    const mutating = request.method !== "GET" && request.method !== "HEAD";

    if (mutating && !isSameOrigin(request)) {
        return sendJson(response, 403, { error: "Request origin is not allowed" });
    }

    if (action === "login" && request.method === "POST") {
        const body = getBody(request);
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        if (!config.email || config.sessionSecret.length < 32
            || !config.supabaseUrl || !config.anonKey) {
            console.error("Admin authentication is not fully configured.");
            return sendJson(response, 503, { error: "Admin sign-in is not configured yet" });
        }
        if (email !== config.email || !password || password.length > 1024) {
            return sendJson(response, 401, { error: "Email or password is incorrect" });
        }
        try {
            const authResponse = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
                method: "POST",
                headers: { apikey: config.anonKey, "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            if (!authResponse.ok) {
                return sendJson(response, 401, { error: "Email or password is incorrect" });
            }
            const auth = await authResponse.json();
            const confirmedEmail = (auth.user?.email || "").toLowerCase();
            const maxAge = Math.min(8 * 60 * 60, Number(auth.expires_in) || 3600);
            if (confirmedEmail !== config.email || !auth.user?.email_confirmed_at || !auth.access_token || maxAge < 60) {
                return sendJson(response, 401, { error: "Email or password is incorrect" });
            }
            response.setHeader("Set-Cookie", createSessionCookie(config.email, config.sessionSecret, maxAge));
            return sendJson(response, 200, { email: config.email });
        } catch (error) {
            console.error("Admin sign-in provider request failed.", { message: error.message });
            return sendJson(response, 503, { error: "Sign-in is temporarily unavailable" });
        }
    }

    if (action === "logout" && request.method === "POST") {
        response.setHeader("Set-Cookie", clearSessionCookie());
        return sendJson(response, 200, { ok: true });
    }

    const session = getSession(request, config);
    if (!session) return sendJson(response, 401, { error: "Sign in to access the admin dashboard" });

    if (action === "session" && request.method === "GET") {
        const resend = getResendConfig();
        return sendJson(response, 200, {
            email: session.email,
            configuration: {
                database: Boolean(getSupabaseConfig().url && getSupabaseConfig().key),
                emailDelivery: Boolean(resend.apiKey && resend.from),
                analytics: false
            }
        });
    }

    try {
        if (action === "overview" && request.method === "GET") {
            const [summary, campaigns] = await Promise.all([
                readRows("rpc/get_waitlist_admin_summary", { method: "POST", body: "{}" }),
                readRows("waitlist_launch_campaigns?select=id,subject,status,audience_count,created_at,completed_at&order=created_at.desc&limit=1")
            ]);
            return sendJson(response, 200, {
                ...summary,
                latest_campaign: campaigns[0] || null,
                analytics_configured: false
            });
        }

        if (action === "audience" && request.method === "GET") {
            const count = await countRows(
                "waitlist_subscribers?status=eq.active&consent_status=eq.true&select=id"
            );
            return sendJson(response, 200, { eligible: count });
        }

        if (action === "subscribers" && request.method === "GET") {
            const page = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(request.query.page, 10) || 1));
            const search = typeof request.query.search === "string" ? request.query.search.trim().slice(0, 120) : "";
            const status = ["active", "unsubscribed", "suppressed"].includes(request.query.status)
                ? request.query.status
                : "";
            const sort = request.query.sort === "asc" ? "asc" : "desc";
            const params = new URLSearchParams({
                select: "id,email,created_at,status,consent_status,consented_at,launch_notified_at",
                order: `created_at.${sort}`,
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE)
            });
            if (status) params.set("status", `eq.${status}`);
            if (search) params.set("email", `ilike.*${search.replace(/[%_*,()]/g, "")}*`);
            const [rows, statusTotal] = await Promise.all([
                supabaseFetch(`waitlist_subscribers?${params}`, {
                    headers: { Prefer: "count=exact" }
                }),
                countRows(`waitlist_subscribers?${status ? `status=eq.${status}&` : ""}select=id`)
            ]);
            const contentRange = rows.headers.get("content-range") || "";
            const filteredTotal = Number(contentRange.split("/")[1]) || 0;
            return sendJson(response, 200, {
                rows: await rows.json(),
                total: statusTotal,
                filtered_total: filteredTotal,
                page,
                page_size: PAGE_SIZE
            });
        }

        if (action === "activity" && request.method === "GET") {
            const page = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(request.query.page, 10) || 1));
            const status = ["pending", "sent", "failed"].includes(request.query.status)
                ? request.query.status
                : "";
            const params = new URLSearchParams({
                select: "id,subscriber_id,notification_type,status,attempt_count,provider_message_id,last_error,created_at,sent_at,subscriber:waitlist_subscribers(email)",
                order: "created_at.desc",
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE)
            });
            if (status) params.set("status", `eq.${status}`);
            const result = await supabaseFetch(`waitlist_notification_outbox?${params}`, {
                headers: { Prefer: "count=exact" }
            });
            const contentRange = result.headers.get("content-range") || "";
            return sendJson(response, 200, {
                rows: await result.json(),
                total: Number(contentRange.split("/")[1]) || 0,
                page,
                page_size: PAGE_SIZE
            });
        }

        if (action === "campaign" && request.method === "GET") {
            const result = await getCampaign(request.query.id);
            return sendJson(response, result.status || 200, result);
        }

        if (action === "send-test" && request.method === "POST") {
            const body = getBody(request);
            const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
            const previewText = typeof body?.preview_text === "string" ? body.preview_text.trim() : "";
            const text = typeof body?.body === "string" ? body.body.trim() : "";
            if (!subject || subject.length > 200 || previewText.length > 200 || !text || text.length > 30000
                || /[\r\n\x00-\x1f\x7f]/.test(subject) || /[\r\n\x00-\x1f\x7f]/.test(previewText)) {
                return sendJson(response, 400, { error: "Add a subject and message before sending a test" });
            }
            if (!getResendConfig().apiKey || !getResendConfig().from) {
                return sendJson(response, 503, { error: "Email delivery is not configured" });
            }
            const result = await sendResendEmail({
                to: session.email,
                subject: `[Test] ${subject}`,
                text: `${previewText ? `${previewText}\n\n` : ""}${text}\n\n${SITE_URL}`,
                html: `<!doctype html><html><body><p><strong>Test message — not sent to waitlist subscribers.</strong></p><p>${escapeHtml(text).replace(/\r\n|\r|\n/g, "<br>")}</p><p><a href="${SITE_URL}">Visit PromptCV</a></p></body></html>`,
                idempotencyKey: `admin-test-${randomUUID()}`
            });
            if (!result.ok) {
                console.error("Admin test email was rejected.", { status: result.status });
                return sendJson(response, 502, { error: "The email provider could not accept the test email" });
            }
            return sendJson(response, 200, { ok: true, provider_message_id: result.id });
        }

        if (action === "create-campaign" && request.method === "POST") {
            const body = getBody(request);
            const idempotencyKey = typeof body?.idempotency_key === "string" ? body.idempotency_key : "";
            const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
            const previewText = typeof body?.preview_text === "string" ? body.preview_text.trim() : "";
            const content = typeof body?.body === "string" ? body.body.trim() : "";
            const expectedAudienceCount = Number.isInteger(body?.expected_audience_count)
                ? body.expected_audience_count
                : -1;
            if (!UUID_PATTERN.test(idempotencyKey)
                || subject.length < 1 || subject.length > 200
                || /[\r\n\x00-\x1f\x7f]/.test(subject)
                || previewText.length > 200
                || /[\r\n\x00-\x1f\x7f]/.test(previewText)
                || content.length < 1 || content.length > 30000
                || expectedAudienceCount < 0) {
                return sendJson(response, 400, { error: "Check the subject, preview text, message, and request key" });
            }
            if (!getResendConfig().apiKey || !getResendConfig().from) {
                return sendJson(response, 503, { error: "Email delivery is not configured" });
            }
            if (!getAdminConfig().sessionSecret || getAdminConfig().sessionSecret.length < 32) {
                return sendJson(response, 503, { error: "Campaign unsubscribe signing is not configured" });
            }
            const created = await readRows("rpc/create_waitlist_launch_campaign", {
                method: "POST",
                body: JSON.stringify({
                    p_idempotency_key: idempotencyKey,
                    p_subject: subject,
                    p_preview_text: previewText,
                    p_body: content,
                    p_initiated_by: session.email,
                    p_expected_audience_count: expectedAudienceCount
                })
            });
            return sendJson(response, 200, Array.isArray(created) ? created[0] : created);
        }

        if (action === "process-campaign" && request.method === "POST") {
            const body = getBody(request);
            const campaignId = typeof body?.campaign_id === "string" ? body.campaign_id : "";
            if (!UUID_PATTERN.test(campaignId)) {
                return sendJson(response, 400, { error: "A valid campaign ID is required" });
            }
            const result = await sendCampaignBatch(campaignId);
            return sendJson(response, result.status || 200, result);
        }

        return sendJson(response, 404, { error: "Admin action not found" });
    } catch (error) {
        console.error("Admin dashboard request failed.", { action, message: error.message });
        if (action === "create-campaign" && error.code === "23505") {
            return sendJson(response, 409, {
                error: "Another launch campaign is already queued or processing. Resume it before creating a new one."
            });
        }
        return sendJson(response, 503, { error: error.message || "The dashboard request failed" });
    }
};
