import { useMemo, useState } from "react";
import type { Competition } from "@/components/CompetitionCard";

interface PatronRibbonProps {
  competitions: Competition[];
}

const TECH_GIANTS = [
  "Anthropic", "OpenAI", "Google", "NVIDIA", "Meta", "Lovable",
  "Microsoft", "AWS", "Apple", "Mistral AI", "Hugging Face",
  "Cohere", "Perplexity", "Tesla", "DeepMind",
];

export const PatronRibbon = ({ competitions }: PatronRibbonProps) => {
  const [paused, setPaused] = useState(false);

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

  const row1 = patrons.length > 0 ? [...patrons, ...patrons] : [];
  const row2 = [...TECH_GIANTS, ...TECH_GIANTS];

  const maskStyle = {
    maskImage:
      "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
    WebkitMaskImage:
      "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
  };

  const pauseClass = paused ? "ribbon-paused" : "";

  return (
    <section
      className="pt-0 pb-4"
      aria-label="Patron organisations"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex flex-col gap-2" style={maskStyle}>
        {/* Row 1 — Partners (Left to Right) */}
        {row1.length > 0 && (
          <div className="relative overflow-hidden">
            <div className={`flex w-max animate-ribbon items-center gap-12 ${pauseClass}`}>
              {row1.map((name, i) => (
                <span
                  key={`r1-${name}-${i}`}
                  className="shrink-0 select-none whitespace-nowrap text-[15px] font-semibold tracking-tight text-foreground/30 hover:text-foreground transition-colors duration-300 h-8 flex items-center"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Row 2 — Tech Giants (Right to Left) */}
        <div className="relative overflow-hidden">
          <div className={`flex w-max animate-ribbon-reverse items-center gap-12 ${pauseClass}`}>
            {row2.map((name, i) => (
              <span
                key={`r2-${name}-${i}`}
                className="shrink-0 select-none whitespace-nowrap text-[15px] font-semibold tracking-tight text-foreground/30 hover:text-foreground transition-colors duration-300 h-8 flex items-center"
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
