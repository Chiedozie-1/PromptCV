const { createHmac, timingSafeEqual } = require("node:crypto");

const COOKIE_NAME = "__Host-promptcv_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function getAdminConfig() {
    return {
        email: (process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
        sessionSecret: process.env.ADMIN_SESSION_SECRET || "",
        supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
        anonKey: process.env.SUPABASE_ANON_KEY || ""
    };
}

function secureEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length
        && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value, secret) {
    return createHmac("sha256", secret).update(value).digest("base64url");
}

function createSessionCookie(email, secret, maxAge = SESSION_MAX_AGE) {
    const expiresAt = Math.floor(Date.now() / 1000) + maxAge;
    const payload = Buffer.from(JSON.stringify({ email, expiresAt })).toString("base64url");
    const value = `${payload}.${sign(payload, secret)}`;
    return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function getCookie(request, name) {
    const header = request.headers.cookie || "";
    for (const part of header.split(";")) {
        const separator = part.indexOf("=");
        if (separator < 0) continue;
        if (part.slice(0, separator).trim() === name) {
            return part.slice(separator + 1).trim();
        }
    }
    return "";
}

function getSession(request, config = getAdminConfig()) {
    if (!config.email || config.sessionSecret.length < 32) return null;
    const value = getCookie(request, COOKIE_NAME);
    const separator = value.lastIndexOf(".");
    if (separator < 1) return null;

    const payload = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    if (!secureEqual(signature, sign(payload, config.sessionSecret))) return null;

    try {
        const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (session.email !== config.email || session.expiresAt <= Math.floor(Date.now() / 1000)) {
            return null;
        }
        return { email: session.email };
    } catch {
        return null;
    }
}

function isSameOrigin(request) {
    const origin = request.headers.origin;
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    if (!origin || !host) return false;

    try {
        const parsedOrigin = new URL(origin);
        return parsedOrigin.host.toLowerCase() === String(host).toLowerCase()
            && parsedOrigin.protocol === (request.headers["x-forwarded-proto"] || "https") + ":";
    } catch {
        return false;
    }
}

module.exports = {
    COOKIE_NAME,
    SESSION_MAX_AGE,
    clearSessionCookie,
    createSessionCookie,
    getAdminConfig,
    getSession,
    isSameOrigin
};
