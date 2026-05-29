import { jest } from '@jest/globals'
import { TemplateService } from '../template_service'
import { BasePayload } from 'payload'

/**
 * T032: Performance benchmark for Resolution Engine (SC-004).
 */
describe('TemplateService - Performance', () => {
  let templateService: TemplateService
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      findByID: jest.fn(),
    }
    templateService = new TemplateService(mockPayload as unknown as BasePayload)
  })

  it('should resolve a large block tree (50 blocks) within 200ms', async () => {
    // 1. Mock a large template layout
    const layout = Array.from({ length: 50 }).map((_, i) => ({
      id: `inst-${i}`,
      block: {
        id: `block-${i}`,
        name: `Block ${i}`,
        slug: `block-${i}`,
        schema: { properties: { prop: { type: 'string' } } },
      },
      mappings: { prop: 'field' },
    }))

    mockPayload.findByID.mockResolvedValue({
      id: 'template-large',
      layout,
    })

    const contentItem = {
      fieldsData: {
        field: 'Some sample data value that would be hydrated into the props',
      },
    }

    // 2. Measure execution time
    const start = Date.now()
    const result = await templateService.resolveHydratedTree('template-large', contentItem)
    const end = Date.now()

    const duration = end - start
    console.log(`[Performance] Hydrated tree resolution (50 blocks): ${duration}ms`)

    expect(result).toHaveLength(50)
    expect(duration).toBeLessThan(200)
  })
})
