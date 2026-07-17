# Auditbase Redesign — Direction

**Date:** 2026-07-17 · **Status:** UI-only prototype (no backend wiring)

## Goal
Replace the current "AI-generated SaaS" look (purple-blue gradient, generic cards) with a
distinctive identity that hooks on first paint, communicates *institutional rigor + adversarial
engineering*, and demos the product in the hero instead of describing it.

## Competitive read (2026-07-17)
- Zellic / Cantina / Trail of Bits / OpenZeppelin: all dark bg + geometric sans + abstract
  geometry/gradient blobs. The niche has ONE aesthetic.
- Current auditbase.com: the other cliché (purple-blue gradient SaaS).
- Also avoiding the lazy fix: near-black + lone acid-green "hacker terminal" — reads
  AI-generated in 2026 just as hard as the gradient does.

## Concept — "The machine and the document"
The product's true story: a dark, relentless **machine** (static × symbolic × AI) that emits an
ivory, institutional **document** (the audit report boards/regulators read). The site performs
this duality: graphite engine-world sections alternate with paper report-world sections. The
hero literally runs an audit: a scanner lamp sweeps real Solidity, findings pin on as severity
chips, and the machine prints an ivory report card. Product-as-hero, no abstract blobs.

## Identity system
- **Palette:** warm graphite (#141210/#191613) ↔ warm ivory paper (#F1EBDF); bone ink
  (#EFE7D8) on dark, near-black ink on paper. Chromatic color is *semantic only*: severity
  ramp CRIT #FF5D52 / HIGH #FF9250 / MED #F5C543 / LOW #9FB4CC / INFO #948D7F, pass-green
  #7DC98F for status dots, auditor's red-ink #C7392E on paper. No decorative accent color;
  the primary CTA is solid bone on dark (inverted ink on paper).
- **Type:** editorial serif display (New York / Iowan Old Style / Palatino stack) incl.
  italic emphasis words, paired with system mono (SF Mono / Menlo) for ALL UI, labels, data,
  and body-small. No Inter, no Space Grotesk, no sans anywhere prominent.
- **Signature motifs:** auditor's red-ink annotations (wavy underlines, margin notes,
  [C-01] superscripts) applied to marketing copy; registration/crop marks + mono coordinates
  (schematic vocabulary); hairline rules; sharp corners (radius ≤ 2px); corner-bracket
  targeting frames on instrument panels.
- **Motion:** one orchestrated hero sequence (scan → findings → printed report, ~20s loop),
  scroll-reveals (fast, 300ms, staggered), count-up stats, live monitoring feed, detector-wall
  hover/filter. `prefers-reduced-motion` → static final states.

## Pages (single-file prototype, hash-routed)
- `#/` Landing: hero scan demo · languages marquee · stats band · 3-layer engine ·
  247-detector wall (1 cell = 1 real detector) · workflow · paper "deliverable" section ·
  monitoring feed · pricing (credit tiers) · CTA · footer.
- `#/console` Console concept: dark instrument dashboard (score ring, severity bars, scans
  table, new-scan panel) in the same language — continuity marketing → product.
- `#/report` Sample report: full paper-world institutional document (exec summary, findings
  with annotated code excerpts, MiCA matrix, stamp). Doubles as product proof.
- `#/detectors` Catalog: searchable/filterable detector grid.

## Content rules
Real product facts only (247 detectors, 10/20/180-credit tiers, 100 free credits, SOC 2,
Austin TX, MiCA, $50B+/500+ marketing stats). Demo findings live on a fictional specimen
("NovaVault") — never real customer data, never fabricated client logos.
