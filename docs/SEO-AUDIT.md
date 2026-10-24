# Deployed-site SEO audit

Targets: https://alamkanak.github.io/sequence/ and
https://alamkanak.github.io/sequence/docs/mcp/.

The live baseline was collected on October 23, 2026, using Google Lighthouse
13.5.0 with Chrome 155, the W3C Nu HTML Checker, Google's Rich Results Test,
and an independent crawl of the public HTML and its internal resources.

## Live Lighthouse results

| Page / emulation | SEO | Accessibility | Best practices | Performance |
| --- | ---: | ---: | ---: | ---: |
| Homepage / mobile | 100 | 100 | 100 | 99 |
| Homepage / desktop | 100 | 100 | 100 | 100 |
| MCP docs / mobile | 100 | 100 | 100 | 99 |

There were no failing scored SEO, accessibility, or best-practices audits.
The mobile runs measured LCP at 1.6 seconds for the homepage and 1.5 seconds
for docs; CLS was zero in all three runs. These are single simulated lab runs,
not Search Console field data or search-ranking measurements.

## Independent checks

- **W3C Nu:** both live pages had zero HTML errors or warnings. The checker
  emitted informational notices about self-closing void elements, which are
  not SEO failures. Both corrected build outputs were also submitted and passed.
- **Google Rich Results, live homepage:** crawled successfully; one valid
  Software App item. The only note was an optional missing `aggregateRating`.
- **Google Rich Results, live docs:** crawled successfully; valid Article and
  Software App items. The Article had optional missing `author` and `image` fields.
- **Manual crawl:** 18 relevant live URLs returned HTTP 200 after redirects.
  The bare `/sequence` URL redirected to `/sequence/`. The root robots.txt
  allowed crawling, no blocking X-Robots-Tag headers were found, and the sitemap
  contained exactly the homepage and MCP docs canonical URLs.

## Issues fixed in this checkout

1. Removed stale Open Graph/Twitter tags from both HTML templates. Five fields
   were duplicated per page: `og:title`, `twitter:title`, `og:image:width`,
   `og:image:alt`, and `twitter:image`. Lighthouse's 100 score did not catch
   these conflicts. Metadata now comes solely from the existing Vite SEO plugin.
2. Added the docs maintainer's name/profile and the existing social-card image
   to the Article's structured data. The maintainer credit is also visible in
   the docs footer. The name is consistent with the repository copyright.
3. Extended the production SEO check to reject duplicate social fields, require
   the expected social tags, and verify Article author/image data and visible
   credit. It runs automatically during `npm run build`.

The corrected JSON-LD, extracted from the generated docs HTML, was submitted
to **Google Rich Results Test's code-input mode**. The Article was valid with
no remaining Article warnings. This verifies the new markup, not a deployment
of the fixes. The Software App still has the optional rating note; no review
score was invented to remove it.

Both corrected pages were retested locally with Lighthouse SEO: **100/100**.
TypeScript/UI checks, the production artifact checks, and five docs/SEO browser
tests passed, including JavaScript-disabled reading and GitHub Pages subpaths.

## Deployment status

The first Lighthouse, Google URL-mode, and crawl checks tested the actual
deployed website. The fixes described above are local changes and need another
deployment. After deployment, rerun the URL-mode tests to confirm that the live
site no longer serves duplicate social tags or the older Article metadata.

The optional Software App review rating can remain absent until there are real,
publicly visible ratings to describe. It is not a crawl or indexing blocker.

## Reports and reproduction

Raw reports are saved locally in the git-ignored directory
`docs/verification/seo-2026-10-23/`:

- `lighthouse-live-home-mobile.report.html` / `.json`
- `lighthouse-live-home-desktop.report.html` / `.json`
- `lighthouse-live-docs-mobile.report.html` / `.json`
- `lighthouse-fixed-home.report.html` / `.json`
- `lighthouse-fixed-docs.report.html` / `.json`
- `w3c-home.json`, `w3c-docs.json`, `w3c-fixed-home.json`, `w3c-fixed-docs.json`
- `live-crawl.json` and the captured live HTML/headers
- `google-rich-results-home.png`, `google-rich-results-docs-before.png`,
  `google-rich-results-fixed-summary.png`, `google-rich-results-fixed-article.png`

Example Lighthouse command (Chrome must be installed):

```sh
npx --yes --package=lighthouse@13.5.0 lighthouse https://alamkanak.github.io/sequence/ \
  --only-categories=seo,performance,accessibility,best-practices \
  --chrome-flags="--headless=new" \
  --output=html --output=json --output-path=./sequence-home-audit
```

Add `--preset=desktop` for the desktop audit. Change the URL to `/docs/mcp/`
for the docs audit. The corrected-build Lighthouse runs used only the SEO
category; they do not claim new performance measurements.

Official tools:
[Lighthouse](https://developer.chrome.com/docs/lighthouse/overview),
[W3C Nu HTML Checker](https://validator.w3.org/nu/),
[Google Rich Results Test](https://search.google.com/test/rich-results).

Captured Google results:
[live homepage](https://search.google.com/test/rich-results/result?id=Sq_aoZMhgsNFRM3CNZe1DA),
[live docs](https://search.google.com/test/rich-results/result?id=WxTctoRBaYjoZrlptIrBtQ),
[corrected code-input test](https://search.google.com/test/rich-results/result?id=f2EwSQytzREDAyzNtrzEtQ).
Google controls the retention of these result links; local screenshots preserve
the observed results.
