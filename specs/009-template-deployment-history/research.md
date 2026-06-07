# Research: Template Deployment History View

## Decision: Implementation Strategy
We will implement the Deployment History view as a standalone custom Payload Admin view.

- **Component**: `TemplateHistoryPage.tsx` in `apps/content-management-engine/src/components/views/`.
- **UI Framework**: Re-use Alexandria design system components (`RegistryHeader`, `RegistryTable`, `RegistryPagination`, `FilterChips`, `SearchInput`).
- **Data Source**: Payload REST API `/api/template-deployments`.
- **Path**: `/admin/templates/history`.

## Rationale
- **Consistency**: Using the same components as `ContentItemListPage.tsx` ensures visual and functional parity across the CMS.
- **Tenant Isolation**: Leveraging the existing `template-deployments` collection and Payload's multi-tenant plugin ensures that data isolation is handled at the API layer.
- **Maintainability**: Registering as a custom view allows us to use standard React hooks (`useState`, `useEffect`) and Tailwind CSS for the editorial feel.

## Testing Patterns
- **Unit/Integration (Jest)**: Focus on the `template-deployments` collection logic and tenant access control.
- **E2E (Playwright)**: Focus on UI navigation, search debounce, and filter state transitions. Since the project uses Playwright for UI testing, we will add a new suite `template-history.spec.ts`.

## Alternatives Considered
- **Standard Payload List View**: Rejected because we want the highly customized "Alexandria" editorial layout which requires the `RegistryTable` and custom headers.
- **Custom Endpoint + Custom View**: Unnecessary since the standard REST API with `depth=1` provides all needed data (template title, site name, tenant name).

## Unresolved Items
- None. The strategy aligns with existing project patterns.
