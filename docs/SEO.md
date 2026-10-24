# Sequence search research and implementation

Research date: October 23, 2026. Public site:
https://alamkanak.github.io/sequence/. Repository:
https://github.com/alamkanak/sequence.

For the deployed-site Lighthouse, W3C, and Google Rich Results findings, see
[SEO-AUDIT.md](SEO-AUDIT.md).

## Search targets

These priorities come from product fit and a sample of current search results.
They are not keyword-volume, difficulty, or ranking measurements. No keyword
research account, Google Ads data, or Search Console performance data was used.

| Priority | Keyword / query family | Intent and placement |
| --- | --- | --- |
| Primary | free online video editor no watermark | A ready-to-use editor; homepage title, H1, description, FAQ, and README opening. |
| Primary | video editor without uploading / no upload video editor | Local media processing; homepage privacy section, FAQ, and repository description. |
| Primary | open source browser video editor | A transparent, browser-based project; README, GitHub topics, and visible feature copy. |
| Secondary | free video editor no signup / no download | Immediate access; hero copy, FAQ, and getting-started instructions. |
| Differentiator | MCP video editor / video editing MCP server | Agent integration; docs title, H1, setup guide, and homepage AI section. |
| Differentiator | video editing with Claude Code / Codex video editor | Agent-specific setup; docs description, visible setup copy, and README. |
| Brand | Sequence video editor | Identify the product consistently across the repository, website, metadata, and structured data. |

The broader editor searches are crowded. The agent-specific searches are a more
precise fit for Sequence's shared manual/agent timeline; this is an intent-based
inference, not a claim that they have low competition or high search volume.
Avoid targeting AI video generation, automatic transcription, cloud collaboration,
or unsupported editing features just to attract traffic.

## Research observations

[AnyEdit](https://anyedit.app/video-editor/) prominently describes a free,
open-source browser editor with no signup or uploads. [Framely](https://framely.video/)
combines a browser editor with an agent workflow. [Pireel's MCP page](https://pireel.com/en/mcp-video-editor)
explicitly names Claude Code and Codex and explains the editable timeline.
These pages show the overlap in search intent; copying their wording or claiming
feature parity would not help users. Sequence's copy describes its actual
watermark-free editor, local processing, and optional MCP connection.

The deployed homepage audit found an empty root element before JavaScript, no
canonical link, and no project sitemap. The repository had no topics and its
About description did not mention watermark-free editing or MCP. The existing
domain-root robots.txt returned HTTP 200 with an empty Disallow rule.

## Implemented

- Centralized unique homepage/docs titles, descriptions, canonical URLs, robots
  directives, Open Graph, Twitter metadata, and JSON-LD in `seo.config.ts`.
- Added a clear product H1, specific editing features, agent/MCP terminology,
  and a visible FAQ. Copy distinguishes the free browser editor from any costs
  charged by optional AI clients and describes preview sharing honestly.
- Prerendered the actual React landing and docs components during `npm run build`.
  Everyone receives the same public HTML; this does not use crawler detection,
  hidden keyword text, or a second copy of the marketing content. The existing
  client app mounts afterward for editor interactions and docs navigation.
- Kept the prerender entry separate from browser-only media actions. The sample
  action is supplied by the client app; build rendering never opens user projects.
- Added a sitemap at `https://alamkanak.github.io/sequence/sitemap.xml` containing
  only the two canonical public pages. Workspace and documentation hash routes
  are not listed as separate indexable pages. No invented modification dates.
- Added WebSite, WebApplication, and WebPage/TechArticle structured data. The
  browser editor's offer is zero-priced; no fabricated ratings, reviews, or
  rich-result guarantees are included. FAQ content is useful visible prose,
  without claiming Google's restricted FAQ rich-result treatment.
- Improved the README opening, feature heading, and three-step editing guide,
  while preserving the logo layout, existing setup links, and technical docs.
- Updated the live GitHub About description and canonical homepage, and added
  relevant video-editor, browser-editor, open-source, local-first, MCP, agent,
  Claude Code, Codex, and WebCodecs topics.
- Added a build SEO check and a browser check with JavaScript disabled, so
  metadata regressions or empty prerendered pages fail validation.

`npm run build` now runs TypeScript, Vite, public-page prerendering, sitemap
generation, and MCP packaging. `npm run test:seo` checks the emitted artifacts.
Normal GitHub Pages deployment keeps the `/sequence/` base path. The development
server exposes the same metadata; prerendering is a production build step.

## Publish and measure

1. Deploy the updated checkout through the existing Pages workflow. Until that
   deployment, Google still sees the earlier deployed HTML. GitHub About/topics
   were updated separately and are already live.
2. Verify a **URL-prefix property** for
   `https://alamkanak.github.io/sequence/` in
   [Google Search Console](https://search.google.com/search-console).
   Use its provided HTML verification file in `public/`, or its actual meta tag;
   do not invent a token. A DNS-based domain property is not appropriate without
   control of the `github.io` domain. If the parent property is already verified,
   use that access instead. This task did not have Search Console access.
3. Submit `https://alamkanak.github.io/sequence/sitemap.xml`. Inspect both canonical
   URLs using URL Inspection and request indexing after the new content is live.
4. Monitor queries, impressions, clicks, CTR, and average position separately for
   brand, general editor, no-upload/no-watermark, and MCP/client-specific searches.
   Compare the period after indexing with a real baseline; use Search Console's
   country/device filters instead of treating a single manual search as rank.
5. Check mobile rendering and Core Web Vitals with field data when available.
   Publish useful demonstrations and reproducible agent-editing examples as the
   product develops. Earn relevant links through actual project usefulness.

For repository link sharing, `public/brand/social-card.png` can also be selected
in GitHub's repository Social preview setting. Updating the website's Open Graph
image does not itself upload a GitHub repository social-preview image.

Do not add `/sequence/robots.txt` and assume it controls crawling: Google uses
`https://alamkanak.github.io/robots.txt`. The current root file allows crawling.
If the root policy changes, coordinate with the owner of the root Pages site.
Do not change another repository's crawl policy as part of this project.

## Primary guidance

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): useful, descriptive content and crawlable navigation; meta-keywords are not a ranking mechanism.
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics): readable rendered content, metadata, and limitations of fragment-based navigation.
- [Google title links](https://developers.google.com/search/docs/appearance/title-link): descriptive, page-specific titles consistent with visible content.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): canonical URLs and Search Console submission.
- [Google robots.txt location](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt): crawl rules belong at the host root.
- [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): markup must represent real, visible information.
- [GitHub repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics): classify by actual purpose and technology.
- [Google's ranking-guarantee guidance](https://developers.google.com/search/docs/fundamentals/do-i-need-seo): nobody can guarantee first position.

This work improves relevance, discoverability, and indexability. Ranking first
depends on Google's systems, competing pages, links, user demand, and indexing;
it cannot be guaranteed by an on-page implementation.
