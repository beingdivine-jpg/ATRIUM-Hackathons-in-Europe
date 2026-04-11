import { useMemo } from "react";
import type { Competition } from "@/components/CompetitionCard";

interface PatronRibbonProps {
  competitions: Competition[];
}

export const PatronRibbon = ({ competitions }: PatronRibbonProps) => {
  const patrons = useMemo(() => {
    const set = new Set<string>();
    for (const c of competitions) {
      if (c.patron_entities && Array.isArray(c.patron_entities)) {
        for (const p of c.patron_entities as string[]) {
          set.add(p.trim());
        }
      }
      if (c.organizer) set.add(c.organizer.trim());
    }
    return Array.from(set).sort();
  }, [competitions]);

  if (patrons.length === 0) return null;

  // Split into two rows
  const mid = Math.ceil(patrons.length / 2);
  const row1 = patrons.slice(0, mid);
  const row2 = patrons.slice(mid);

  const doubled1 = [...row1, ...row1];
  const doubled2 = [...row2, ...row2];

  const maskStyle = {
    maskImage:
      "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
    WebkitMaskImage:
      "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
  };

  return (
    <section className="pt-0 pb-6" aria-label="Patron organisations">
      <div className="flex flex-col gap-2" style={maskStyle}>
        {/* Row 1 */}
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-ribbon items-center gap-12">
            {doubled1.map((name, i) => (
              <span
                key={`r1-${name}-${i}`}
                className="shrink-0 select-none whitespace-nowrap text-[15px] font-semibold tracking-tight text-[#8E8EA0] h-8 flex items-center"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        {/* Row 2 */}
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-ribbon-reverse items-center gap-12">
            {doubled2.map((name, i) => (
              <span
                key={`r2-${name}-${i}`}
                className="shrink-0 select-none whitespace-nowrap text-[15px] font-semibold tracking-tight text-[#8E8EA0] h-8 flex items-center"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};