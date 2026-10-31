// Automated Test Suite: GitHub Pages SEO Landing Page, Multilingual Indexing & Discoverability
// Verifies docs/index.html, docs/fr/index.html, Schema.org JSON-LD, meta tags, robots.txt, and sitemap.xml

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running test-seo-and-landing-page.js...');

const docsDir = path.join(__dirname, 'docs');
const indexPath = path.join(docsDir, 'index.html');
const frIndexPath = path.join(docsDir, 'fr', 'index.html');
const robotsPath = path.join(docsDir, 'robots.txt');
const sitemapPath = path.join(docsDir, 'sitemap.xml');
const nojekyllPath = path.join(docsDir, '.nojekyll');
const icon128Path = path.join(docsDir, 'icons', 'icon128.png');
const icon48Path = path.join(docsDir, 'icons', 'icon48.png');
const icon16Path = path.join(docsDir, 'icons', 'icon16.png');
const pagesWorkflowPath = path.join(__dirname, '.github', 'workflows', 'pages.yml');

// 1. Files existence check
assert(fs.existsSync(indexPath), 'docs/index.html must exist');
assert(fs.existsSync(frIndexPath), 'docs/fr/index.html must exist for Google France indexing');
assert(fs.existsSync(robotsPath), 'docs/robots.txt must exist');
assert(fs.existsSync(sitemapPath), 'docs/sitemap.xml must exist');
assert(fs.existsSync(nojekyllPath), 'docs/.nojekyll must exist');
assert(fs.existsSync(icon128Path), 'docs/icons/icon128.png must exist for favicon and OG preview');
assert(fs.existsSync(icon48Path), 'docs/icons/icon48.png must exist');
assert(fs.existsSync(icon16Path), 'docs/icons/icon16.png must exist');
assert(fs.existsSync(pagesWorkflowPath), '.github/workflows/pages.yml must exist');
console.log('  ✅ 1. All core docs/ files, French pages, icons, and GitHub Actions workflow exist');

// 2. robots.txt verification
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(robotsContent.includes('User-agent: *'), 'robots.txt must allow all user-agents');
assert(robotsContent.includes('Allow: /'), 'robots.txt must allow crawling');
assert(robotsContent.includes('sitemap.xml'), 'robots.txt must point to sitemap.xml');
console.log('  ✅ 2. docs/robots.txt properly configured for Googlebot');

// 3. sitemap.xml verification (Must be strict W3C / Google compliant, NO hash fragments)
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
assert(!sitemapContent.includes('#'), 'sitemap.xml must NOT contain URL hash fragments (#) as per Google Search Central specifications');
assert(sitemapContent.includes('<loc>https://leonbathie.github.io/flow-video-merger/</loc>'), 'sitemap must specify canonical EN URL');
assert(sitemapContent.includes('<loc>https://leonbathie.github.io/flow-video-merger/fr/</loc>'), 'sitemap must specify canonical FR URL');
assert(sitemapContent.includes('hreflang="en"'), 'sitemap must specify hreflang="en"');
assert(sitemapContent.includes('hreflang="fr"'), 'sitemap must specify hreflang="fr"');
assert(sitemapContent.includes('hreflang="x-default"'), 'sitemap must specify hreflang="x-default"');

// Verify that all URLs in sitemap.xml map to actual existing files
const urlMatches = [...sitemapContent.matchAll(/<loc>(https:\/\/leonbathie\.github\.io\/flow-video-merger\/([^<]*))<\/loc>/g)];
assert(urlMatches.length >= 2, 'Sitemap must contain at least 2 loc entries (root and fr)');
for (const match of urlMatches) {
  const subPath = match[2];
  const targetFile = subPath === '' ? indexPath : path.join(docsDir, subPath, 'index.html');
  assert(fs.existsSync(targetFile), `Sitemap URL ${match[1]} must map to existing physical file ${targetFile}`);
}
console.log('  ✅ 3. docs/sitemap.xml valid, zero hash fragments, and maps 100% to local files');

// 4. index.html (English) SEO and Metadata verification
const htmlContent = fs.readFileSync(indexPath, 'utf8');

// Exact keyword in Title & H1
assert(/<title>.*flow-video-merger.*<\/title>/i.test(htmlContent), 'Title must contain exact token flow-video-merger');
assert(/<h1>[\s\S]*?flow-video-merger[\s\S]*?<\/h1>/i.test(htmlContent), 'H1 must contain exact token flow-video-merger');
assert(htmlContent.includes('name="description"'), 'Meta description must be present');
assert(htmlContent.includes('name="keywords"'), 'Meta keywords must be present');
assert(htmlContent.includes('flow-video-merger'), 'Keywords must contain flow-video-merger token');
assert(htmlContent.includes('name="viewport"'), 'Mobile viewport tag must be present');
assert(htmlContent.includes('rel="canonical"'), 'Canonical URL tag must be present');
assert(htmlContent.includes('hreflang="fr"'), 'Reciprocal hreflang to FR must be present');
assert(htmlContent.includes('href="fr/"'), 'Navbar must include language switcher to FR');
console.log('  ✅ 4. index.html: exact flow-video-merger keywords in Title & H1, canonical, hreflang, language switcher verified');

