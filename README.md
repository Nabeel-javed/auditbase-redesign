# Auditbase — site redesign (concept)

Interactive redesign concepts for [auditbase.com](https://auditbase.com). **UI only** — no
backend wiring. All findings/data on the page are a fictional demo specimen ("NovaVault"),
not real customer data.

## Live demos — three directions to compare

- **v2 · "The Reading Machine"** (dark, ASCII/WebGL) →
  **https://nabeel-javed.github.io/auditbase-redesign/**
- **v3 · "Clarity / Through Glass"** (light, Three.js glass) →
  **https://nabeel-javed.github.io/auditbase-redesign/v3/**

Best viewed on desktop in Chrome/Safari/Firefox. Scroll slowly through each hero. Use the top
nav to reach the Console, Sample report, Detectors, and Pricing pages.

## What's here

- **`v3/`** — *"Clarity."* A light, premium direction built around a real **Three.js** glass
  crystal (the opaque contract made transparent) with severity-coloured flaws suspended inside
  that light up as you scroll. Vite + TS, Three.js (`MeshPhysicalMaterial` transmission),
  GSAP ScrollTrigger, Lenis. Fonts: Fraunces + Instrument Sans + JetBrains Mono.
- **`v2/`** — *"The Reading Machine."* Dark. One continuous WebGL organism renders everything
  as ASCII glyphs and morphs `specimen → code → state-tree → report` as you scroll. Vite + TS,
  hand-rolled raw-WebGL2 engine (`v2/src/machine.ts`), Instrument Serif + IBM Plex Mono.
- **root `index.html`** — v1, an earlier static "machine and the document" concept
  (editorial serif + mono, no WebGL). Kept for comparison.

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
