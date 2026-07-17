# Auditbase v2 — "The Reading Machine"

**Date:** 2026-07-17 · v1 kept intact at repo root for revert (commit f7cc1d9)

## Why v2
User verdict on v1: tasteful but flat — "looks copied", needs interactive graphics,
innovation, animation. v1 was print-design-on-web; v2 makes the machine *real*.

## Research findings (2026-07-17)
- Awwwards-tier sites = Three.js/WebGL + GSAP scroll-scrub + ONE singular art direction,
  meaningful motion, 60fps, custom dev — not decorated templates.
- **ASCII / ordered-dither shaders are the current visual wave** (Codrops "Efecto" Jan-2026,
  Maxime Heckel's dithering series). GPU recipe: render scene → RT; per-cell luminance
  (0.299/0.587/0.114) → glyph from density-ordered atlas; 4×4 Bayer threshold for dither;
  bloom/scanline/vignette/grain in the same pass.
- Dev-tool credibility (Linear/Vercel/Raycast): specificity IS the design; show the real
  product; dark = audience signal, not styling.

## Concept
One continuous WebGL organism — **the machine** — lives behind the entire site and renders
everything it shows AS CHARACTERS (ASCII post-process): the brand literalized — a machine
that reads code. It morphs through the product story as you scroll. The ivory **document**
world remains its output (kept from v1 — the strongest section). Foreground = cinematic
serif type with decrypt-scramble; a reticle cursor makes the visitor the auditor.

## Set pieces
1. **Hero "SPECIMEN-01"** — ASCII-rendered particle torus-knot rotating in void; amber scan
   plane sweeps it; red finding-flares burst; mouse parallax; headline scrambles in.
2. **Pinned ENGINE chapter (400vh scrub)** — the same particles MORPH: specimen → code-grid
   (static sweep) → branching paths (symbolic exec) → document lattice (report). Copy
   for layers 01/02/03 crossfades at thirds. One organism, whole story.
3. **Scan demo** — v1's beloved code-panel rebuilt as scroll-scrubbed: lamp = scroll,
   findings pop at thresholds, report card prints at end.
4. **Detector wall** — cursor-proximity glow; reticle cursor shows detector names.
5. **Paper deliverable + report route** — kept from v1, upgraded entrances.
6. Monitoring feed, pricing, console & detectors routes — ported.

## Identity v2
- Fonts (bundled, not system): **Instrument Serif** (display, italic accents) +
  **IBM Plex Mono** (everything machine). New voice vs v1's system stack.
- Palette: near-black warm #0B0A08 · bone #ECE5D8 · **machine amber #FFB224** (scan energy,
  instrument heritage) · severity ramp unchanged (CRIT #FF4B3E …) · paper #F2ECDF.
- Cursor: crosshair reticle + live coords; expands with context labels over targets.

## Stack
Vite + TypeScript in `v2/` — three (particles, hand-rolled ASCII post pass), gsap
ScrollTrigger (pin/scrub), lenis (smooth scroll), @fontsource fonts, vite-plugin-singlefile
for the artifact build. Reduced-motion + no-WebGL fallbacks. Target 60fps.
