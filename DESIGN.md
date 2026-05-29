# Alexandria — High-End Editorial

## North Star: "The Digital Curator"
A scholarly, premium reading experience. Dense information made effortless through serif authority and generous whitespace.

## Colors
- **Primary (`#094cb2`):** Links, primary actions, focus states only.
- **Surface tiers** create hierarchy—no explicit borders. Use background shifts between `surface-container-lowest` → `surface-dim`.
- **Tertiary (`#6d5e00`):** Archival gold for highlights and badges.
- **No-Line Rule:** Never use 1px borders. Define boundaries through background color shifts.
- Use glassmorphism for floating menus (80% opacity + 20px backdrop-blur). Gradient CTAs from `primary` → `primary_container`.

## Typography
- **Headlines:** Noto Serif — large, authoritative, generous leading.
- **Body:** Inter — modern clarity for dense text.
- **Labels:** Public Sans — archival metadata feel.

## Elevation
- Depth through tonal layering, not shadows. Stack surface tokens for natural elevation.
- Modals: extra-diffused shadows (24-40px blur, 4-6% opacity, tinted `on_surface`).
- If borders needed: "Ghost Border" — `outline_variant` at 15% opacity.

## Components
- **Buttons:** Primary = gradient fill, Secondary = surface-high bg + primary text, Tertiary = text + hover underline.
- **Cards:** No divider lines. Use spacing or alternating surface colors.
- **Inputs:** White bg, ghost border, focus = primary border.
- **Top Navigation (Atomic):** Contextual bars with glassmorphic backgrounds (80% opacity), breadcrumbs for orientation, and contextual action slots. Height: 5rem (h-20).

## Animations & Interactions
- **Reveal:** Staggered entrance with 20px translateY and 0.6s cubic-bezier(0.16, 1, 0.3, 1).
- **Shimmer:** Linear infinite 90deg gradient for primary CTAs to indicate "alive" states.
- **Lift:** -2px translateY + diffused shadow on hover for interactive panels.
- **Spring Toggle:** 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) for boolean switches.
- **Pulse:** Save/Success feedback with scale(1.05) and outward ring glow.

## Rules
- Use whitespace as structure. Serif for narrative text. One primary action per view.
- Never use sharp corners — minimum `sm` roundness.
- Respect `prefers-reduced-motion` by disabling complex transforms and transitions.