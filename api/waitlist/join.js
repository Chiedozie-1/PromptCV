// const { createHmac } = require("node:crypto");

// const MAX_BODY_BYTES = 4096;

// function sendJson(response, status, body) {
//     response.status(status).json(body);
// }

// function getClientIp(request) {
//     const forwardedFor = request.headers["x-forwarded-for"];
//     const forwardedChain = typeof forwardedFor === "string"
//         ? forwardedFor
//         : Array.isArray(forwardedFor) ? forwardedFor[0] : "";
//     const ip = forwardedChain.split(",").pop().trim()
//         || request.headers["x-real-ip"]
//         || request.socket?.remoteAddress
//         || "unknown";

//     return createHmac("sha256", process.env.SUPABASE_SECRET_KEY || "unconfigured")
//         .update(String(ip))
//         .digest("hex");
// }

// function supabaseHeaders() {
//     const key = process.env.SUPABASE_SECRET_KEY;
//     return {
//         apikey: key,
//         Authorization: `Bearer ${key}`,
//         "Content-Type": "application/json"
//     };
// }

// async function readFailureCode(response) {
//     try {
//         const payload = await response.json();
//         return payload.code || null;
//     } catch {
//         return null;
//     }
// }

// async function updateNotification(notificationId, values) {
//     const baseUrl = process.env.SUPABASE_URL.replace(/\/+$/, "");
//     const response = await fetch(
//         `${baseUrl}/rest/v1/waitlist_notification_outbox?id=eq.${encodeURIComponent(notificationId)}`,
//         {
//             method: "PATCH",
//             headers: {
//                 ...supabaseHeaders(),
//                 Prefer: "return=minimal"
//             },
//             body: JSON.stringify(values)
//         }
//     );

//     if (!response.ok) {
//         throw new Error("Could not update waitlist notification status");
//     }
// }

// function escapeHtml(value) {
//     return value.replace(/[&<>"']/g, (character) => ({
//         "&": "&amp;",
//         "<": "&lt;",
//         ">": "&gt;",
//         '"': "&quot;",
//         "'": "&#39;"
//     })[character]);
// }

// async function sendAdminNotification(subscriber, notificationId) {
//     const apiKey = process.env.RESEND_API_KEY;
//     const from = process.env.EMAIL_FROM;
//     const to = process.env.ADMIN_NOTIFICATION_EMAIL || "nictech005@gmail.com";
//     if (!apiKey || !from) return;

//     const date = subscriber.signup_created_at || new Date().toISOString();
//     const escapedEmail = escapeHtml(subscriber.email);
//     const response = await fetch("https://api.resend.com/emails", {
//         method: "POST",
//         headers: {
//             Authorization: `Bearer ${apiKey}`,
//             "Content-Type": "application/json",
//             "Idempotency-Key": `waitlist-notification-${notificationId}`
//         },
//         body: JSON.stringify({
//             from,
//             to: [to],
//             subject: "New PromptCV waitlist signup",
//             text: `A new visitor joined the PromptCV waitlist.\n\nEmail: ${subscriber.email}\nSigned up: ${date}`,
//             html: `<p>A new visitor joined the PromptCV waitlist.</p><p><strong>Email:</strong> ${escapedEmail}<br><strong>Signed up:</strong> ${date}</p>`
//         })
//     });

//     if (!response.ok) {
//         await updateNotification(notificationId, {
//             status: "failed",
//             attempt_count: 1,
//             last_error: "Email provider rejected the notification"
//         });
//         console.error("Waitlist admin notification failed.", { notificationId });
//         return;
//     }

//     let providerMessageId = null;
//     try {
//         const result = await response.json();
//         providerMessageId = result.id || null;
//     } catch {
//         providerMessageId = null;
//     }

//     try {
//         await updateNotification(notificationId, {
//             status: "sent",
//             attempt_count: 1,
//             provider_message_id: providerMessageId,
//             sent_at: new Date().toISOString(),
//             last_error: null
//         });
//     } catch (error) {
//         console.error("Waitlist notification status update failed.", {
//             notificationId,
//             message: error.message
//         });
//     }
// }

// module.exports = async function joinWaitlist(request, response) {
//     if (request.method !== "POST") {
//         response.setHeader("Allow", "POST");
//         return sendJson(response, 405, { error: "Method not allowed" });
//     }

//     const body = request.body;
//     if (!body || typeof body !== "object" || Array.isArray(body)) {
//         return sendJson(response, 400, { error: "A valid signup request is required" });
//     }
//     if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
//         return sendJson(response, 413, { error: "Request is too large" });
//     }

//     const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
//     const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (email.length > 254 || !emailPattern.test(email) || body.consent !== true) {
//         return sendJson(response, 400, { error: "Enter a valid email address and accept the consent notice" });
//     }

//     const supabaseUrl = process.env.SUPABASE_URL;
//     const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
//     if (!supabaseUrl || !serviceRoleKey) {
//         console.error("Waitlist storage is not configured.");
//         return sendJson(response, 503, { error: "Waitlist signup is temporarily unavailable" });
//     }

