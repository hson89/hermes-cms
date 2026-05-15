# speckit-payload-ui

A specialized skill for extending and customizing the Payload CMS 3.x Admin UI while ensuring `importMap.js` integrity and architectural alignment.

## Instructions

### 1. Component Implementation
- **Strict Named Exports:** Every admin component MUST use a named export.
  - Good: `export const Dashboard: React.FC = () => { ... }`
  - Bad: `export default Dashboard`
- **Alexandria Design Tokens:** Always use the design tokens defined in `DESIGN.md` (e.g., `text-primary`, `bg-surface-container-lowest`, `ring-outline-variant/15`).

### 2. Configuration Registration
- **Explicit Pathing:** When registering components in `payload.config.ts`, use paths that start with `/src/` and include the named export fragment.
  - Example: `'/src/components/views/Dashboard#Dashboard'`
- **Slot Mapping:**
  - `admin.components.graphics.Logo` / `Icon`
  - `admin.components.beforeDashboard` (for welcome screens)
  - `admin.components.views.Dashboard` (to replace the entire dashboard)

### 3. Verification & importMap Correction
- **Build Guard:** After modifying `payload.config.ts`, do NOT start the dev server until you verify `apps/cms/src/app/(payload)/admin/importMap.js`.
- **RelPath Audit:** Ensure imports in `importMap.js` include the `src/` directory in their relative resolution (e.g., `../../../../src/components/...`).
- **Manual Override:** If the automatic generator miscalculates paths:
  1. Manually edit `importMap.js`.
  2. Add the correct `import { Name as Alias } from '...'` statement.
  3. Add the mapping to the `importMap` object.

## Available Commands

### `speckit.payload.validate`
Validate that all custom components referenced in `payload.config.ts` exist and use named exports.

### `speckit.payload.fix-importmap`
Automatically scan `importMap.js` and fix common relative path resolution errors (e.g., inserting missing `src/` segments).
