const { createHmac, timingSafeEqual } = require("node:crypto");
const { getAdminConfig } = require("../../lib/admin-auth");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getToken(request) {
    const source = request.method === "POST"
        ? { ...request.query, ...(request.body || {}) }
        : request.query;
    return {
        subscriberId: typeof source.subscriber === "string" ? source.subscriber : "",
        campaignId: typeof source.campaign === "string" ? source.campaign : "",
        token: typeof source.token === "string" ? source.token : ""
    };
}

function sendPage(response, status, message) {
    response.setHeader("Cache-Control", "no-store, private");
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    return response.status(status).send(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>PromptCV email preferences</title>
<body style="margin:0;background:#f3f7f5;color:#172b2d;font:16px/1.6 Arial,sans-serif">
<main style="max-width:520px;margin:12vh auto;padding:32px;background:#fff;border-radius:16px">
<p style="color:#177f72;font-weight:bold;letter-spacing:.12em">PROMPTCV</p>
<h1>Email preferences</h1><p>${message}</p></main></body></html>`);
}

module.exports = async function unsubscribe(request, response) {
    if (request.method !== "GET" && request.method !== "POST") {
        response.setHeader("Allow", "GET, POST");
        return sendPage(response, 405, "This request method is not supported.");
    }
    const { subscriberId, campaignId, token } = getToken(request);
    const config = getAdminConfig();
    if (!UUID_PATTERN.test(subscriberId) || !UUID_PATTERN.test(campaignId)
        || !token || config.sessionSecret.length < 32) {
        return sendPage(response, 400, "This unsubscribe link is invalid or expired.");
    }
    const expected = createHmac("sha256", config.sessionSecret)
        .update(`${subscriberId}:${campaignId}`)
        .digest("base64url");
    if (!safeEqual(token, expected)) {
        return sendPage(response, 400, "This unsubscribe link is invalid or expired.");
    }

    if (request.method === "GET") {
        const action = `/api/waitlist/unsubscribe?subscriber=${encodeURIComponent(subscriberId)}&campaign=${encodeURIComponent(campaignId)}&token=${encodeURIComponent(token)}`
            .replace(/&/g, "&amp;");
        return sendPage(response, 200, `You can stop receiving PromptCV launch emails below.<form action="${action}" method="post" style="margin-top:24px"><input type="hidden" name="subscriber" value="${subscriberId}"><input type="hidden" name="campaign" value="${campaignId}"><input type="hidden" name="token" value="${token}"><button type="submit" style="padding:12px 18px;border:0;border-radius:8px;background:#126b62;color:#fff;font-size:16px;cursor:pointer">Unsubscribe</button></form>`);
    }

    const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Waitlist unsubscribe database configuration is incomplete.");
        return sendPage(response, 503, "We could not update your preference right now. Please try again later.");
    }
    try {
        const update = await fetch(
            `${supabaseUrl}/rest/v1/waitlist_subscribers?id=eq.${encodeURIComponent(subscriberId)}&status=eq.active`,
            {
                method: "PATCH",
                headers: {
                    apikey: serviceRoleKey,
                    Authorization: `Bearer ${serviceRoleKey}`,
                    "Content-Type": "application/json",
                    Prefer: "return=representation"
                },
                body: JSON.stringify({
                    status: "unsubscribed",
                    consent_status: false,
                    updated_at: new Date().toISOString()
                })
            }
        );
        if (!update.ok) throw new Error(`Database returned ${update.status}`);
        return sendPage(response, 200, "You have been unsubscribed from PromptCV launch emails.");
    } catch (error) {
        console.error("Waitlist unsubscribe update failed.", { message: error.message });
        return sendPage(response, 503, "We could not update your preference right now. Please try again later.");
    }
};
