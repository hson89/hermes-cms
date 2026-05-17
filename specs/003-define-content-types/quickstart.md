# Quickstart: Define Content Types with AI Copilot

Learn how to define, refine, publish, and export dynamic data models in Hermes AI using natural language prompts and visual tools.

## Prerequisites
- You must be logged in to the Hermes AI Admin panel.
- You must have the role of **Content Architect**, **Tenant Admin**, or **Editor**.

---

## 1. Create a Content Type via AI Prompt

1. In the CMS sidebar, navigate to **Content Types**.
2. Click **Create New** (or **AI Generator** prompt box).
3. In the prompt area, enter a detailed description of your desired model. For example:
   > "A blog post with a title, body using rich text, author relationship pointing to users, publication date, category select with options 'Tech, News, Design', and a boolean for featured status."
4. Click **Generate Schema**.
5. Wait for the AI to parse the request (usually under 15 seconds). The AI service will automatically resolve field types, generate technical slugs, and output a draft schema preview.

---

## 2. Refine the Suggested Fields Visually

Once the preview is loaded, you can manually customize any of the fields before saving the draft:
- **Add validations**: Mark key fields like `title` as **Required** or **Unique**.
- **Localize fields**: Check **Localized** on the `body` field to enable multi-language translations.
- **Adjust relationships**: Verify the `author` field correctly points to the `Users` collection.
- **Nested Structures**: Add a dynamic **Array** field for "Tags" or custom **Blocks** for complex page builders.

Click **Save Draft**. The Content Type is now saved securely in your tenant workspace, isolated from all other tenants.

---

## 3. Publish and Lock the Content Type

1. Open your saved draft Content Type.
2. In the top-right corner, change the **Status** from `Draft` to `Published`.
3. Click **Save & Publish**.
4. Once published, the schema is locked against destructive changes (e.g., deleting fields) if any Content Items are already associated with it. This prevents database and API errors.

---

## 4. Author Content Conforming to the Schema

1. Navigate to **Content Items** in the sidebar.
2. Click **Create New**.
3. Select your newly created **Content Type** from the dropdown.
4. The system dynamically renders a form matching the fields, validation rules, and nested blocks defined in the schema.
5. Fill in the values and click **Save**.
6. The system's `beforeValidate` hook runs automatic validations (checks types, required statuses, and uniqueness) at the application layer.

---

## 5. Export Schema for Developers

To use the design-system schema in local development or custom frontend builds:
1. Go to your Content Type in the Admin UI.
2. Click the **Export** button.
3. Select your format:
   - **JSON**: Standard JSON schema definition for client-side validation libraries.
   - **TypeScript**: A fully typed, copy-pasteable Payload 3.x `CollectionConfig` object ready for your local codebase.
