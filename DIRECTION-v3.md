# Auditbase v3 — "Clarity / Through Glass"

**Date:** 2026-07-17 · Three.js (user requested) · deploy to gh-pages `/v3/`
v1 (editorial print) + v2 (ASCII machine) both kept for comparison.

## Why a third, and why THIS one
User wants distinct versions to compare. v1 and v2 are both DARK. v3 deliberately goes the
opposite way: a **light, premium, institutional** direction that leans into the *transparency*
angle — Auditbase makes an opaque contract something you can see straight through. Plays to
Three.js's best feature: physically-based **glass/transmission** rendering.

## Concept
The hero is a real refractive 3D object — a faceted **glass monolith/crystal** (the contract).
Auditbase's job made literal: the opaque becomes transparent, and the audit suspends the
**flaws inside the glass** as glowing, severity-coloured inclusions. A slow light/scan sweep
lights them one by one. Editorial, calm, expensive — the "boards, LPs, regulators" audience,
not the terminal-dweller.

## Identity
- **Palette (light):** warm paper white `#F4F1EA` ground · ink `#16130E` · a cooler
  glass-tint neutral `#E7E4DC`. The ONLY saturated colour is the severity ramp, seen as
  glowing inclusions + tiny UI accents: CRIT `#E5484D`, HIGH `#E08A2B`, MED `#D8B41E`,
  LOW `#5B7FB0`, pass `#3E9E6E`. No decorative accent hue; the glass itself carries subtle
  cool refraction colour.
- **Type (all-new vs v1/v2):** display = **Fraunces** (high-contrast optical serif, premium
  editorial) incl. italic; UI/body = **Instrument Sans** (clean grotesque); code/data =
  **JetBrains Mono** 400. No Instrument Serif (v1/v2), no ASCII.
- **Motion:** the object floats + slow-rotates with pointer parallax; scroll rotates it and
  triggers the flaw-reveal scan; soft bloom on inclusions; gentle scroll reveals. Restrained
  and smooth, not busy.

## Three.js scene
- Renderer: WebGLRenderer, ACESFilmic tone map, sRGB, PMREM environment (RoomEnvironment)
  for real reflections/refraction.
- Hero mesh: rounded/faceted form, `MeshPhysicalMaterial` — transmission 1, thickness,
  low roughness, ior ~1.5, subtle iridescence/attenuation for a cool cast.
- Inclusions: ~5 small emissive spheres inside (severity colours) = the findings.
- Post: UnrealBloom (subtle) so inclusions glow through the glass.
- Scroll (GSAP ScrollTrigger + Lenis): rotate object, sweep a scan plane, reveal inclusions,
  ease camera. Reduced-motion + no-WebGL fallbacks.

## Scope
Same content/IA as v2 (247 detectors, 3 tiers, NovaVault demo, MiCA, SOC 2 — reuse `data.ts`)
but a wholly new light skin + glass hero. Full landing + console/report/detectors routes.
Deployed alongside v2 for side-by-side comparison.
