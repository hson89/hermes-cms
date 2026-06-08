# Next.js Blog Starter

This is a pre-configured Next.js template designed to connect seamlessly with the Hermes CMS.

## Environment Variables

When deployed via the Hermes AI Deployment Service, the following environment variables will be injected automatically:

- `PAYLOAD_URL`: The URL of the Hermes AI instance.
- `PAYLOAD_API_KEY`: The API Key generated for the specific tenant.

## Fetching Content

```typescript
// Example data fetching
const res = await fetch(`${process.env.PAYLOAD_URL}/api/content-items`, {
  headers: {
    'Authorization': `api-keys API-Key ${process.env.PAYLOAD_API_KEY}`
  }
})
const data = await res.json()
```

## Icon System (Material Symbols)

This template uses **Material Symbols Outlined** icons from Google's Material Design library, self-hosted via the `@fontsource/material-symbols-outlined` npm package.

### Basic Usage

```jsx
{/* Simple icon */}
<span className="material-symbols-outlined">arrow_back</span>

{/* Icon with size variant */}
<span className="material-symbols-outlined size-32">favorite</span>
```

### Available Size Classes

- `.size-18` — 18px icons
- `.size-20` — 20px icons (small)
- `.size-24` — 24px icons (default)
- `.size-32` — 32px icons (large)
- `.size-48` — 48px icons (extra large)

### Common Icons

**Navigation:**
- `arrow_back` — Back arrow
- `arrow_forward` — Forward arrow
- `home` — Home
- `menu` — Menu
- `close` — Close/dismiss

**Status & Feedback:**
- `check_circle` — Success
- `error_circle` — Error
- `info_circle` — Information
- `warning_circle` — Warning

**Content:**
- `article` — Article/blog post
- `image` — Image
- `video` — Video
- `bookmark` — Save/bookmark
- `share` — Share

**AI/Automation:**
- `auto_awesome` — Sparkle/AI magic
- `psychology` — AI brain
- `smart_toy` — Smart/AI
- `data_saver_on` — Data processing

### Complete Icon Library

For a complete reference of 2,500+ available Material Symbols icons, visit:
[https://fonts.google.com/metadata/icons](https://fonts.google.com/metadata/icons)

### Font Features

- **Format:** Variable font (supports multiple weights, sizes, fills)
- **License:** Apache 2.0 (open source)
- **Variants:** Outlined (default), Filled, Rounded, Sharp
- **Performance:** Self-hosted, no external CDN calls

### Adding New Icons

To add a new icon to your template:

```jsx
<span className="material-symbols-outlined">icon_name_here</span>
```

Simply replace `icon_name_here` with any icon from the Material Symbols library. The font is already included in your project dependencies.

### Styling Icons

Icons inherit color from their parent element and can be styled with CSS:

```css
.my-icon {
  color: var(--color-primary);
  font-size: 24px;
}
```

Icons can also be colored via Tailwind classes or inline styles:

```jsx
{/* Using inline styles */}
<span className="material-symbols-outlined" style={{ color: '#094cb2' }}>favorite</span>

{/* Using CSS variables */}
<span className="material-symbols-outlined" style={{ color: 'var(--color-tertiary)' }}>star</span>
```
