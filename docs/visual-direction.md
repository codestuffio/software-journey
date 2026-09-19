# Visual direction: Lantern Survey

## Purpose

Software Journey should make an unfamiliar repository feel explorable. The visual language borrows from cave surveying, field notebooks, and careful excavation: a reader is finding their bearings, following evidence, and bringing understanding to light.

This is atmosphere, not a game layer. The interface must remain calm enough for long reading sessions and direct enough for developers to act on what it shows.

## Design principles

1. **Light reveals, it does not decorate.** Warm amber marks the current path, focus, and useful next action. It is never the only way to communicate state.
2. **Evidence is an artifact.** Citations, commits, documentation, and source references should look collected and traceable: labelled cards, field-note metadata, and clear paths back to a revision.
3. **The map earns its detail.** Richer cave, strata, and crystal illustration belongs in orientation and empty states. Dense source reading screens stay quiet.
4. **Fantasy supports plain language.** A visual trail marker may accompany “Continue exploring”; it must not replace it. Product copy stays literal about what was read, inferred, skipped, or unknown.
5. **Local first feels trustworthy.** Materials should feel physical and inspectable—paper, graphite, copper, stone—rather than glossy or opaque.

## Visual vocabulary

| Product meaning | Visual treatment | Accessible label |
| --- | --- | --- |
| Orientation and next step | Lantern or torch, warm glow | Start / continue exploring |
| Architecture and subsystem boundaries | Cave strata, survey contours, map lines | Architecture / area |
| Source-backed insight | Crystal or recovered artifact | Evidence-backed finding |
| Commit and decision history | Trail marker, rope line, pinned note | History / decision |
| Unknown, omitted, or incomplete evidence | Unlit edge, dashed contour, subdued slate | Incomplete / not inspected |

## Palette and type

- **Slate:** near-black graphite for text and cave depth.
- **Parchment:** warm, low-contrast off-white for the reading surface.
- **Moss:** muted green for stable navigation and structure.
- **Copper:** warm orange-brown for borders and hardware details.
- **Lantern:** amber reserved for focus, guidance, and active exploration.
- **Crystal:** a restrained blue-violet accent for discovered insights; do not use it as a second primary action color.

Use a legible sans-serif for reading and a monospace face only for paths, revisions, source labels, and compact field metadata. Decorative type should not appear inside long-form source explanations.

## Asset system

Build a small SVG-first kit before creating larger illustrations:

- Tiny: lantern, crystal, pick, rope knot, map pin, cave entrance, and trail marker.
- Medium: insight card illustrations, empty-state cave entrance, and a repository survey map.
- Large: occasional landing-page or onboarding scenes only.

Assets should work in one color plus a highlight, adapt to dark and light surfaces, and remain understandable without their surrounding decoration. Avoid raster images as core interface dependencies; SVGs are easier to recolor, animate, and keep crisp.

## Motion

Motion should communicate discovery and hierarchy, never demand attention.

- Let a lantern glow gently on the active route and keyboard focus.
- Draw evidence trails when a user moves from overview to source or history.
- Let a new insight settle into view with a short rise and subtle crystal shimmer.
- Keep ordinary transitions between 150 and 300 ms; avoid looping motion near reading content.
- Respect `prefers-reduced-motion` by removing drifting, shimmer, and route-drawing effects while preserving state changes.

## Experience patterns

- **Repository selection:** “Light the lantern” is a welcoming visual moment, paired with the plain action “Choose a local repository.”
- **Survey map:** begin with a concise overview and one recommended trail: architecture, a workflow, history, or a first contribution.
- **Evidence card:** identify the evidence type, revision, path, and certainty before any generated explanation.
- **Agent context:** present the context budget as a field kit: what is packed, what remains unknown, and what source can be requested next.
- **Incomplete analysis:** make omitted or unavailable evidence visible as a boundary on the map, with a direct explanation and recovery action.

## Accessibility and restraint

- Meet normal text contrast requirements without relying on glow, texture, or color alone.
- Keep decorative illustrations `aria-hidden`; all controls and states use plain labels.
- Preserve visible keyboard focus and a readable reduced-motion experience.
- On narrow screens, remove decorative terrain first—never the citation, action, or explanation.
- Prefer one memorable thematic detail per view over many competing ornaments.

## First implementation slice

1. Add palette, texture, type, and motion tokens to the web shell.
2. Theme the landing page around a lantern-lit field survey using CSS-only decorative details.
3. Add an SVG asset kit when the explorer surfaces are specified, so every icon is tied to a real product state.
4. Prototype the survey map and evidence-card treatments before applying the theme to repository exploration flows.