// Open Graph & Twitter Cards
assert(htmlContent.includes('property="og:title"'), 'og:title must be present');
assert(htmlContent.includes('property="og:description"'), 'og:description must be present');
assert(htmlContent.includes('property="og:image"'), 'og:image must be present');
assert(htmlContent.includes('name="twitter:card" content="summary_large_image"'), 'twitter:card must be summary_large_image');
console.log('  ✅ 5. index.html: Open Graph and Twitter Card tags present with summary_large_image');

// Schema.org JSON-LD validation for index.html
const jsonLdMatch = htmlContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(jsonLdMatch && jsonLdMatch[1], 'Schema.org JSON-LD script block must exist');

let parsedJsonLd;
try {
  parsedJsonLd = JSON.parse(jsonLdMatch[1]);
} catch (e) {
  assert.fail(`Invalid JSON-LD syntax in index.html: ${e.message}`);
}

assert(parsedJsonLd['@context'] === 'https://schema.org', 'Schema context must be schema.org');
const graph = parsedJsonLd['@graph'];
assert(Array.isArray(graph), '@graph must be an array of schemas');

const softwareApp = graph.find(item => item['@type'] === 'SoftwareApplication');
assert(softwareApp, 'SoftwareApplication schema must be present');
assert(softwareApp.name === 'flow-video-merger', 'SoftwareApplication name must match flow-video-merger');
assert(softwareApp.codeRepository === 'https://github.com/leonbathie/flow-video-merger', 'codeRepository must link to GitHub repo');
assert(softwareApp.aggregateRating && softwareApp.aggregateRating.ratingValue === '5.0', 'aggregateRating must be present for Google rich snippets');

const website = graph.find(item => item['@type'] === 'WebSite');
assert(website, 'WebSite schema must be present');
assert(Array.isArray(website.alternateName) && website.alternateName.length > 0, 'WebSite must specify alternateName for Google Site Name');

const faqPage = graph.find(item => item['@type'] === 'FAQPage');
assert(faqPage, 'FAQPage schema must be present');
assert(Array.isArray(faqPage.mainEntity) && faqPage.mainEntity.length > 0, 'FAQPage must contain questions');
console.log('  ✅ 6. index.html: Schema.org JSON-LD (SoftwareApplication + aggregateRating + WebSite + FAQPage) valid');

// Backlinks to GitHub repo
assert(htmlContent.includes('https://github.com/leonbathie/flow-video-merger'), 'Landing page must link to GitHub repository');
assert(htmlContent.includes('https://github.com/leonbathie/flow-video-merger/archive/refs/heads/main.zip'), 'Landing page must have direct ZIP download');
console.log('  ✅ 7. index.html: Inbound repository links and download CTAs verified');

// 8. docs/fr/index.html (French) SEO and Metadata verification
const frHtmlContent = fs.readFileSync(frIndexPath, 'utf8');
assert(frHtmlContent.includes('<html lang="fr">'), 'French page must have lang="fr"');
assert(/<title>.*flow-video-merger.*<\/title>/i.test(frHtmlContent), 'French Title must contain exact token flow-video-merger');
assert(/<h1>[\s\S]*?flow-video-merger[\s\S]*?<\/h1>/i.test(frHtmlContent), 'French H1 must contain exact token flow-video-merger');
assert(frHtmlContent.includes('https://leonbathie.github.io/flow-video-merger/fr/'), 'French page canonical link must be correct');
assert(frHtmlContent.includes('hreflang="en"'), 'French page must have hreflang to EN');
assert(frHtmlContent.includes('href="../"'), 'French page navbar must include link back to English');

const frJsonLdMatch = frHtmlContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(frJsonLdMatch && frJsonLdMatch[1], 'French Schema.org JSON-LD script block must exist');
let frJsonLd;
try {
  frJsonLd = JSON.parse(frJsonLdMatch[1]);
} catch (e) {
  assert.fail(`Invalid JSON-LD syntax in docs/fr/index.html: ${e.message}`);
}
const frSoftwareApp = frJsonLd['@graph'].find(item => item['@type'] === 'SoftwareApplication');
assert(frSoftwareApp && frSoftwareApp.name === 'flow-video-merger', 'French SoftwareApplication must be valid');
assert(frSoftwareApp.inLanguage === 'fr-FR', 'French SoftwareApplication must declare inLanguage="fr-FR"');
console.log('  ✅ 8. docs/fr/index.html: French SEO, canonical, reciprocal hreflang, and JSON-LD verified');

console.log('🎉 test-seo-and-landing-page.js: ALL TESTS PASSED!\n');