//     let signup;
//     try {
//         const result = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/join_waitlist`, {
//             method: "POST",
//             headers: supabaseHeaders(),
//             body: JSON.stringify({ p_email: email, p_ip_hash: getClientIp(request) })
//         });

//         if (!result.ok) {
//             const code = await readFailureCode(result);
//             if (code === "P4290") {
//                 return sendJson(response, 429, { error: "Too many signup attempts. Please try again later." });
//             }
//             throw new Error(`Waitlist storage request failed (${result.status})`);
//         }

//         const payload = await result.json();
//         signup = Array.isArray(payload) ? payload[0] : payload;
//         if (!signup) {
//             throw new Error("Waitlist storage returned an invalid response");
//         }
//         if (signup.rate_limited === true) {
//             return sendJson(response, 429, { error: "Too many signup attempts. Please try again later." });
//         }
//         if (typeof signup.inserted !== "boolean") {
//             throw new Error("Waitlist storage returned an invalid response");
//         }
//     } catch (error) {
//         console.error("Waitlist signup could not be stored.", { message: error.message });
//         return sendJson(response, 503, { error: "We couldn't add you right now. Please try again in a moment." });
//     }

//     if (signup.inserted && signup.notification_id) {
//         if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
//             console.warn("Waitlist admin notification is pending configuration.", {
//                 notificationId: signup.notification_id
//             });
//         } else {
//             try {
//                 await sendAdminNotification({ email, ...signup }, signup.notification_id);
//             } catch (error) {
//                 try {
//                     await updateNotification(signup.notification_id, {
//                         status: "failed",
//                         attempt_count: 1,
//                         last_error: "Email notification could not be delivered"
//                     });
//                 } catch (updateError) {
//                     console.error("Waitlist notification recovery update failed.", {
//                         notificationId: signup.notification_id,
//                         message: updateError.message
//                     });
//                 }
//                 console.error("Waitlist admin notification request failed.", {
//                     notificationId: signup.notification_id,
//                     message: error.message
//                 });
//             }
//         }
//     }

//     return sendJson(response, 200, { ok: true });
// };

// module.exports.config = {
//     api: {
//         bodyParser: {
//             sizeLimit: "4kb"
//         }
//     }
// };



const { createHmac } = require("node:crypto");

const MAX_BODY_BYTES = 4096;

// Send a consistent JSON response.
function sendJson(response, status, body) {
    return response.status(status).json(body);
}

// Read configuration from Vercel Environment Variables.
function getConfig() {
    return {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SECRET_KEY,
        ipHashSecret: process.env.WAITLIST_IP_HASH_SECRET,
        resendApiKey: process.env.RESEND_API_KEY,
        emailFrom: process.env.EMAIL_FROM,
        adminEmail:
            process.env.ADMIN_NOTIFICATION_EMAIL ||
            "nictech005@gmail.com"
    };
}

// Hash the client's IP address without storing the raw IP.
function getClientIpHash(request, secret) {
    const realIp = request.headers["x-real-ip"];

    const forwardedFor = request.headers["x-forwarded-for"];
    const forwardedChain =
        typeof forwardedFor === "string"
            ? forwardedFor
            : Array.isArray(forwardedFor)
                ? forwardedFor[0]
                : "";

    // Prefer the IP header supplied by the hosting platform.
    const ip =
        (typeof realIp === "string" ? realIp.trim() : "") ||
        forwardedChain.split(",")[0].trim() ||
        request.socket?.remoteAddress ||
        "unknown";

    return createHmac("sha256", secret)
        .update(String(ip))
        .digest("hex");
}

// Headers for server-side Supabase REST API requests.
function supabaseHeaders(config) {
    return {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json"
    };
}

// Safely read a Supabase error code.
async function readFailureCode(response) {
    try {
        const payload = await response.json();
        return payload.code || null;
    } catch {
        return null;
    }
}

// Update the notification queue record in Supabase.
async function updateNotification(config, notificationId, values) {
    const baseUrl = config.supabaseUrl.replace(/\/+$/, "");

    const response = await fetch(
        `${baseUrl}/rest/v1/waitlist_notification_outbox?id=eq.${encodeURIComponent(notificationId)}`,
        {
            method: "PATCH",
            headers: {
                ...supabaseHeaders(config),
                Prefer: "return=minimal"
            },
            body: JSON.stringify(values)
        }
    );

    if (!response.ok) {
        throw new Error(
            `Notification status update failed (${response.status})`
        );
    }
}

