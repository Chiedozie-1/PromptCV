const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "resources.html"), "utf8");
const script = fs.readFileSync(path.join(root, "js", "resources.js"), "utf8");
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const rewrites = new Map(vercel.rewrites.map(({ source, destination }) => [
    source.slice(1),
    destination.replace(/^\/+/, "")
]));

function attributes(tag) {
    return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)]
        .map((match) => [match[1], match[2]]));
}

test("career resources route has complete, indexable page metadata and one H1", () => {
    assert.match(html, /<title>Career Resources — PromptCV<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/promptcvbynic\.vercel\.app\/resources">/);
    assert.match(html, /<meta property="og:title" content="Career Resources — PromptCV">/);
    assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1);
    assert.ok(vercel.rewrites.some((rewrite) => rewrite.source === "/resources" && rewrite.destination === "/resources.html"));
    assert.ok(vercel.redirects.some((redirect) => redirect.source === "/resources.html" && redirect.destination === "/resources"));
});

test("every resource card has searchable metadata, a useful summary, and a working destination", () => {
    const cardTags = [...html.matchAll(/<article class="resource-card[^"]*"[^>]*data-resource-card[^>]*>/g)]
        .map((match) => attributes(match[0]));
    const cardBlocks = [...html.matchAll(/<article class="resource-card[^"]*"[^>]*data-resource-card[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(cardBlocks.length, 8);
    assert.equal(cardTags.length, cardBlocks.length);

    cardBlocks.forEach((match, index) => {
        const block = match[1];
        assert.ok(cardTags[index]["data-category"]);
        assert.ok(cardTags[index]["data-tags"]);
        assert.match(block, /<h3><a href="[^"]+">[^<]+<\/a><\/h3>/);
        assert.match(block, /<p>[^<]{30,}<\/p>/);
        assert.match(block, /class="resource-card-link" href="[^"]+"/);
    });
});

test("all internal resource links and article anchors resolve", () => {
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
    const cardTargets = links.filter((href) => href.startsWith("#")).map((href) => href.slice(1));
    cardTargets.forEach((target) => assert.ok(ids.has(target), `Missing resource anchor #${target}`));

    const fileLinks = links.filter((href) => !href.startsWith("#") && !href.startsWith("https://"));
    fileLinks.forEach((href) => {
        const [file, fragment] = href.split("#");
        const targetPath = path.resolve(root, rewrites.get(file) || file);
        assert.ok(targetPath.startsWith(root), `Unexpected path ${href}`);
        assert.ok(fs.existsSync(targetPath), `Missing linked file ${href}`);
        if (fragment) {
            const targetHtml = fs.readFileSync(targetPath, "utf8");
            assert.match(targetHtml, new RegExp(`\\\\bid="${fragment}"`), `Missing fragment ${href}`);
        }
    });
});

test("search supports all visible topic filters and announces empty results", () => {
    const categories = new Set([...html.matchAll(/data-category-filter="([^"]+)"/g)].map((match) => match[1]));
    const cardCategories = new Set([...html.matchAll(/data-resource-card[^>]*data-category="([^"]+)"/g)].map((match) => match[1]));
    cardCategories.forEach((category) => assert.ok(categories.has(category), `No filter for ${category}`));
    assert.match(html, /id="resource-result-count"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(html, /id="resource-empty-state"[^>]*hidden/);
    assert.match(html, /id="resource-reset"/);
    assert.match(script, /search\.value\.trim\(\)\.toLocaleLowerCase\(\)/);
    assert.match(script, /card\.hidden = !isVisible/);
});
