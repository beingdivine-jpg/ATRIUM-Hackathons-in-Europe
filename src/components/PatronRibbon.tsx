import { useState } from "react";

const TECH_NAMES = [
  "Anthropic", "OpenAI", "Google", "NVIDIA", "Meta", "Lovable",
  "Microsoft", "AWS", "Apple", "Mistral AI", "Hugging Face",
  "Cohere", "Perplexity", "Tesla", "DeepMind",
];

export const PatronRibbon = () => {
  const [paused, setPaused] = useState(false);
  const doubled = [...TECH_NAMES, ...TECH_NAMES];

  return (
    <section
      className="py-1"
      aria-label="Technology partners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div className={`flex w-max items-center gap-16 animate-ribbon ${paused ? "ribbon-paused" : ""}`}>
          {doubled.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 select-none whitespace-nowrap text-[17px] sm:text-[19px] font-semibold tracking-[-0.02em] text-foreground/20 hover:text-foreground transition-colors duration-300 h-10 flex items-center cursor-default"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
