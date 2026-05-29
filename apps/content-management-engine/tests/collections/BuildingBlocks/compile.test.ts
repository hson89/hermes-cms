import { compileBlockSchema, BlockElement } from '../../../src/components/views/BuildingBlockWorkspaceUtils'

describe('Building Blocks Visual Schema Compiler', () => {
  it('should compile an empty schema when no elements are on the canvas', () => {
    const canvasElements: BlockElement[] = []
    const result = compileBlockSchema(canvasElements)

    expect(result.type).toBe('object')
    expect(result.properties).toEqual({})
    expect(result.visualLayout).toEqual([])
  })

  it('should compile a rich carousel schema when a Carousel element is present', () => {
    const canvasElements: BlockElement[] = [
      {
        id: 'carousel_123',
        type: 'Carousel',
        name: 'Carousel Slider',
        icon: 'view_carousel',
        category: 'interactive',
        properties: {
          transition: 'Fade',
          autoplay: false,
          interval: 3000
        },
        mappings: {
          imageSrc: 'slides[].img',
          headingText: 'slides[].txt'
        }
      }
    ]

    const result = compileBlockSchema(canvasElements)

    expect(result.type).toBe('object')
    expect(result.properties.slides).toBeDefined()
    expect(result.properties.slides.type).toBe('array')
    expect(result.properties.slides.items.properties.image_url).toBeDefined()
    
    // Config properties should match element custom properties
    expect(result.properties.config.properties.transition.default).toBe('Fade')
    expect(result.properties.config.properties.autoplay.default).toBe(false)
    expect(result.properties.config.properties.interval.default).toBe(3000)

    // Mapping properties should match element custom mappings
    expect(result.properties.mappings.properties.imageSrc.default).toBe('slides[].img')
    expect(result.properties.mappings.properties.headingText.default).toBe('slides[].txt')
  })

  it('should compile atomic properties when Heading, Text, and Image are present', () => {
    const canvasElements: BlockElement[] = [
      {
        id: 'heading_1',
        type: 'Heading',
        name: 'Title',
        icon: 'title',
        category: 'atomic',
        properties: {},
        mappings: {}
      },
      {
        id: 'text_1',
        type: 'Text',
        name: 'Body text',
        icon: 'notes',
        category: 'atomic',
        properties: {},
        mappings: {}
      },
      {
        id: 'image_1',
        type: 'Image',
        name: 'Picture',
        icon: 'image',
        category: 'atomic',
        properties: {},
        mappings: {}
      }
    ]

    const result = compileBlockSchema(canvasElements)

    expect(result.properties.heading_text).toBeDefined()
    expect(result.properties.supporting_text).toBeDefined()
    expect(result.properties.image_source).toBeDefined()
    expect(result.properties.slides).toBeUndefined()
  })

  it('should compile dynamic properties with custom API keys and handle Subheading and Divider', () => {
    const canvasElements: BlockElement[] = [
      {
        id: 'promo_title',
        type: 'Heading',
        name: 'Promo Title',
        icon: 'title',
        category: 'atomic',
        properties: { required: true },
        mappings: {}
      },
      {
        id: 'promo_subtitle',
        type: 'Subheading',
        name: 'Promo Subtitle',
        icon: 'subject',
        category: 'atomic',
        properties: {},
        mappings: {}
      },
      {
        id: 'sep_line',
        type: 'Divider',
        name: 'Separator Line',
        icon: 'horizontal_rule',
        category: 'atomic',
        properties: {},
        mappings: {}
      }
    ]

    const result = compileBlockSchema(canvasElements)

    // Divider should NOT be in properties (it's visual only)
    expect(result.properties.sep_line).toBeUndefined()

    // Heading with custom ID should use custom ID
    expect(result.properties.promo_title).toBeDefined()
    expect(result.properties.promo_title.type).toBe('string')
    expect(result.properties.promo_title.required).toBe(true)

    // Subheading with custom ID should use custom ID
    expect(result.properties.promo_subtitle).toBeDefined()
    expect(result.properties.promo_subtitle.type).toBe('string')
    expect(result.properties.promo_subtitle.default).toBe('Subheading Title')
  })

  it('should compile nested fields inside visual column structures recursively', () => {
    const canvasElements: BlockElement[] = [
      {
        id: 'columns_layout',
        type: 'Columns',
        name: 'Layout Columns',
        icon: 'view_column',
        category: 'layout',
        properties: {},
        mappings: {},
        children: [
          // Column 1 elements
          [
            {
              id: 'col_heading',
              type: 'Heading',
              name: 'Column Title',
              icon: 'title',
              category: 'atomic',
              properties: {},
              mappings: {}
            }
          ],
          // Column 2 elements
          [
            {
              id: 'col_paragraph',
              type: 'Text',
              name: 'Column Body',
              icon: 'notes',
              category: 'atomic',
              properties: {},
              mappings: {}
            }
          ]
        ] as any
      }
    ]

    const result = compileBlockSchema(canvasElements)

    // Visual layout is preserved in its nested tree form
    expect(result.visualLayout[0].type).toBe('Columns')
    const layoutColumns = result.visualLayout[0]
    const childrenList = layoutColumns.children as any
    expect(childrenList[0][0].id).toBe('col_heading')

    // Schema properties are compiled flat for Content Delivery API
    expect(result.properties.col_heading).toBeDefined()
    expect(result.properties.col_heading.type).toBe('string')
    expect(result.properties.col_paragraph).toBeDefined()
    expect(result.properties.col_paragraph.type).toBe('string')
  })
})
