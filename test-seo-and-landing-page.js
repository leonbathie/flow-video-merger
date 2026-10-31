// Automated Test Suite: GitHub Pages SEO Landing Page & Discoverability
// Verifies docs/index.html, Schema.org JSON-LD, meta tags, robots.txt, and sitemap.xml

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running test-seo-and-landing-page.js...');

const docsDir = path.join(__dirname, 'docs');
const indexPath = path.join(docsDir, 'index.html');
const robotsPath = path.join(docsDir, 'robots.txt');
const sitemapPath = path.join(docsDir, 'sitemap.xml');
const nojekyllPath = path.join(docsDir, '.nojekyll');
const iconPath = path.join(docsDir, 'icons', 'icon128.png');

// 1. Files existence check
assert(fs.existsSync(indexPath), 'docs/index.html must exist');
assert(fs.existsSync(robotsPath), 'docs/robots.txt must exist');
assert(fs.existsSync(sitemapPath), 'docs/sitemap.xml must exist');
assert(fs.existsSync(nojekyllPath), 'docs/.nojekyll must exist');
assert(fs.existsSync(iconPath), 'docs/icons/icon128.png must exist for favicon and OG preview');
console.log('  ✅ 1. All core docs/ files and icons exist');

// 2. robots.txt verification
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(robotsContent.includes('User-agent: *'), 'robots.txt must allow all user-agents');
assert(robotsContent.includes('Allow: /'), 'robots.txt must allow crawling');
assert(robotsContent.includes('sitemap.xml'), 'robots.txt must point to sitemap.xml');
console.log('  ✅ 2. docs/robots.txt properly configured for Googlebot');

// 3. sitemap.xml verification
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
assert(sitemapContent.includes('<loc>https://leonbathie.github.io/flow-video-merger/</loc>'), 'sitemap must specify canonical URL');
assert(sitemapContent.includes('<priority>1.0</priority>'), 'sitemap must set priority 1.0');
console.log('  ✅ 3. docs/sitemap.xml valid and properly formatted');

// 4. index.html SEO and Metadata verification
const htmlContent = fs.readFileSync(indexPath, 'utf8');

// Title & Meta tags
assert(/<title>.*(Flow Video Merger|Google Flow).*<\/title>/i.test(htmlContent), 'Title must contain core keywords');
assert(htmlContent.includes('name="description"'), 'Meta description must be present');
assert(htmlContent.includes('name="keywords"'), 'Meta keywords must be present');
assert(htmlContent.includes('flow-video-merger'), 'Keywords must contain flow-video-merger token');
assert(htmlContent.includes('name="viewport"'), 'Mobile viewport tag must be present');
assert(htmlContent.includes('rel="canonical"'), 'Canonical URL tag must be present');
console.log('  ✅ 4. HTML meta tags, viewport, and canonical link present');

// Open Graph & Twitter Cards
assert(htmlContent.includes('property="og:title"'), 'og:title must be present');
assert(htmlContent.includes('property="og:description"'), 'og:description must be present');
assert(htmlContent.includes('property="og:image"'), 'og:image must be present');
assert(htmlContent.includes('name="twitter:card"'), 'twitter:card must be present');
console.log('  ✅ 5. Open Graph and Twitter Card tags present');

// Schema.org JSON-LD validation
const jsonLdMatch = htmlContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(jsonLdMatch && jsonLdMatch[1], 'Schema.org JSON-LD script block must exist');

let parsedJsonLd;
try {
  parsedJsonLd = JSON.parse(jsonLdMatch[1]);
} catch (e) {
  assert.fail(`Invalid JSON-LD syntax: ${e.message}`);
}

assert(parsedJsonLd['@context'] === 'https://schema.org', 'Schema context must be schema.org');
const graph = parsedJsonLd['@graph'];
assert(Array.isArray(graph), '@graph must be an array of schemas');

const softwareApp = graph.find(item => item['@type'] === 'SoftwareApplication');
assert(softwareApp, 'SoftwareApplication schema must be present');
assert(softwareApp.name === 'Flow Video Merger', 'SoftwareApplication name must match');
assert(softwareApp.codeRepository === 'https://github.com/leonbathie/flow-video-merger', 'codeRepository must link to GitHub repo');

const faqPage = graph.find(item => item['@type'] === 'FAQPage');
assert(faqPage, 'FAQPage schema must be present');
assert(Array.isArray(faqPage.mainEntity) && faqPage.mainEntity.length > 0, 'FAQPage must contain questions');
console.log('  ✅ 6. Schema.org JSON-LD (SoftwareApplication + FAQPage) valid');

// Backlinks to GitHub repo
assert(htmlContent.includes('https://github.com/leonbathie/flow-video-merger'), 'Landing page must link to GitHub repository');
assert(htmlContent.includes('https://github.com/leonbathie/flow-video-merger/archive/refs/heads/main.zip'), 'Landing page must have direct ZIP download');
console.log('  ✅ 7. Inbound repository links and download CTAs verified');

// Bilingual / French Section
assert(htmlContent.includes('id="documentation-fr"'), 'French section anchor must exist');
console.log('  ✅ 8. French SEO content section verified');

console.log('🎉 test-seo-and-landing-page.js: ALL TESTS PASSED!\n');
