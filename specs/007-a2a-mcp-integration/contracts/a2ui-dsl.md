# Contract: Agent-to-UI (A2UI) custom DSL

This contract specifies the custom, lightweight, Alexandria-aligned JSON schema for UI layout descriptions returned from Hermes AI Agents during tool invocations or chat responses.

---

## 1. Visual Response Payload

When a tool or agent generates a response containing UI components, it nests a `visual` property inside the result payload alongside the markdown `text`.

```json
{
  "content": [
    {
      "type": "text",
      "text": "I have created the draft for you. Here is a summary of the metrics."
    }
  ],
  "visual": {
    "type": "card",
    "theme": "primary",
    "typography": "serif",
    "elevation": "glass",
    "title": "Article Summary",
    "description": "Details about the draft",
    "children": [
      {
        "type": "table",
        "theme": "neutral",
        "typography": "sans",
        "data": {
          "headers": ["Metric", "Value"],
          "rows": [
            ["Title", "Alexandria Layout Guide"],
            ["Word Count", "450 words"],
            ["Target Tenant", "Main Tenant"]
          ]
        }
      }
    ]
  }
}
```

---

## 2. Component Layout Schema

The visual layout consists of a tree of component nodes.

### Card Node (`card`)
Represents an isolated, elevated card surface.
- **Properties**:
  - `title`: String header text.
  - `description`: Sub-title description text.
  - `children`: Nested component nodes.

### Table Node (`table`)
Renders tabular key-value data or reports.
- **Properties**:
  - `data`: Object containing:
    - `headers`: List of column header names.
    - `rows`: List of rows (each row is a list of cell strings).

### Chart Node (`chart`)
Renders visual data charts (e.g. line, bar, pie).
- **Properties**:
  - `chart_type`: `"line"` | `"bar"` | `"pie"`
  - `labels`: List of X-axis string labels.
  - `datasets`: List of metric arrays:
    - `{ "label": "string", "data": [number] }`

### Form Node (`form`)
Exposes interactive, pre-configured actions the user can trigger.
- **Properties**:
  - `fields`: List of form fields:
    - `{ "name": "string", "label": "string", "type": "text" | "number" | "select", "options": ["string"] }`
  - `actions`: List of button descriptors:
    - `{ "label": "string", "action": "string", "payload": {} }`

---

## 3. Style Mapping to Alexandria Tokens

Theme and design system values mapped under UI component contracts:

| Field Token | Design system (Alexandria) Token Mapping |
|-------------|------------------------------------------|
| `theme: "primary"` | `#094cb2` (Primary Brand Blue) |
| `theme: "success"` | Theme success green |
| `theme: "danger"` | Theme error red |
| `theme: "gold"` | `#6d5e00` (Tertiary Gold) |
| `theme: "neutral"` | Neutral slate color |
| `typography: "serif"` | Noto Serif (headlines/editorial context) |
| `typography: "sans"` | Inter (body labels, numbers) |
| `elevation: "flat"` | Surface elevation (no border/shadow) |
| `elevation: "raised"`| Subtle tonal background elevation |
| `elevation: "glass"` | Glassmorphic floating card surface |
