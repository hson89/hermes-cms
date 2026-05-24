import { jest } from '@jest/globals'
import { TemplateService } from '../template_service'
import { BasePayload } from 'payload'

/**
 * T011: Unit test for layout persistence.
 */
describe('TemplateService - Layout Persistence', () => {
  let templateService: TemplateService
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      update: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: args.id, ...args.data })),
      findByID: jest.fn().mockResolvedValue({ id: 'template-1', version: 1 }),
    }
    templateService = new TemplateService(mockPayload as unknown as BasePayload)
  })

  it('should save updated layout to a template', async () => {
    const layout = [
      { block: 'hero-id', mappings: { title: 'header' } },
      { block: 'text-id', mappings: { content: 'body' } },
    ]

    // Placeholder for saveLayout method to be implemented
    // await templateService.saveLayout('template-1', layout);
    // expect(mockPayload.update).toHaveBeenCalled();
  })
})
