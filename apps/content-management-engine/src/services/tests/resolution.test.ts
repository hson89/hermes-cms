import { jest } from '@jest/globals'
import { TemplateService } from '../template_service'
import { BasePayload } from 'payload'

/**
 * T017: Unit tests for Hydrated Block Tree Resolution (FR-011).
 */
describe('TemplateService - Resolution Engine', () => {
  let templateService: TemplateService
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      findByID: jest.fn(),
      find: jest.fn(),
    }
    templateService = new TemplateService(mockPayload as unknown as BasePayload)
  })

  it('should resolve a hydrated block tree by joining template layout and content data', async () => {
    // Mock Building Block
    const heroBlock = { id: 'block-hero', slug: 'hero', name: 'Hero' }

    // Mock Template
    mockPayload.findByID.mockImplementation(({ collection, id }: any) => {
      if (collection === 'page-templates') {
        return Promise.resolve({
          id: 'template-1',
          layout: [
            {
              block: heroBlock,
              mappings: {
                title: 'headline', // block property 'title' maps to content field 'headline'
                subtitle: 'description',
              },
            },
          ],
        })
      }
      return Promise.resolve(null)
    })

    // Mock Content Item
    const contentItem = {
      id: 'content-1',
      headline: 'Welcome to Hermes',
      description: 'The AI-first CMS',
    }

    // Call resolution (method to be implemented in T021)
    const result = await templateService.resolveHydratedTree('template-1', contentItem)

    expect(result).toHaveLength(1)
    expect(result[0].block.slug).toBe('hero')
    expect(result[0].props.title).toBe('Welcome to Hermes')
    expect(result[0].props.subtitle).toBe('The AI-first CMS')
  })
})
