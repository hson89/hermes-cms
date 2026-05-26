'use client'

import React, { useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Detect if a string looks like raw markdown (has ## headings, **bold**, or list items).
 * Used to decide whether to load via markdown contentType or as HTML.
 */
function looksLikeMarkdown(content: string): boolean {
  if (!content) return false
  return (
    /^#{1,6}\s/m.test(content) ||
    /\*\*[^*]+\*\*/.test(content) ||
    /^[-*+]\s/m.test(content) ||
    /^\d+\.\s/m.test(content)
  )
}

// ── Toolbar Button ─────────────────────────────────────────────────────────

const ToolbarButton: React.FC<{
  onClick: () => void
  title: string
  isActive?: boolean
  children: React.ReactNode
}> = ({ onClick, title, isActive, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick() }}
    className={`p-2 rounded-lg transition-all duration-150 border-none cursor-pointer flex items-center justify-center select-none ${
      isActive
        ? 'bg-primary/15 text-primary'
        : 'bg-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
    }`}
  >
    {children}
  </button>
)

// ── TipTap Editor ─────────────────────────────────────────────────────────

export interface TipTapEditorProps {
  value?: string
  onChange?: (html: string) => void
  isDrafting?: boolean
  disabled?: boolean
  placeholder?: string
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  value = '',
  onChange,
  isDrafting = false,
  disabled = false,
  placeholder = 'Start writing or let AI draft content for you...',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // In TipTap 3.x the undo/redo extension is called 'undoRedo'
        undoRedo: { depth: 100 },
      }),
      // The Markdown extension enables bidirectional markdown <-> prosemirror conversion.
      // Options: indentation, marked, markedOptions (no 'html' option in v3.x)
      Markdown.configure({
        indentation: { style: 'space', size: 2 },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount.configure({
        mode: 'nodeSize',
      }),
    ],
    content: '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (!disabled && onChange) {
        // Always persist as HTML for canonical storage
        onChange(editor.getHTML())
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        spellcheck: 'true',
      },
    },
    immediatelyRender: false,
  })

  // Sync incoming value (AI streaming or external updates)
  useEffect(() => {
    if (!editor) return
    if (!value) return

    const isMarkdown = looksLikeMarkdown(value)
    if (isMarkdown) {
      const currentMarkdown = (editor.storage as any)?.markdown?.getMarkdown()
      if (currentMarkdown === value) return
    } else {
      const currentHtml = editor.getHTML()
      if (currentHtml === value) return
    }

    // Only sync when not focused to prevent cursor jumps and focus resets during user input
    const isFocused = editor.isFocused
    if (isFocused) return

    if (isMarkdown) {
      editor.commands.setContent(value, { contentType: 'markdown' } as any)
    } else {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  // Keep editable in sync with disabled prop
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  const run = useCallback((cmd: () => boolean) => {
    if (disabled || !editor) return
    cmd()
    editor.commands.focus()
  }, [editor, disabled])

  if (!editor) return null

  // ── Drafting / AI streaming state ──────────────────────────────────────
  if (isDrafting) {
    return (
      <div className="relative p-6 rounded-xl bg-primary-fixed/20 -ml-4 transition-all">
        <div className="absolute -left-2 top-4 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
        </div>
        {/* Read-only rendered preview while AI is streaming */}
        <div
          className="prose prose-lg max-w-none font-body text-on-surface leading-relaxed typing-cursor"
          dangerouslySetInnerHTML={{ __html: value || '' }}
        />
      </div>
    )
  }

  // ── Editor ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-3 group/tiptap">

      {/* ── Glassmorphic Toolbar ───────────────────────────────────────── */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-surface-container-low/80 backdrop-blur-[20px] rounded-xl border border-outline-variant/15 transition-all">

          <ToolbarButton title="Bold (⌘B)" isActive={editor.isActive('bold')}
            onClick={() => run(() => editor.chain().focus().toggleBold().run())}>
            <span className="material-symbols-outlined !text-lg">format_bold</span>
          </ToolbarButton>

          <ToolbarButton title="Italic (⌘I)" isActive={editor.isActive('italic')}
            onClick={() => run(() => editor.chain().focus().toggleItalic().run())}>
            <span className="material-symbols-outlined !text-lg">format_italic</span>
          </ToolbarButton>

          <ToolbarButton title="Strikethrough" isActive={editor.isActive('strike')}
            onClick={() => run(() => editor.chain().focus().toggleStrike().run())}>
            <span className="material-symbols-outlined !text-lg">strikethrough_s</span>
          </ToolbarButton>


          <ToolbarButton title="Heading 2" isActive={editor.isActive('heading', { level: 2 })}
            onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>
            <span className="font-label text-xs font-bold px-0.5">H2</span>
          </ToolbarButton>

          <ToolbarButton title="Heading 3" isActive={editor.isActive('heading', { level: 3 })}
            onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>
            <span className="font-label text-xs font-bold px-0.5">H3</span>
          </ToolbarButton>


          <ToolbarButton title="Bullet list" isActive={editor.isActive('bulletList')}
            onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>
            <span className="material-symbols-outlined !text-lg">format_list_bulleted</span>
          </ToolbarButton>

          <ToolbarButton title="Numbered list" isActive={editor.isActive('orderedList')}
            onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>
            <span className="material-symbols-outlined !text-lg">format_list_numbered</span>
          </ToolbarButton>

          <ToolbarButton title="Blockquote" isActive={editor.isActive('blockquote')}
            onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}>
            <span className="material-symbols-outlined !text-lg">format_quote</span>
          </ToolbarButton>

          <ToolbarButton title="Code block" isActive={editor.isActive('codeBlock')}
            onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}>
            <span className="material-symbols-outlined !text-lg">code</span>
          </ToolbarButton>


          <ToolbarButton title="Undo (⌘Z)"
            onClick={() => run(() => editor.chain().focus().undo().run())}>
            <span className="material-symbols-outlined !text-lg">undo</span>
          </ToolbarButton>

          <ToolbarButton title="Redo (⌘⇧Z)"
            onClick={() => run(() => editor.chain().focus().redo().run())}>
            <span className="material-symbols-outlined !text-lg">redo</span>
          </ToolbarButton>


          <ToolbarButton title="Clear formatting"
            onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}>
            <span className="material-symbols-outlined !text-lg">format_clear</span>
          </ToolbarButton>

          {/* Word count pill */}
          <div className="ml-auto px-2.5 py-0.5 rounded-full bg-surface-container text-[10px] font-label text-outline select-none">
            {editor.storage?.characterCount?.words?.() ?? 0} words
          </div>
        </div>
      )}

      {/* ── Editor Content Area ────────────────────────────────────────── */}
      <EditorContent
        editor={editor}
        className={`tiptap-editor-wrap rounded-xl border border-outline-variant/15 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all ${
          disabled
            ? 'opacity-75 cursor-not-allowed bg-surface-container-low/50'
            : 'bg-surface-container-lowest'
        }`}
      />
    </div>
  )
}
