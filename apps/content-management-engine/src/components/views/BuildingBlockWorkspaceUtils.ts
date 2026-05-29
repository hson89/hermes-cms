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
  if (!Array.isArray(list)) return flat

  for (const item of list) {
    // If the item itself is an array (e.g. column sub-array), flatten it recursively
    if (Array.isArray(item)) {
      flat = flat.concat(flattenElements(item))
      continue
    }

    flat.push(item)

    if (item.children && item.children.length > 0) {
      // If the children are an array of arrays (e.g. Columns layout), traverse each sub-array
      if (item.type === 'Columns' && Array.isArray(item.children)) {
        for (const col of item.children) {
          flat = flat.concat(flattenElements(col as any))
        }
      } else {
        flat = flat.concat(flattenElements(item.children))
      }
    }
  }
  return flat
}

export const compileBlockSchema = (canvasElements: BlockElement[]) => {
  const flatElements = flattenElements(canvasElements)
  const properties: Record<string, any> = {}
  
  // Check elements on canvas
  const hasCarousel = flatElements.some(el => el.type === 'Carousel')

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
    // Generate fields dynamically based on their visual element type & ID
    for (const el of flatElements) {
      if (el.category === 'layout' || el.type === 'Divider') continue

      // Map legacy IDs to ensure backward compatibility with existing tests/documents
      let propertyKey = el.id
      if (el.id === 'heading_1' && el.type === 'Heading') {
        propertyKey = 'heading_text'
      } else if (el.id === 'text_1' && el.type === 'Text') {
        propertyKey = 'supporting_text'
      } else if (el.id === 'image_1' && el.type === 'Image') {
        propertyKey = 'image_source'
      }

      if (el.type === 'Heading' || el.type === 'Subheading') {
        properties[propertyKey] = {
          type: 'string',
          default: el.properties.defaultValue || (el.type === 'Heading' ? 'Heading Title' : 'Subheading Title'),
          ...(el.properties.required ? { required: true } : {})
        }
      } else if (el.type === 'Text') {
        properties[propertyKey] = {
          type: 'string',
          default: el.properties.defaultValue || 'Supporting description...',
          ...(el.properties.required ? { required: true } : {})
        }
      } else if (el.type === 'Image') {
        properties[propertyKey] = {
          type: 'string',
          default: el.properties.defaultValue || '/media/placeholder.jpg',
          ...(el.properties.required ? { required: true } : {})
        }
      } else if (el.type === 'Button') {
        properties[propertyKey] = {
          type: 'object',
          properties: {
            label: { type: 'string', default: el.properties.label || 'Button Action' },
            url: { type: 'string', default: el.properties.url || '#' }
          }
        }
      }
    }
  }

  return {
    type: 'object',
    properties,
    visualLayout: canvasElements
  }
}
