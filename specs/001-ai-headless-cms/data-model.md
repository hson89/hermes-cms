# Data Model

## Entities

### Tenant
- `id`: UUID (Primary Key)
- `name`: String
- `schema_name`: String (Unique, used for DB routing)
- `created_at`: DateTime

### User
- `id`: UUID
- `email`: String (Unique)
- `role`: Enum (Admin, Editor)
- `tenant_id`: UUID (Foreign Key to Tenant)

### ContentType
- `id`: UUID
- `name`: String
- `schema`: JSON (Defines fields and validation)
- `tenant_id`: UUID

### ContentItem
- `id`: UUID
- `content_type_id`: UUID (Foreign Key to ContentType)
- `data`: JSON (Block-based JSON)
- `status`: Enum (Draft, Published)
- `tenant_id`: UUID

### AIAgentSession
- `id`: UUID
- `user_id`: UUID
- `context`: JSON (Conversation history)
- `active_content_id`: UUID (Optional)

### APIKey
- `id`: UUID
- `key_hash`: String
- `tenant_id`: UUID
- `permissions`: String[]

### HostedSite
- `id`: UUID
- `tenant_id`: UUID
- `template_id`: String
- `url`: String
- `status`: Enum (Deploying, Active, Error)