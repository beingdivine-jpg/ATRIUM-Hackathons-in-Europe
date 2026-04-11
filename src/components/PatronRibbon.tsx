import googleLogo from "@/assets/patrons/google.png";
import openaiLogo from "@/assets/patrons/openai.png";
import anthropicLogo from "@/assets/patrons/anthropic.png";
import nvidiaLogo from "@/assets/patrons/nvidia.png";
import microsoftLogo from "@/assets/patrons/microsoft.png";
import awsLogo from "@/assets/patrons/aws.png";
import metaLogo from "@/assets/patrons/meta.png";

const PATRONS = [
  { name: "Google", src: googleLogo, alt: "Google — Atrium Patron" },
  { name: "OpenAI", src: openaiLogo, alt: "OpenAI — Atrium Patron" },
  { name: "Anthropic", src: anthropicLogo, alt: "Anthropic — Atrium Patron" },
  { name: "NVIDIA", src: nvidiaLogo, alt: "NVIDIA — Atrium Patron" },
  { name: "Microsoft", src: microsoftLogo, alt: "Microsoft — Atrium Patron" },
  { name: "AWS", src: awsLogo, alt: "AWS — Atrium Patron" },
  { name: "Meta", src: metaLogo, alt: "Meta — Atrium Patron" },
];

export const PatronRibbon = () => {
  const doubled = [...PATRONS, ...PATRONS];

  return (
    <section className="py-12" aria-label="Patron organisations">
      <div
        className="group relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, white 15%, white 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, white 15%, white 85%, transparent)",
        }}
      >
        <div className="flex w-max animate-ribbon group-hover:[animation-play-state:paused] items-center gap-16 sm:gap-20">
          {doubled.map((patron, i) => (
            <img
              key={`${patron.name}-${i}`}
              src={patron.src}
              alt={patron.alt}
              loading="lazy"
              className="h-8 sm:h-10 w-auto shrink-0 select-none object-contain grayscale opacity-50 transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
              draggable={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
