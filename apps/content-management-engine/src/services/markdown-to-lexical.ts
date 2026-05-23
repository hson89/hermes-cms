import { createHeadlessEditor } from '@lexical/headless'
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'

/**
 * Converts a Markdown string to Payload Lexical JSON format server-side.
 * Used during AI content streaming to persist structured rich-text data.
 */
export async function convertMarkdownToLexical(markdown: string): Promise<any> {
  const editor = createHeadlessEditor({
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      LinkNode,
    ],
  })

  editor.update(() => {
    $convertFromMarkdownString(markdown, TRANSFORMERS)
  }, { discrete: true })

  return editor.getEditorState().toJSON()
}
