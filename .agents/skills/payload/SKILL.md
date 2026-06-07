---
name: payload
description: Use when working with Payload projects (payload.config.ts, collections, fields, hooks, access control, Payload API). Use when debugging validation errors, security issues, relationship queries, transactions, or hook behavior.
---

# Payload Application Development

Payload is a Next.js native CMS with TypeScript-first architecture, providing admin panel, database management, REST/GraphQL APIs, authentication, and file storage.

## Quick Reference

| Task                     | Solution                                  | Details                                                                                                                          |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Auto-generate slugs      | `slugField()`                             | [FIELDS.md#slug-field-helper](reference/FIELDS.md#slug-field-helper)                                                             |
| Restrict content by user | Access control with query                 | [ACCESS-CONTROL.md#row-level-security-with-complex-queries](reference/ACCESS-CONTROL.md#row-level-security-with-complex-queries) |
| Local API user ops       | `user` + `overrideAccess: false`          | [QUERIES.md#access-control-in-local-api](reference/QUERIES.md#access-control-in-local-api)                                       |
| Draft/publish workflow   | `versions: { drafts: true }`              | [COLLECTIONS.md#versioning--drafts](reference/COLLECTIONS.md#versioning--drafts)                                                 |
| Computed fields          | `virtual: true` with afterRead            | [FIELDS.md#virtual-fields](reference/FIELDS.md#virtual-fields)                                                                   |
| Conditional fields       | `admin.condition`                         | [FIELDS.md#conditional-fields](reference/FIELDS.md#conditional-fields)                                                           |
| Custom field validation  | `validate` function                       | [FIELDS.md#text-field](reference/FIELDS.md#text-field)                                                                           |
| Filter relationship list | `filterOptions` on field                  | [FIELDS.md#relationship](reference/FIELDS.md#relationship)                                                                       |
| Select specific fields   | `select` parameter                        | [QUERIES.md#local-api](reference/QUERIES.md#local-api)                                                                           |
| Auto-set author/dates    | beforeChange hook                         | [HOOKS.md#collection-hooks](reference/HOOKS.md#collection-hooks)                                                                 |
| Prevent hook loops       | `req.context` check                       | [HOOKS.md#hook-context](reference/HOOKS.md#hook-context)                                                                         |
| Cascading deletes        | beforeDelete hook                         | [HOOKS.md#collection-hooks](reference/HOOKS.md#collection-hooks)                                                                 |
| Geospatial queries       | `point` field with `near`/`within`        | [FIELDS.md#point-geolocation](reference/FIELDS.md#point-geolocation)                                                             |
| Reverse relationships    | `join` field type                         | [FIELDS.md#join-fields](reference/FIELDS.md#join-fields)                                                                         |
| Next.js revalidation     | Context control in afterChange            | [HOOKS.md#nextjs-revalidation-with-context-control](reference/HOOKS.md#nextjs-revalidation-with-context-control)                 |
| Query by relationship    | Nested property syntax                    | [QUERIES.md#nested-properties](reference/QUERIES.md#nested-properties)                                                           |
| Complex queries          | AND/OR logic                              | [QUERIES.md#andor-logic](reference/QUERIES.md#andor-logic)                                                                       |
| Transactions             | Pass `req` to operations                  | [ADAPTERS.md#threading-req-through-operations](reference/ADAPTERS.md#threading-req-through-operations)                           |
| Background jobs          | Jobs queue with tasks                     | [ADVANCED.md#jobs-queue](reference/ADVANCED.md#jobs-queue)                                                                       |
| Custom API routes        | Collection custom endpoints               | [ADVANCED.md#custom-endpoints](reference/ADVANCED.md#custom-endpoints)                                                           |
| Cloud storage            | Storage adapter plugins                   | [ADAPTERS.md#storage-adapters](reference/ADAPTERS.md#storage-adapters)                                                           |
| Multi-language           | `localization` config + `localized: true` | [ADVANCED.md#localization](reference/ADVANCED.md#localization)                                                                   |
| Create plugin            | `(options) => (config) => Config`         | [PLUGIN-DEVELOPMENT.md#plugin-architecture](reference/PLUGIN-DEVELOPMENT.md#plugin-architecture)                                 |
| Plugin package setup     | Package structure with SWC                | [PLUGIN-DEVELOPMENT.md#plugin-package-structure](reference/PLUGIN-DEVELOPMENT.md#plugin-package-structure)                       |
| Add fields to collection | Map collections, spread fields            | [PLUGIN-DEVELOPMENT.md#adding-fields-to-collections](reference/PLUGIN-DEVELOPMENT.md#adding-fields-to-collections)               |
| Plugin hooks             | Preserve existing hooks in array          | [PLUGIN-DEVELOPMENT.md#adding-hooks](reference/PLUGIN-DEVELOPMENT.md#adding-hooks)                                               |
| Check field type         | Type guard functions                      | [FIELD-TYPE-GUARDS.md](reference/FIELD-TYPE-GUARDS.md)                                                                           |

## Quick Start

```bash
npx create-payload-app@latest my-app
cd my-app
pnpm dev
```

### Minimal Config

```ts
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL,
  }),
})
```

## Essential Patterns

### Basic Collection

```ts
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'createdAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'content', type: 'richText' },
    { name: 'author', type: 'relationship', relationTo: 'users' },
  ],
  timestamps: true,
}
```

For more collection patterns (auth, upload, drafts, live preview), see [COLLECTIONS.md](reference/COLLECTIONS.md).

### Common Fields

```ts
// Text field
{ name: 'title', type: 'text', required: true }

// Relationship
{ name: 'author', type: 'relationship', relationTo: 'users', required: true }

// Rich text
{ name: 'content', type: 'richText', required: true }

// Select
{ name: 'status', type: 'select', options: ['draft', 'published'], defaultValue: 'draft' }

// Upload
{ name: 'image', type: 'upload', relationTo: 'media' }
```

For all field types (array, blocks, point, join, virtual, conditional, etc.), see [FIELDS.md](reference/FIELDS.md).

### Hook Example

```ts
export const Posts: CollectionConfig = {
  slug: 'posts',
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          data.slug = slugify(data.title)
        }
        return data
      },
    ],
  },
  fields: [{ name: 'title', type: 'text' }],
}
```

For all hook patterns, see [HOOKS.md](reference/HOOKS.md). For access control, see [ACCESS-CONTROL.md](reference/ACCESS-CONTROL.md).

### Access Control with Type Safety

```ts
import type { Access } from 'payload'
import type { User } from '@/payload-types'

// Type-safe access control
export const adminOnly: Access = ({ req }) => {
  const user = req.user as User
  return user?.roles?.includes('admin') || false
}

// Row-level access control
export const ownPostsOnly: Access = ({ req }) => {
  const user = req.user as User
  if (!user) return false
  if (user.roles?.includes('admin')) return true

  return {
    author: { equals: user.id },
  }
}
```

### Query Example

```ts
// Local API
const posts = await payload.find({
  collection: 'posts',
  where: {
    status: { equals: 'published' },
    'author.name': { contains: 'john' },
  },
  depth: 2,
  limit: 10,
  sort: '-createdAt',
})

// Query with populated relationships
const post = await payload.findByID({
  collection: 'posts',
  id: '123',
  depth: 2, // Populates relationships (default is 2)
})
// Returns: { author: { id: "user123", name: "John" } }

// Without depth, relationships return IDs only
const post = await payload.findByID({
  collection: 'posts',
  id: '123',
  depth: 0,
})
// Returns: { author: "user123" }
```

For all query operators and REST/GraphQL examples, see [QUERIES.md](reference/QUERIES.md).

### Getting Payload Instance

```ts
// In API routes (Next.js)
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  const payload = await getPayload({ config })

  const posts = await payload.find({
    collection: 'posts',
  })

  return Response.json(posts)
}

// In Server Components
import { getPayload } from 'payload'
import config from '@payload-config'

export default async function Page() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'posts' })

  return <div>{docs.map(post => <h1 key={post.id}>{post.title}</h1>)}</div>
}
```

### Logger Usage

```ts
// ✅ Valid: single string
payload.logger.error('Something went wrong')

// ✅ Valid: object with msg and err
payload.logger.error({ msg: 'Failed to process', err: error })

// ❌ Invalid: don't pass error as second argument
payload.logger.error('Failed to process', error)

// ❌ Invalid: use `err` not `error`, use `msg` not `message`
payload.logger.error({ message: 'Failed', error: error })
```

## Security Pitfalls

### 1. Local API Access Control (CRITICAL)

**By default, Local API operations bypass ALL access control**, even when passing a user.

```ts
// ❌ SECURITY BUG: Passes user but ignores their permissions
await payload.find({
  collection: 'posts',
  user: someUser, // Access control is BYPASSED!
})

// ✅ SECURE: Actually enforces the user's permissions
await payload.find({
  collection: 'posts',
  user: someUser,
  overrideAccess: false, // REQUIRED for access control
})
```

**When to use each:**

- `overrideAccess: true` (default) - Server-side operations you trust (cron jobs, system tasks)
- `overrideAccess: false` - When operating on behalf of a user (API routes, webhooks)

See [QUERIES.md#access-control-in-local-api](reference/QUERIES.md#access-control-in-local-api).

### 2. Transaction Failures in Hooks

**Nested operations in hooks without `req` break transaction atomicity.**

```ts
// ❌ DATA CORRUPTION RISK: Separate transaction
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      await req.payload.create({
        collection: 'audit-log',
        data: { docId: doc.id },
        // Missing req - runs in separate transaction!
      })
    },
  ]
}

// ✅ ATOMIC: Same transaction
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      await req.payload.create({
        collection: 'audit-log',
        data: { docId: doc.id },
        req, // Maintains atomicity
      })
    },
  ]
}
```

See [ADAPTERS.md#threading-req-through-operations](reference/ADAPTERS.md#threading-req-through-operations).

### 3. Infinite Hook Loops

**Hooks triggering operations that trigger the same hooks create infinite loops.**

```ts
// ❌ INFINITE LOOP
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      await req.payload.update({
        collection: 'posts',
        id: doc.id,
        data: { views: doc.views + 1 },
        req,
      }) // Triggers afterChange again!
    },
  ]
}

// ✅ SAFE: Use context flag
hooks: {
  afterChange: [
    async ({ doc, req, context }) => {
      if (context.skipHooks) return

      await req.payload.update({
        collection: 'posts',
        id: doc.id,
        data: { views: doc.views + 1 },
        context: { skipHooks: true },
        req,
      })
    },
  ]
}
```

See [HOOKS.md#context](reference/HOOKS.md#context).

### 4. Bypassing Type Safety with "as any" (Out-of-Sync Union Slugs)

**Avoid using `as any` when querying new or out-of-sync collections.**

Because `typescript.autoGenerate` is often disabled to prevent git churn, auto-generated type unions in `payload-types.ts` can be out-of-sync during active feature development. 

Using `as any` disables compile-time type validation for all adjacent parameters (such as `data` or `where` options).

```ts
// ❌ BAD: Disables type-checking on the entire options object
await payload.create({
  collection: 'new-collection' as any,
  data: {
    title: 'Testing', // No type-checking at all!
  } as any,
})

// ✅ GOOD: Enforces type safety while satisfying out-of-sync compiler unions
await payload.create({
  collection: 'new-collection' as never,
  data: {
    title: 'Testing',
  } as never,
})
```

**TypeScript Escape Hatch Philosophy & Guidelines:**

While type-system purity is the ideal, complex headless CMS architectures (like Payload) often have dynamic type compilation cycles (e.g., auto-generated schemas in `payload-types.ts` that can be out-of-sync during active feature development).

When faced with compiler type conflicts, **avoid `as any` at all costs.** It disables all adjacent type validation (like adjacent `data` or `where` properties) and propagates "type-checking silence" downstream. Instead, leverage a **spectrum of safer escape hatches** based on the use case:

| Escape Hatch Pattern | Primary Use Case | Example | Engineering Benefit |
| :--- | :--- | :--- | :--- |
| **`unknown`** | For values whose exact type is truly not known at compile time. | `val as unknown` | Enforces writing runtime type guards (like `typeof` checks) before using the value, preserving safety. |
| **`Record<string, unknown>`** | For generic key-value objects being queried dynamically. | `Record<string, unknown>` | Validates that the variable is an object while preventing arbitrary nested unchecked method calls. |
| **Double Casting (`as unknown as T`)** | When we know the runtime shape is compatible, but TypeScript cannot unify them structurally. | `req as unknown as PayloadRequest` | Satisfies the compiler while strictly type-checking the variable in all downstream operations (no contagion). |
| **`as never` (Bottom-Type)** | Locally matching complex string constants to dynamic library type unions. | `collection: 'slug' as never` | Localizes the escape hatch solely to the collection slug string, preserving type validation on adjacent parameters (like `data` or `where` options). |

**Guidelines for local database operations:**
1. **Use `as never` for out-of-sync collection strings and their parameters** to satisfy strict payload unions during active schema development without disabling neighboring parameter validation.
2. **Prevent `never` propagation:** Always cast returned promises cleanly to generic scopes (e.g., `as unknown as Record<string, any>`) so that returned properties are resolved and standard IDE autocomplete works.
3. **Preserve Scoping & Tenant Isolation:** In Next.js route handlers, always cast standard requests strictly using `req as unknown as PayloadRequest` (imported from `payload`) to preserve Local API user contexts and tenant scoping. Avoid generic `as any` request casts.

## Project Structure

```txt
src/
├── app/
│   ├── (frontend)/
│   │   └── page.tsx
│   └── (payload)/
│       └── admin/[[...segments]]/page.tsx
├── collections/
│   ├── Posts.ts
│   ├── Media.ts
│   └── Users.ts
├── globals/
│   └── Header.ts
├── components/
│   └── CustomField.tsx
├── hooks/
│   └── slugify.ts
└── payload.config.ts
```

## Type Generation

```ts
// payload.config.ts
export default buildConfig({
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // ...
})

// Usage
import type { Post, User } from '@/payload-types'
```


## Alexandria Layout & Admin UI Guardrails (CRITICAL)

When modifying or customizing the Payload CMS 3.x Admin UI under the **"Alexandria — High-End Editorial"** visual design system:

### 1. Alexandria Layout Offsets
- **Left Navigation Sidebar**: `18rem` wide (fixed, z-index: 1000).
- **Top App Header**: `5rem` high (`h-20`).

### 2. Preventing Double-Nesting Layout Shifts (18rem Sidebar Offset Bug)
Payload 3.x renders different layouts automatically depending on the integration point:
- **Standalone Custom Admin View** (registered under `admin.components.views` in `payload.config.ts`):
  - ❌ **No auto-wrapping** by default.
  - **Action**: Wrap the child components manually inside the custom `AdminView` component (`src/components/admin/AdminView.tsx`), which renders the template shell.
- **Collection-level custom views** (registered under `collections[X].admin.components.views` such as `list` or `edit.default`):
  - **Yes, auto-wrapped** by Payload.
  - **Action**: Do **not** use the `AdminView` or `DefaultTemplate` wrapper inside the custom component itself. Rendering it inside causes a duplicate template wrap and a secondary 18rem horizontal margin shift bug.

### 3. The "Deep-Ancestor" Layout Reset Pattern
To render full-screen or splitscreen co-creation workspaces flush against the sidebar, standard default margins and gutters on Payload's parent wrapping containers must be completely zeroed out:
1. Wrap your custom workspace client component in a container with a designated viewport-isolation class (e.g. `className="custom-editor-view"`).
2. Write a generic, scalable deep-ancestor override in `globals.css` using wildcard attribute matchers instead of duplicating declarations for each individual view:
   ```css
   .template-default__wrap:has([class*="custom-"][class*="-view"]) .doc-header,
   .template-default__wrap:has([class*="custom-"][class*="-view"]) .collection-edit__header,
   .template-default__wrap:has([class*="custom-"][class*="-view"]) .collection-list__header,
   .template-default__wrap:has([class*="custom-"][class*="-view"]) .gutter,
   .template-default__wrap:has([class*="custom-"][class*="-view"]) [class*="doc-header"],
   .template-default__wrap:has([class*="custom-"][class*="-view"]) [class*="collection-edit"],
   .template-default__wrap:has([class*="custom-"][class*="-view"]) [class*="collection-list"],
   div:has(> [class*="custom-"][class*="-view"]) > .doc-header,
   div:has(> [class*="custom-"][class*="-view"]) > .gutter {
     display: none !important;
     visibility: hidden !important;
     height: 0 !important;
     padding: 0 !important;
     margin: 0 !important;
   }
   ```

### 4. Interactive UX & Accessibility Guidelines
When building custom components for custom views or editor interfaces:
- **Click-Outside:** Attach the `useClickOutside` hook to the wrapper reference of dropdowns/menus to auto-close them.
- **Escape Listener:** Handle `onKeyDown` with keyboard listeners for the `'Escape'` key to instantly collapse open overlays.
- **Interactive Focus States:** Ensure buttons and interactive triggers implement noticeable focus styles (`focus-visible:ring-2 focus-visible:ring-primary`).
- **Semantic Mappings:** Map static colors dynamically to theme colors (primary, success, danger, neutral, gold) instead of hardcoding Tailwind color classes like `text-green-600` or `bg-blue-500`.

### 5. Custom View Verification Checklist
Before completing any Payload UI modification task:
- [ ] Verify that no duplicate `DefaultTemplate` is rendered in the component tree.
- [ ] Verify that parent wrapper overrides exist in `globals.css` matching your isolation class.
- [ ] Standard headers or gutters from standard views have `display: none !important;` to prevent stacking when the custom view renders its own panels.
- [ ] Absolutely no technical commentary, walkthrough notes, or markdown descriptions are left appended inside the `.ts` / `.tsx` source files.
- [ ] Verify that standalone custom views registered under `admin.components.views` do not import layout templates (such as `DefaultTemplate` or from `@payloadcms/next/...`) to prevent circular compiler dependencies.
- [ ] Under WSL 2 environments, verify that Next.js dev execution is configured with the `--webpack` compiler flag to bypass Turbopack dynamic watcher deadlocks.

### 6. Compiler Stability & Acyclic Build Prevention (CRITICAL WSL 2)
- **WSL 2 Webpack Opt-in**: The Next.js dev server defaults to Turbopack in v16, which exhibits compilation deadlocks when compiling catch-all views on WSL 2. Ensure `package.json` dev execution includes the `--webpack` flag in WSL contexts.
### 7. Seeding & Caching Stability Guardrails
- **Cache-Busting Assets**: Always assign fresh cache-busting filenames (e.g. content hashes or versioning like `aurelian_discovery_v2_thumbnail.png`) when seeding or updating static templates assets (thumbnails, logos, backgrounds) to bypass Next.js and browser caches instantly.
- **Relational Null Querying (PostgreSQL)**: To filter for null relationships (such as checking `tenant: null` in access control), PostgreSQL adapter does not support `{ tenant: { exists: false } }`. Always use `{ tenant: { equals: null } }` to check for empty relations.
- **Visual Context Review**: Check source image hashes or filenames before downloading or linking to ensure two templates do not map to duplicates of the same visual content.
- **Pool Connection Management**: Seeding scripts must explicitly call database pool destruction or `process.exit(0)` to prevent task hangs in background terminal runners.
- **Parameterize Seeding Templates & Dynamic Render**: When seeding HTML page templates, do not use hardcoded strings for content fields. Always use double-curly-brace placeholders (e.g. `{{ title }}`) and escape dollar signs (e.g. `\${{ price }}`) inside JavaScript/TypeScript template literals. Ensure site templates (Next.js/Astro) query the active template dynamically (e.g. via `fetchActiveTemplateForSite`) and interpolate all placeholders (including custom `fieldsData` properties) at render time.


## Reference Documentation

- **[FIELDS.md](reference/FIELDS.md)** - All field types, validation, admin options
- **[FIELD-TYPE-GUARDS.md](reference/FIELD-TYPE-GUARDS.md)** - Type guards for runtime field type checking and narrowing
- **[COLLECTIONS.md](reference/COLLECTIONS.md)** - Collection configs, auth, upload, drafts, live preview
- **[HOOKS.md](reference/HOOKS.md)** - Collection hooks, field hooks, context patterns
- **[ACCESS-CONTROL.md](reference/ACCESS-CONTROL.md)** - Collection, field, global access control, RBAC, multi-tenant
- **[ACCESS-CONTROL-ADVANCED.md](reference/ACCESS-CONTROL-ADVANCED.md)** - Context-aware, time-based, subscription-based access, factory functions, templates
- **[QUERIES.md](reference/QUERIES.md)** - Query operators, Local/REST/GraphQL APIs
- **[ENDPOINTS.md](reference/ENDPOINTS.md)** - Custom API endpoints: authentication, helpers, request/response patterns
- **[ADAPTERS.md](reference/ADAPTERS.md)** - Database, storage, email adapters, transactions
- **[ADVANCED.md](reference/ADVANCED.md)** - Authentication, jobs, endpoints, components, plugins, localization
- **[PLUGIN-DEVELOPMENT.md](reference/PLUGIN-DEVELOPMENT.md)** - Plugin architecture, monorepo structure, patterns, best practices

## Resources

- llms-full.txt: <https://payloadcms.com/llms-full.txt>
- Docs: <https://payloadcms.com/docs>
- GitHub: <https://github.com/payloadcms/payload>
- Examples: <https://github.com/payloadcms/payload/tree/main/examples>
- Templates: <https://github.com/payloadcms/payload/tree/main/templates>
