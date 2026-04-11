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

  // Double the list for seamless loop
  const doubled = [...patrons, ...patrons];

  return (
    <section className="py-12" aria-label="Patron organisations">
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, white 20%, white 80%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, white 20%, white 80%, transparent)",
        }}
      >
        <div className="flex w-max animate-ribbon items-center gap-12">
          {doubled.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 select-none whitespace-nowrap text-[15px] font-semibold tracking-tight text-[#8E8EA0] h-8 flex items-center"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
