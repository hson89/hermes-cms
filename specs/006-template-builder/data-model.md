# Data Model: Template Builder Engine

## BuildingBlocks
Defines reusable UI components registered via the Block Registry API.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| name | string | Human-readable name | Required |
| slug | string | Unique identifier for the block | Unique per tenant, kebab-case |
| schema | json | Definition of block properties (props) | Required. Must define property names, types (string, number, media), and 'required' flag for mapping validation. |
| thumbnail | upload | Preview image for the builder | Optional |
| category | select | layout, media, text, interactive | Required, Default: layout |
| status | select | active, deprecated | Default: active (FR-012) |
| tenant | relationship | Owner tenant | Required, index |

## PageTemplates
Represents the structural definition of a page.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| name | string | Template name | Required |
| slug | string | URL/Reference slug | Unique per tenant |
| contentType | relationship | Associated Content Type | Required (1-to-1) |
| layout | array | Ordered list of BlockInstances | Required |
| validationMetadata | json | Stores mapping health (orphans) | Hidden |
| status | select | draft, published | Default: draft |
| tenant | relationship | Owner tenant | Required, index |

### BlockInstance (Layout Row)
- **instanceId**: Unique string identifier (client-side generated) for deterministic layout tracking.
- **block**: Relationship to `BuildingBlocks`.
- **mappings**: JSON object mapping `BlockProperty` -> `ContentTypeField`.

## TemplateDeployments
Tracks the history of template pushes to frontend environments.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| template | relationship | Deployed PageTemplate | Required |
| site | relationship | Target HostedSite | Required |
| triggeredBy | relationship | User who deployed | Required |
| status | select | pending, success, failed | Default: pending |
| payload | json | Snapshot of the hydrated tree sent | Required |
| tenant | relationship | Owner tenant | Required, index |

## Relationships
- `PageTemplate` (1) <-> (1) `ContentType`: Each template defines the visual structure for exactly one content schema.
- `PageTemplate` (1) <-> (N) `BlockInstance`: A template is composed of multiple blocks.
- `BlockInstance` (N) <-> (1) `BuildingBlock`: Multiple instances can use the same block definition.
- `TemplateDeployment` (N) <-> (1) `PageTemplate`: History of deployments for a template.
- `TemplateDeployment` (N) <-> (1) `HostedSite`: History of deployments to a specific site.
