# UI Contracts: AI Content Drafting Interface

**Feature**: 004-ai-content-drafting  
**Location**: `apps/content-management-engine/src/components/`  
**Design System**: Alexandria — High-End Editorial

---

## View Registration

**Route**: Custom admin view registered in `payload.config.ts`  
**Path**: `/admin/draft/:contentTypeId`  
**Component**: `/src/components/views/DraftingWorkspace#DraftingWorkspace`

---

## Component Hierarchy

```
DraftingWorkspace (split-view container)
├── ChatPanel (left, 40%)
│   ├── ChatHeader
│   │   ├── SessionStatus indicator
│   │   └── ModelSelector dropdown
│   ├── ChatMessageList
│   │   ├── ChatMessage (user)
│   │   └── ChatMessage (assistant, with streaming)
│   ├── StyleToneSelector
│   │   └── StyleModifierChip[]
│   └── ChatInput
│       ├── PromptTextarea
│       └── PauseButton
│
├── EditorPanel (right, 60%)
│   ├── EditorHeader
│   │   ├── ContentTypeName
│   │   ├── LocaleSelector
│   │   ├── VersionSelector
│   │   └── ActionBar (Save Draft / Publish / Cancel)
│   ├── FieldRenderer
│   │   ├── DraftField (per schema field)
│   │   │   ├── FieldLabel
│   │   │   ├── AISuggestIndicator ("AI SUGGESTS" badge)
│   │   │   ├── FieldActions (Edit / Accept / Refresh)
│   │   │   └── FieldValue (text input / rich-text editor)
│   │   └── MainMediaField
│   │       ├── ImagePreview
│   │       └── GenerateImageButton
│   └── FloatingAIBar (appears on text selection in rich-text)
│       ├── SimplifyButton
│       ├── ExpandButton
│       ├── ChangeToneButton
│       └── RefineAllButton
│
└── RecoveryDialog (modal, shown when expired session exists)
    ├── "Unsaved draft found from [timestamp]"
    ├── ResumeButton
    └── StartFreshButton
```

---

## Component Specifications

### DraftingWorkspace

| Property | Value |
|----------|-------|
| Layout | `display: flex; height: calc(100vh - 4rem)` (below Payload header) |
| Left panel | 40% width, Chat UI |
| Right panel | 60% width, Structured Editor |
| Divider | Glassmorphism divider (ghost border at 15% opacity) |
| Background | `surface-container-lowest` |

### ChatPanel

| Property | Value |
|----------|-------|
| Background | `surface-container-low` |
| Messages | Scrollable list, newest at bottom |
| User messages | Right-aligned, `primary-container` background |
| AI messages | Left-aligned, `surface` background, streaming text with cursor animation |
| Input area | Fixed at bottom, `surface-container` background |

### AISuggestIndicator

| Property | Value |
|----------|-------|
| Label | "AI SUGGESTS" |
| Color | Tertiary gold (`#6d5e00`) on `tertiary-container` background |
| Shape | Rounded pill (`border-radius: 999px`) |
| Actions | Edit (pencil icon), Accept (check icon), Refresh (rotate icon) |
| Animation | Subtle fade-in on appearance (`opacity 0 → 1, 300ms ease`) |

### FloatingAIBar

| Property | Value |
|----------|-------|
| Trigger | Text selection in rich-text Body field |
| Position | Above selected text (floating, `position: absolute`) |
| Style | Glassmorphism (80% opacity + 20px backdrop-blur) |
| Buttons | Simplify, Expand, Change Tone, REFINE ALL |
| Colors | Primary gradient CTA buttons |

### RecoveryDialog

| Property | Value |
|----------|-------|
| Style | Modal overlay with extra-diffused shadow (24-40px blur) |
| Content | Timestamp of expired session, two action buttons |
| Resume | Primary gradient button |
| Start Fresh | Secondary surface-high button |

---

## State Management (React)

```typescript
interface DraftingState {
  session: DraftingSession | null;
  schema: ContentTypeSchema | null;  // Current schema (may be updated via SCHEMA_UPDATED event)
  fields: Record<string, FieldState>;
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  isPaused: boolean;
  activeStreamField: string | null;
  partialStreamData: Record<string, string>;  // Buffered partial text per field (for pause/resume)
  abortController: AbortController | null;    // Controls the active SSE fetch (for pause)
  styleModifier: StyleModifier | null;
  selectedModel: string | null;
  locale: string;
  selectedVersion: number | null;
  rateLimitRemaining: number;
}

interface FieldState {
  value: any;
  previousValue: any;
  status: 'empty' | 'generating' | 'suggested' | 'accepted' | 'editing';
  type: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming: boolean;
}

interface ContentTypeSchema {
  id: string;
  name: string;
  fields: Array<{ name: string; type: string; required: boolean }>;
}
```

### SSE Event Handlers (Key Behaviors)

| Event | Handler Behavior |
|-------|-----------------|
| `SCHEMA_UPDATED` | Update `state.schema`, re-render `FieldRenderer` with new fields, clear stale field states |
| `FIELD_START` | Set `fields[name].status = 'generating'`, update `activeStreamField` |
| `TEXT_DELTA` | Append delta to `fields[name].value` and `partialStreamData[name]` |
| `FIELD_COMPLETE` | Set `fields[name].status = 'suggested'`, clear `partialStreamData[name]` |
| `STATUS_UPDATE(paused)` | N/A — pause is client-initiated (abort + auto-save partial data) |
| `IMAGE_READY` | Trigger image download via `/api/ai/download-image`, update media field |
| `ERROR` | Show inline error on affected field, set `isGenerating = false` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send prompt in chat |
| `Ctrl+S` | Save draft (auto-save snapshot) |
| `Ctrl+Shift+S` | Promote to ContentItem (Save) |
| `Escape` | Cancel current generation / close floating bar |
