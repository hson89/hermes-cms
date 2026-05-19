import { convertMarkdownToLexical } from '../src/services/markdown-to-lexical'

describe('Markdown to Lexical Conversion', () => {
  it('should convert simple markdown to a Lexical JSON structure', async () => {
    const markdown = '# Hello World\nThis is a test.'
    const lexicalJson = await convertMarkdownToLexical(markdown)
    console.log('Lexical JSON:', JSON.stringify(lexicalJson, null, 2))
    
    expect(lexicalJson).toHaveProperty('root')
    expect(lexicalJson.root).toHaveProperty('children')
    // We expect a heading and a paragraph
    expect(lexicalJson.root.children.length).toBeGreaterThanOrEqual(2)
  })
})
