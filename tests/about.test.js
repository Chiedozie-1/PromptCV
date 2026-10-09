const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "comapny", "about.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css", "about.css"), "utf8");

test("About page introduces NIC Technologies and its purpose", () => {
    assert.match(html, /id="the-people"/);
    assert.match(html, /NIC Technologies is a fast-growing technology company/i);
    assert.match(html, /focused on creating practical solutions to everyday problems/i);
    assert.match(html, /PromptCV is one expression of that purpose/i);
});

test("About page credits the developer and fits the accessible portrait into its frame", () => {
    assert.match(html, /Chiedozie Ikechukwu Nkulo/);
    assert.match(html, /PromptCV was created to help job seekers present their skills, experience, and professional stories more effectively/);
    assert.match(html, /src="\.\.\/assets\/images\/about\.jpg"/);
    assert.match(html, /alt="Chiedozie Ikechukwu Nkulo, developer of PromptCV"/);
    assert.match(css, /\.about-developer-portrait\s*\{[^}]*height:\s*clamp\([^}]*overflow:\s*hidden/);
    assert.match(css, /\.about-developer-silhouette\s*\{[^}]*width:\s*100%[^}]*height:\s*100%[^}]*object-fit:\s*cover/);
});

test("About page people navigation and responsive styles target the section", () => {
    assert.match(html, /<a href="#the-people">The people<\/a>/);
    assert.match(html, /class="about-people section-space" id="the-people"/);
    assert.match(css, /\.about-people\s*\{[^}]*border-top:\s*clamp\([^;]+#faf9f5/);
    assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.about-developer\s*\{[^}]*grid-template-columns: 1fr/);
    assert.match(css, /\.about-people\s*\{[^}]*scroll-margin-top:/);
});
