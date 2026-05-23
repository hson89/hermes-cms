# Tenant Management Quickstart

This guide explains how to manage tenants, custom domains, white-label branding, and LLM preferences in Hermes AI.

---

## 1. Creating a Tenant
1. Log in to the Engine Admin Portal as a **Super Admin**.
2. Navigate to **Identity > Tenants**.
3. Click **Create New**.
4. Fill in:
   - **Name**: Customer or company name (e.g., Acme Corporation).
   - **Slug**: Unique, alphanumeric identifier used for routing (e.g., `acme`).
   - **Primary Domain**: Main brand domain (e.g., `cms.acme.com`).
   - **Tier**: Service tiers mapping limits (`standard`, `premium`, `enterprise`).
5. Save the tenant record.

---

## 2. Configuring Custom Domains
1. Inside the Tenant edit wizard, navigate to the **Domains** step or section.
2. Add your custom hostnames.
3. The system automatically enforces maximum hostname limits based on the tenant's tier:
   - **Standard Tier:** Up to 10 custom domains.
   - **Premium Tier:** Up to 50 custom domains.
   - **Enterprise Tier:** Unlimited custom domains.

---

## 3. White-Label Branding & Identity
You can customize the Alexandria dashboard look and feel for each tenant:
* **Logo:** Upload a branded graphic under the **Branding** section.
* **Primary Color:** Provide a hexadecimal color string (e.g., `#094cb2`). The system validates formatting and dynamically loads the custom shade to style navigation states, gradient backgrounds, and CTAs.

---

## 4. AI & Model Configurations (AI-First CMS)
Hermes AI permits tenant-wide configuration of default LLM and DALL-E models:
1. **Default LLM Model (`defaultLLMModel`):** Set the default text co-creation engine. Choices include:
   - `openai/gpt-4o` (Standard)
   - `anthropic/claude-3-5-sonnet` (Advanced editorial prose)
   - `google/gemini-2.5-flash` (High-speed streaming)
2. **Default Image Model (`defaultImageModel`):** Set the default asset generator model:
   - `openai/dall-e-3` (Standard)

*These defaults are automatically loaded by Next.js API routes when initiating AI drafting sessions if a specific model override is not supplied by the user.*

---

## 5. Tenant-Scoped Style Modifiers (Custom Tones)
Brand-aligned language rules are enforced via **Style Modifiers**:
1. Tenant admins can create and manage brand tone definitions in the **AI > Style Modifiers** collection.
2. Each modifier specifies:
   - **Name:** User-friendly tone identifier (e.g., `Academic`, `Punchy`, `Legal-Compliant`).
   - **System Prompt:** Concrete instructions injected into the system message (e.g., *"Write in short, authoritative sentences. Avoid passive voice, superlatives, and technical jargon. Prioritize active verbs."*).
3. The drafting workspace loads these modifiers in a selection panel, letting authors toggle brand voices instantly.

---

## 6. Tenant Status & Lifecycle States
* **Active:** Normal operation. Users can log in, edit drafts, and access delivery endpoints.
* **Suspended:** Temporary access block. Blocks all logins and API requests for that tenant context.
* **Archived:** Soft-deleted state. Hides records from public facing delivery APIs but preserves original database fields for administrative data recovery.

---

## 7. Impersonation (Super Admin Only)
Super Admins can log in and view or edit any tenant's workspace on the fly. To guarantee auditing compliance:
* Every impersonated action is logged into the global **System > Audit Logs** collection, capturing the Super Admin's ID, the targeted tenant ID, and the timestamp.

---

## 8. Tenant Resolution API
Gateway routers and microservices resolve tenant contexts via:
`GET /api/tenants/resolve?hostname=...`
* **Authentication:** Requires `X-Internal-Secret` in request headers.
* **Performance:** Uses in-memory caching to guarantee resolution latencies under `< 50ms`.
