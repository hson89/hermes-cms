# Payload CMS 3.x UI Customization Skill

## Description
This skill provides essential guidelines and verification protocols for modifying the Payload CMS 3.x admin interface (Next.js App Router). It must be used before making any UI/UX changes to prevent layout collapse, configuration type errors, and component duplication.

## Instructions
When instructed to modify or build Payload CMS admin components (Dashboards, Navbars, Custom Views), strictly follow these guidelines:

### 1. Architectural Integrity (App Router)
Payload 3.x leverages the Next.js App Router. All custom views are injected into Payload's internal `RootLayout`.
- **NEVER** place global components (e.g., `<Header>`, `<Nav>`) inside a specific view component (e.g., `<Dashboard>`).
- Doing so will render the global component *inside* the main content area alongside Payload's default global components, causing severe duplication and layout breaks.

### 2. Global Component Overrides (`payload.config.ts`)
To replace Payload's default structural components (Nav, Header), register them in `admin.components`.
- Due to complex typing in Payload 3.x, use array syntax and type assertion if necessary to bypass typescript compiler errors when replacing certain components:
  ```typescript
  // Example in payload.config.ts
  admin: {
    components: {
      Nav: '/src/components/admin/Nav#Nav',
      header: [
        '/src/components/admin/Header#Header',
      ] as any, // Bypass for strict Payload configuration types
    }
  }
  ```

### 3. CSS Safety and Layout Isolation
Aggressively hiding Payload's default layout classes (like `.nav` or `.app-header`) using global CSS `display: none !important` can severely disrupt the flex/grid layout of the App Router template.
- **Rule of Thumb:** Payload expects the sidebar to consume `18rem` of width.
- If you build a custom fixed sidebar, you **must** offset the main content wrapper manually in your `globals.css`:
  ```css
  /* Ensure custom nav is visible and sized correctly */
  .custom-nav { display: flex !important; width: 18rem !important; }

  /* Hide Payload's built-in sidebar */
  .nav, aside.nav, [class*="nav"], .sidebar { display: none !important; }

  /* Enforce offset on the main content wrap */
  .template-default__wrap {
    margin-left: 18rem !important;
    width: calc(100% - 18rem) !important;
  }
  ```
- **Targeted Hiding:** When hiding default Payload elements, be specific (e.g., `.app-header__logo`, `.app-header__account`) rather than hiding entire structural containers.

### 4. Verification Protocol
Before confirming a task is complete:
1. **Check Import Map:** Always inspect `apps/cms/src/app/(payload)/admin/importMap.js`. Ensure your newly added custom components appear in the map with correctly resolved paths.
2. **Type Check:** Run `pnpm tsc --noEmit` in `apps/cms` to ensure `payload.config.ts` changes do not break the build.
3. **Verify DOM Structure:** Understand that any custom view is rendered inside `<main className="template-default__wrap">`. Adjust margins and padding accordingly.