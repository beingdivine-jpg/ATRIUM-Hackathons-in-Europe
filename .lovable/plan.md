

# "The Exhibition" — European Hackathon Directory

## Vision
A breathtakingly minimal, gallery-style directory for European hackathons. Dark mode, Apple-level typography, Airbnb-level UX simplicity.

## Design System
- **Background**: `#212121` deep charcoal
- **Surface**: `#2F2F31` for cards/panels
- **Text**: `#ECECEC` headings, `#8E8EA0` body
- **Accent**: `#10A37F` muted neon green, used sparingly
- **Typography**: `font-sans tracking-tight`, massive headings, perfect legibility

## Page Structure

### 1. Hero Section (70vh)
- Centered massive headline: **"Build Europe."**
- Floating pill-shaped search bar with `backdrop-blur-md bg-white/5`, magnifying glass icon, placeholder "Where will you build next?"

### 2. Floating Command Pill (Bottom Nav)
- Fixed `bottom-8`, centered frosted-glass pill
- Toggle filters: Upcoming · In-Person · Remote · Apply
- Replaces traditional navbar

### 3. Event Feed — "The Gallery"
- Single-column, center-aligned (`max-w-4xl`)
- Large showcase cards with:
  - Abstract gradient backgrounds (unique per event)
  - Huge bold event name
  - Minimal info bar: dates, city, prize pool
  - Hover: `scale-[1.02]` + sliding "Apply Now" button

### 4. Mock Data
5 European events with diverse formats, cities, and prize pools:
- AI Hack London
- GreenTech Buildathon Stockholm
- Web3 Innovate Berlin
- ETHParis Summit
- HealthTech Challenge Amsterdam

### 5. Interactions & Polish
- Smooth transitions via Tailwind (`transition-all duration-500 ease-in-out`)
- Fully responsive — large typography and bottom nav adapt to mobile
- Lucide icons with thin strokes throughout

