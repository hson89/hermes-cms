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
})
