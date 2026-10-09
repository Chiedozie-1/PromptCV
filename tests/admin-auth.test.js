const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHmac } = require("node:crypto");
const {
    createSessionCookie,
    getSession,
    isSameOrigin
} = require("../lib/admin-auth");
const adminHandler = require("../api/admin");
const unsubscribeHandler = require("../api/waitlist/unsubscribe");

const TEST_EMAIL = "admin@example.test";
const TEST_SECRET = "test-session-signing-secret-at-least-32-bytes";

function setAdminEnvironment(t) {
    const previousEmail = process.env.ADMIN_EMAIL;
    const previousSecret = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_EMAIL = TEST_EMAIL;
    process.env.ADMIN_SESSION_SECRET = TEST_SECRET;
    t.after(() => {
        if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
        else process.env.ADMIN_EMAIL = previousEmail;
        if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
        else process.env.ADMIN_SESSION_SECRET = previousSecret;
    });
}

function responseStub() {
    return {
        statusCode: 0,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        send(body) {
            this.body = body;
            return this;
        },
        setHeader(name, value) {
            this.headers[name] = value;
        }
    };
}

test("valid signed admin session is accepted", (t) => {
    setAdminEnvironment(t);
    const cookieHeader = createSessionCookie(TEST_EMAIL, TEST_SECRET, 600);
    assert.match(cookieHeader, /; HttpOnly; Secure; SameSite=Strict;/);
    const cookie = cookieHeader.split(";")[0];
    assert.deepEqual(getSession({ headers: { cookie } }), { email: TEST_EMAIL });
});

test("tampered and expired admin sessions are rejected", (t) => {
    setAdminEnvironment(t);
    const validCookie = createSessionCookie(TEST_EMAIL, TEST_SECRET, 600).split(";")[0];
    const [name, value] = validCookie.split("=");
    const [payload, signature] = value.split(".");
    const forgedCookie = `${name}=${payload}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
    assert.equal(getSession({ headers: { cookie: forgedCookie } }), null);

    const expiredCookie = createSessionCookie(TEST_EMAIL, TEST_SECRET, -1).split(";")[0];
    assert.equal(getSession({ headers: { cookie: expiredCookie } }), null);
});

test("state-changing requests require a matching origin", () => {
    assert.equal(isSameOrigin({
        headers: {
            origin: "https://promptcv.example",
            host: "promptcv.example",
            "x-forwarded-proto": "https"
        }
    }), true);
    assert.equal(isSameOrigin({
        headers: {
            origin: "https://attacker.example",
            host: "promptcv.example",
            "x-forwarded-proto": "https"
        }
    }), false);
});

test("admin data API rejects unauthenticated requests", async () => {
    const response = responseStub();
    await adminHandler({
        method: "GET",
        query: { action: "overview" },
        headers: {}
    }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error, "Sign in to access the admin dashboard");
});

test("admin JavaScript only references elements present in the dashboard HTML", () => {
    const html = fs.readFileSync(path.join(__dirname, "..", "admin", "index.html"), "utf8");
    const script = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.js"), "utf8");
    const declaredIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
    const referencedIds = new Set([...script.matchAll(/\bbyId\("([^"]+)"\)/g)].map((match) => match[1]));
    const missingIds = [...referencedIds].filter((id) => !declaredIds.has(id));
    assert.deepEqual(missingIds, []);
});

test("unsubscribe links require confirmation before changing subscriber status", async (t) => {
    setAdminEnvironment(t);
    const subscriber = "120e4567-e89b-42d3-a456-426614174000";
    const campaign = "320e4567-e89b-42d3-a456-426614174000";
    const token = createHmac("sha256", TEST_SECRET)
        .update(`${subscriber}:${campaign}`)
        .digest("base64url");
    const response = responseStub();
    await unsubscribeHandler({
        method: "GET",
        query: { subscriber, campaign, token },
        headers: {}
    }, response);
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /method="post"/);
    assert.equal(response.headers["Cache-Control"], "no-store, private");
});
