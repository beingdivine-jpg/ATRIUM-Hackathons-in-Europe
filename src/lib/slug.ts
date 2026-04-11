/**
 * Generates a URL-friendly slug from a competition title and date.
 * e.g. "Berlin Web3 Buildathon", "2026-06-15" → "berlin-web3-buildathon-2026"
 */
export function generateSlug(title: string, exhibitionDate: string): string {
  const year = exhibitionDate.split("-")[0];
  const base = `${title} ${year}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Avoid double-year if the title already contains the year
  const yearSuffix = `-${year}`;
  if (base.endsWith(`${yearSuffix}${yearSuffix}`)) {
    return base.slice(0, -yearSuffix.length);
  }
  return base;
}
