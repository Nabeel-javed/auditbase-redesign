# Auditbase — site redesign (concept)

Interactive redesign concepts for [auditbase.com](https://auditbase.com). **UI only** — no
backend wiring. All findings/data on the page are a fictional demo specimen ("NovaVault"),
not real customer data.

## Live demo

**→ https://nabeel-javed.github.io/auditbase-redesign/** (the v2 "Reading Machine" build)

Best viewed on desktop in Chrome/Safari/Firefox. Scroll slowly through the hero and the
"Engine" section to see the machine morph. Use the top nav to reach the Console, Sample
report, Detectors, and Pricing pages.

## What's here

- **`v2/`** — the current direction: *"The Reading Machine."* One continuous WebGL organism
  behind the whole site renders everything as ASCII glyphs and morphs
  `specimen → code → state-tree → report` as you scroll. Vite + TypeScript, GSAP
  ScrollTrigger, Lenis smooth scroll, a hand-rolled raw-WebGL2 particle/ASCII engine
  (`v2/src/machine.ts`), Instrument Serif + IBM Plex Mono.
- **root `index.html`** — v1, an earlier static "machine and the document" concept
  (editorial serif + mono, no WebGL). Kept for comparison.

## Run v2 locally

```bash
cd v2
npm install
npm run dev      # http://localhost:5173
npm run build    # static build → v2/dist/
```

## Notes

- Everything is a design prototype — buttons route between pages but don't perform real actions.
- Known rough edge: the scroll-driven graphic can glitch during fast pin/morph transitions
  (hardening in progress).
