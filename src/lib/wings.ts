/** Known tag-based wings with curated editorial copy. */
export const TAG_WINGS: Record<string, { title: string; curatorial: string; slug: string }> = {
  ai: {
    title: "The AI Wing",
    curatorial:
      "Where artificial intelligence meets competitive ambition. From agentic workflows to foundation models, this wing curates Europe's most consequential AI challenges — arenas where the next generation of intelligent systems is forged.",
    slug: "ai",
  },
  blockchain: {
    title: "The Blockchain Wing",
    curatorial:
      "Decentralised, trustless, sovereign. This wing assembles competitions at the frontier of distributed ledger technology — from zero-knowledge proofs to DeFi protocols reshaping the continent's financial architecture.",
    slug: "blockchain",
  },
  cybersecurity: {
    title: "The Cybersecurity Wing",
    curatorial:
      "The silent guardians of digital infrastructure. These challenges task builders with fortifying Europe's critical systems against an evolving threat landscape — where defence is the highest form of innovation.",
    slug: "cybersecurity",
  },
  sustainability: {
    title: "The Sustainability Wing",
    curatorial:
      "Technology in service of the planet. This wing gathers challenges focused on climate tech, circular economies, and green innovation — the competitions defining Europe's path to a sustainable future.",
    slug: "sustainability",
  },
  healthtech: {
    title: "The HealthTech Wing",
    curatorial:
      "At the intersection of medicine and computation. These challenges seek breakthroughs in digital health, biotech, and clinical AI — where code can heal and data can diagnose.",
    slug: "healthtech",
  },
  space: {
    title: "The Space Wing",
    curatorial:
      "Europe's ambitions reach beyond the atmosphere. This wing features competitions in satellite technology, earth observation, and sovereign aerospace computing — the final frontier of deep tech.",
    slug: "space",
  },
  fintech: {
    title: "The FinTech Wing",
    curatorial:
      "Reimagining the architecture of money. From open banking APIs to regulatory sandboxes, this wing showcases challenges at the cutting edge of European financial innovation.",
    slug: "fintech",
  },
};

/** Derive which tag wings a competition belongs to based on its tags and title. */
export function getCompetitionWings(
  tags: string[] | null,
  title: string
): { label: string; path: string }[] {
  const wings: { label: string; path: string }[] = [];
  const combined = [
    ...(tags || []).map((t) => t.toLowerCase()),
    ...title.toLowerCase().split(/\s+/),
  ];

  for (const [slug, meta] of Object.entries(TAG_WINGS)) {
    if (combined.some((t) => t.includes(slug))) {
      wings.push({ label: meta.title, path: `/topic/${slug}` });
    }
  }
  return wings;
}
