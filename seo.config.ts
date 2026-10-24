/** Public search identity. Keep metadata, canonicals, structured data and sitemap aligned. */
export const site = {
  name: "Sequence",
  url: "https://alamkanak.github.io/sequence/",
  repository: "https://github.com/alamkanak/sequence",
  image: "https://alamkanak.github.io/sequence/brand/social-card.png",
  imageAlt:
    "Sequence: free browser video editing, by hand or with your AI agent. No installation, account, watermark, or uploads.",
};

export const searchPages = {
  landing: {
    path: "",
    title: "Free Online Video Editor, No Watermark | Sequence",
    description:
      "Edit videos online for free with no watermark, signup, or uploads. Use the browser timeline by hand or connect Claude Code, Codex, and AI agents through MCP.",
  },
  docs: {
    path: "docs/mcp/",
    title: "MCP Video Editor for Claude Code & Codex | Sequence Docs",
    description:
      "Connect Claude Code, Codex, or Cursor to Sequence's free browser video editor. Set up the local MCP server and explore typed tools, parameters, and examples.",
  },
};

export function searchMetadata(page: keyof typeof searchPages) {
  const definition = searchPages[page];
  const canonical = new URL(definition.path, site.url).href;
  const appId = `${site.url}#application`;
  const website = {
    "@type": "WebSite",
    "@id": `${site.url}#website`,
    name: site.name,
    url: site.url,
  };
  const application = {
    "@type": "WebApplication",
    "@id": appId,
    name: site.name,
    url: site.url,
    description: searchPages.landing.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    browserRequirements:
      "Desktop Chrome or Edge; media codec support varies by browser and device.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image: new URL("brand/app-512.png", site.url).href,
    sameAs: site.repository,
    license: `${site.repository}/blob/main/LICENSE`,
    featureList: [
      "Free online video editing without a watermark or account",
      "Local media preview and export without server uploads",
      "Multitrack video, audio, text, shapes, and transitions",
      "Optional AI agent editing through a local MCP server",
      "MP4 and WebM export where supported by the browser",
    ],
  };
  const webPage = {
    "@type": page === "docs" ? "TechArticle" : "WebPage",
    "@id": `${canonical}#page`,
    url: canonical,
    name: definition.title,
    headline: definition.title,
    description: definition.description,
    inLanguage: "en",
    isPartOf: { "@id": website["@id"] },
    about: { "@id": appId },
  };
  return {
    ...definition,
    canonical,
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [website, application, webPage],
    },
  };
}
