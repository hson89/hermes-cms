# Payload CMS 3.x UI Customization Skill

## Description
This skill provides essential guidelines and verification protocols for modifying the Payload CMS 3.x admin interface (Next.js App Router). It must be used before making any UI/UX changes to prevent layout collapse, configuration type errors, and component duplication.

## Instructions
When instructed to modify or build Payload CMS admin components (Dashboards, Navbars, Custom Views), strictly follow these guidelines:

### 1. Architectural Integrity (App Router)
Payload 3.x leverages the Next.js App Router.
- **Custom Views:** All custom views MUST be wrapped in `@payloadcms/next/templates#DefaultTemplate` to correctly inherit the Alexandria Sidebar and Header.
- **Hierarchy:** Never place global components (e.g., `<Header>`, `<Nav>`) inside a specific view component.

### 2. Alexandria Layout Tokens (NON-NEGOTIABLE)
- **Sidebar Width:** Strictly `18rem`.
- **Header Height:** Strictly `5rem` (h-20).
- **Design System:** Use `bg-background` for view containers.
- **Content Offset:** All custom views must ensure they do not overlap the fixed sidebar. Use `lg:ml-[18rem]` if the `DefaultTemplate` wrap does not provide it.

### 3. CSS Safety and Layout Isolation
Use "Cleanup Hooks" to hide standard Payload elements without breaking the grid.
- **Mandatory Class:** Wrap your view content in a `div` with a cleanup class (e.g., `custom-editor-view`, `custom-tenant-view`, `custom-content-type-view`).
- **Cleanup CSS:** These classes are mapped in `globals.css` to hide `.gutter`, `.doc-header`, etc.
- **Targeted Hiding:** Never use `display: none !important` globally on structural containers.

### 4. Global Component Overrides (`payload.config.ts`)
Register structural components using array syntax to bypass strict typing issues:
```typescript
admin: {
  components: {
    Nav: ['/src/components/ui/organisms/Nav#Nav'] as any,
    header: ['/src/components/ui/organisms/Header#Header'] as any,
  }
}
```

### 5. Verification Protocol
1. **Check Import Map:** Inspect `apps/content-management-engine/src/app/(payload)/admin/importMap.js`. Ensure your components are mapped correctly.
2. **Standard Sizing:** Inspect the DOM to verify the view sits exactly `5rem` from the top and `18rem` from the left on desktop.