// Escape user-provided text before including it in HTML email.
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Send the admin an email about a new signup.
async function sendAdminNotification(
    config,
    subscriber,
    notificationId
) {
    const signupDate =
        subscriber.signup_created_at ||
        new Date().toISOString();

    const safeEmail = escapeHtml(subscriber.email);
    const safeDate = escapeHtml(signupDate);

    const response = await fetch(
        "https://api.resend.com/emails",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.resendApiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key":
                    `waitlist-notification-${notificationId}`
            },
            body: JSON.stringify({
                from: config.emailFrom,
                to: [config.adminEmail],
                subject: "New PromptCV waitlist signup",
                text:
                    "A new visitor joined the PromptCV waitlist.\n\n" +
                    `Email: ${subscriber.email}\n` +
                    `Signed up: ${signupDate}`,
                html:
                    "<p>A new visitor joined the PromptCV waitlist.</p>" +
                    `<p><strong>Email:</strong> ${safeEmail}<br>` +
                    `<strong>Signed up:</strong> ${safeDate}</p>`
            })
        }
    );

    if (!response.ok) {
        await updateNotification(config, notificationId, {
            status: "failed",
            attempt_count: 1,
            last_error: "Email provider rejected the notification"
        });

        console.error(
            "Waitlist admin notification failed.",
            { notificationId, status: response.status }
        );

        return;
    }

    let providerMessageId = null;

    try {
        const result = await response.json();
        providerMessageId = result.id || null;
    } catch {
        // The provider may return an empty or unexpected response.
    }

    try {
        await updateNotification(config, notificationId, {
            status: "sent",
            attempt_count: 1,
            provider_message_id: providerMessageId,
            sent_at: new Date().toISOString(),
            last_error: null
        });
    } catch (error) {
        console.error(
            "Waitlist notification status update failed.",
            { notificationId, message: error.message }
        );
    }
}

module.exports = async function joinWaitlist(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");

        return sendJson(response, 405, {
            error: "Method not allowed"
        });
    }

    const body = request.body;

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        return sendJson(response, 400, {
            error: "A valid signup request is required"
        });
    }

    let bodySize;

    try {
        bodySize = Buffer.byteLength(
            JSON.stringify(body),
            "utf8"
        );
    } catch {
        return sendJson(response, 400, {
            error: "Invalid signup request"
        });
    }

    if (bodySize > MAX_BODY_BYTES) {
        return sendJson(response, 413, {
            error: "Request is too large"
        });
    }

    const email =
        typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : "";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        email.length > 254 ||
        !emailPattern.test(email) ||
        body.consent !== true
    ) {
        return sendJson(response, 400, {
            error:
                "Enter a valid email address and accept the consent notice"
        });
    }

    const config = getConfig();

    if (
        !config.supabaseUrl ||
        !config.supabaseKey ||
        !config.ipHashSecret
    ) {
        console.error(
            "Waitlist storage configuration is incomplete."
        );

        return sendJson(response, 503, {
            error:
                "Waitlist signup is temporarily unavailable"
        });
    }

    let signup;

    try {
        const baseUrl = config.supabaseUrl.replace(/\/+$/, "");
        const ipHash = getClientIpHash(
            request,
            config.ipHashSecret
        );

        const result = await fetch(
            `${baseUrl}/rest/v1/rpc/join_waitlist`,
            {
                method: "POST",
                headers: supabaseHeaders(config),
                body: JSON.stringify({
                    p_email: email,
                    p_ip_hash: ipHash
                })
            }
        );

        if (!result.ok) {
            const code = await readFailureCode(result);

            if (code === "P4290") {
                return sendJson(response, 429, {
                    error:
                        "Too many signup attempts. Please try again later."
                });
            }

            throw new Error(
                `Supabase signup request failed (${result.status}); code: ${code || "unknown"}`
            );
        }

        const payload = await result.json();
        signup = Array.isArray(payload) ? payload[0] : payload;

        if (
            !signup ||
            typeof signup.inserted !== "boolean"
        ) {
            throw new Error(
                "Supabase returned an invalid signup response"
            );
        }

        if (signup.rate_limited === true) {
            return sendJson(response, 429, {
                error:
                    "Too many signup attempts. Please try again later."
            });
        }
    } catch (error) {
        console.error(
            "Waitlist signup could not be stored.",
            { message: error.message }
        );

        return sendJson(response, 503, {
            error:
                "We couldn't add you right now. Please try again in a moment."
        });
    }

    // Only new signups that have a queued notification trigger an email.
    if (signup.inserted && signup.notification_id) {
        if (!config.resendApiKey || !config.emailFrom) {
            console.warn(
                "Admin email is not configured; notification remains queued.",
                { notificationId: signup.notification_id }
            );
        } else {
            try {
                await sendAdminNotification(
                    config,
                    {
                        email,
                        signup_created_at:
                            signup.signup_created_at
                    },
                    signup.notification_id
                );
            } catch (error) {
                try {
                    await updateNotification(
                        config,
                        signup.notification_id,
                        {
                            status: "failed",
                            attempt_count: 1,
                            last_error:
                                "Email notification could not be delivered"
                        }
                    );
                } catch (updateError) {
                    console.error(
                        "Notification recovery update failed.",
                        {
                            notificationId: signup.notification_id,
                            message: updateError.message
                        }
                    );
                }

                console.error(
                    "Admin notification request failed.",
                    {
                        notificationId: signup.notification_id,
                        message: error.message
                    }
                );
            }
        }
    }

    // Do not reveal whether an email address already exists.
    return sendJson(response, 200, { ok: true });
};

module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: "4kb"
        }
    }
};