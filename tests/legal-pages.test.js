const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const cookieHtml = fs.readFileSync(path.join(root, "cookies.html"), "utf8");
const termsHtml = fs.readFileSync(path.join(root, "terms.html"), "utf8");
const waitlistScript = fs.readFileSync(path.join(root, "js", "main.js"), "utf8");
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));

function idsIn(html) {
    return new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
}

function internalLinksIn(html) {
    return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)]
        .map((match) => match[1])
        .filter((href) => !/^(?:#|https?:|mailto:|tel:)/i.test(href));
}

test("cookie preferences has accurate metadata, no fabricated controls, and explains current scope", () => {
    assert.match(cookieHtml, /<title>Cookie Preferences \| PromptCV<\/title>/);
    assert.match(cookieHtml, /<link rel="canonical" href="https:\/\/promptcvbynic\.vercel\.app\/cookie-preferences">/);
    assert.equal([...cookieHtml.matchAll(/<h1(?:\s|>)/g)].length, 1);
    assert.match(cookieHtml, /No optional preferences to manage/);
    assert.match(cookieHtml, /does not currently configure optional preference, analytics, performance, or advertising cookies or trackers/i);
    assert.match(cookieHtml, /does not set a first-party cookie for preferences/i);
    assert.doesNotMatch(cookieHtml, /data-cookie-(?:accept|reject|save|category)|Accept all optional cookies|Reject optional cookies|Save my preferences/);
});

test("terms page contains a navigable table of contents and all required topics", () => {
    assert.match(termsHtml, /<title>Terms of Service \| PromptCV<\/title>/);
    assert.match(termsHtml, /<link rel="canonical" href="https:\/\/promptcvbynic\.vercel\.app\/terms">/);
    assert.equal([...termsHtml.matchAll(/<h1(?:\s|>)/g)].length, 1);
    assert.match(termsHtml, /Draft — legal and product review required/);
    assert.match(termsHtml, /Effective date: pending approval/);

    const ids = idsIn(termsHtml);
    const toc = termsHtml.match(/<nav class="legal-toc"[\s\S]*?<\/nav>/)[0];
    [...toc.matchAll(/href="#([^"]+)"/g)].forEach(([, id]) => {
        assert.ok(ids.has(id), `Table-of-contents target #${id} is missing`);
    });

    [
        "About PromptCV", "Acceptance of these terms", "Eligibility and authority",
        "The service", "Accounts and security", "Your content", "AI-assisted content",
        "Career and employment outcomes", "Acceptable use", "Intellectual property",
        "Third-party services and links", "Fees and transactions", "Privacy and cookies",
        "Suspension and termination", "Disclaimers and limitation of liability",
        "Indemnity and disputes", "Changes to these Terms", "Severability and entire agreement", "Contact"
    ].forEach((topic) => assert.ok(termsHtml.includes(topic), `Missing Terms topic: ${topic}`));

    assert.match(termsHtml, /legal person or business responsible.*jurisdiction have not been confirmed/i);
    assert.match(termsHtml, /No particular jurisdiction or dispute forum is asserted/i);
    assert.match(termsHtml, /does not guarantee interviews, employment, a salary increase/i);
});

test("clean legal routes and legacy HTML paths resolve without removing existing rewrites", () => {
    const rewrites = new Map(vercel.rewrites.map(({ source, destination }) => [source, destination]));
    const redirects = new Map(vercel.redirects.map(({ source, destination }) => [source, destination]));
    assert.equal(rewrites.get("/cookie-preferences"), "/cookies.html");
    assert.equal(rewrites.get("/terms"), "/terms.html");
    assert.equal(redirects.get("/cookies.html"), "/cookie-preferences");
    assert.equal(redirects.get("/terms.html"), "/terms");
    assert.equal(rewrites.get("/admin"), "/admin/index.html");
    assert.equal(rewrites.get("/resources"), "/resources.html");
});

test("public page footers link to both legal routes and waitlist links do not change email consent", () => {
    const pageFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
    const nestedPages = ["about.html", "contact.html"].map((file) => path.join(root, "comapny", file));
    [...pageFiles.map((file) => path.join(root, file)), ...nestedPages]
        .filter((file) => fs.statSync(file).size > 0)
        .forEach((file) => {
            const html = fs.readFileSync(file, "utf8");
            assert.match(html, /href="(?:\.\.\/)?terms\.html"/, `${path.basename(file)} is missing Terms link`);
            assert.match(html, /href="(?:\.\.\/)?cookies\.html"/, `${path.basename(file)} is missing Cookie Preferences link`);
        });

    assert.match(waitlistScript, /Terms of Service/);
    assert.match(waitlistScript, /waitlist-consent[\s\S]*?name="consent" type="checkbox" required/);
    assert.match(waitlistScript, /waitlist-legal-links[\s\S]*?href="\$\{termsPath\}"/);
});

test("legal-page internal file and fragment links resolve", () => {
    [
        { name: "cookies.html", html: cookieHtml },
        { name: "terms.html", html: termsHtml }
    ].forEach(({ name, html }) => {
        const ids = idsIn(html);
        internalLinksIn(html).forEach((href) => {
            const [file, fragment] = href.split("#");
            if (!file) {
                assert.ok(ids.has(fragment), `${name} links to missing #${fragment}`);
                return;
            }
            if (file === "terms" || file === "cookie-preferences") return;
            const target = path.resolve(root, path.dirname(name), file);
            assert.ok(target.startsWith(root), `${name} contains an out-of-scope link: ${href}`);
            assert.ok(fs.existsSync(target), `${name} links to missing file: ${href}`);
            if (fragment) {
                assert.ok(idsIn(fs.readFileSync(target, "utf8")).has(fragment), `${name} links to missing fragment: ${href}`);
            }
        });
    });
});
