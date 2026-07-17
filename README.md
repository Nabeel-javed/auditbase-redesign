# Auditbase — site redesign (concept)

Interactive redesign concepts for [auditbase.com](https://auditbase.com). **UI only** — no
backend wiring. All findings/data on the page are a fictional demo specimen ("NovaVault"),
not real customer data.

## Live demos

- **v4 · "The Network"** (dark, AI / neural-network, Three.js) →
  **https://nabeel-javed.github.io/auditbase-redesign/v4/**
- **v2 · "The Reading Machine"** (dark, ASCII/WebGL) →
  **https://nabeel-javed.github.io/auditbase-redesign/**

Best viewed on desktop in Chrome/Safari/Firefox. Scroll slowly through each hero. Use the top
nav to reach the Console, Sample report, Detectors, and Pricing pages.

## What's here

- **`v4/`** — *"The Network."* Dark, AI/tech. The hero is a live **Three.js neural network** —
  glowing neurons in layers, data pulses flowing forward through the edges, and flaw-nodes that
  fire red as the adversarial AI reads the contract. Three.js + UnrealBloom, GSAP ScrollTrigger,
  Lenis. Fonts: Space Grotesk + JetBrains Mono.
- **`v2/`** — *"The Reading Machine."* Dark. One continuous WebGL organism renders everything
  as ASCII glyphs and morphs `specimen → code → state-tree → report` as you scroll. Vite + TS,
  hand-rolled raw-WebGL2 engine (`v2/src/machine.ts`), Instrument Serif + IBM Plex Mono.
- **`v3/`** — *"Clarity."* A light Three.js glass direction (in the repo, not deployed).
- **root `index.html`** — v1, an earlier static "machine and the document" concept.

## Run locally

```bash
cd v3   # or v2
npm install
npm run dev      # dev server
npm run build    # static build → dist/
```

## Notes

- Everything is a design prototype — buttons route between pages but don't perform real actions.
- Known rough edge: the scroll-driven graphic can glitch during fast pin/morph transitions
  (hardening in progress).
