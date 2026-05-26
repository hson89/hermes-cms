export interface BlockElement {
  id: string
  type: string
  name: string
  icon: string
  category: 'layout' | 'atomic' | 'interactive'
  properties: Record<string, any>
  mappings: Record<string, string>
  children?: BlockElement[]
}

const flattenElements = (list: BlockElement[]): BlockElement[] => {
  let flat: BlockElement[] = []
  for (const item of list) {
    flat.push(item)
    if (item.children && item.children.length > 0) {
      flat = flat.concat(flattenElements(item.children))
    }
  }
  return flat
}

export const compileBlockSchema = (canvasElements: BlockElement[]) => {
  const flatElements = flattenElements(canvasElements)
  const properties: Record<string, any> = {}
  
  // Check elements on canvas
  const hasCarousel = flatElements.some(el => el.type === 'Carousel')
  const hasHeading = flatElements.some(el => el.type === 'Heading')
  const hasImage = flatElements.some(el => el.type === 'Image')
  const hasText = flatElements.some(el => el.type === 'Text')

  if (hasCarousel) {
    const carouselEl = flatElements.find(el => el.type === 'Carousel')
    properties.slides = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          image_url: { type: 'string', description: 'URL of slide image' },
          title: { type: 'string', description: 'Slide overlay title text' },
          description: { type: 'string', description: 'Slide summary caption text' }
        }
      }
    }
    properties.config = {
      type: 'object',
      properties: {
        transition: { type: 'string', default: carouselEl?.properties?.transition || 'Slide (Horizontal)' },
        autoplay: { type: 'boolean', default: carouselEl?.properties?.autoplay ?? true },
        interval: { type: 'integer', default: carouselEl?.properties?.interval || 5000 }
      }
    }
    properties.mappings = {
      type: 'object',
      properties: {
        imageSrc: { type: 'string', default: carouselEl?.mappings?.imageSrc || 'slide_items[].image_url' },
        headingText: { type: 'string', default: carouselEl?.mappings?.headingText || 'slide_items[].title' }
      }
    }
  } else {
    if (hasHeading) properties.heading_text = { type: 'string', default: 'Heading Title' }
    if (hasText) properties.supporting_text = { type: 'string', default: 'Supporting description...' }
    if (hasImage) properties.image_source = { type: 'string', default: '/media/placeholder.jpg' }
  }

  return {
    type: 'object',
    properties,
    visualLayout: canvasElements
  }
}

