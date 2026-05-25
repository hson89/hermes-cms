import { jest } from '@jest/globals'
import { TemplateService } from '../template_service'
import { BasePayload } from 'payload'

describe('TemplateService - Mapping Health & Metrics', () => {
  let templateService: TemplateService
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      findByID: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    }
    templateService = new TemplateService(mockPayload as unknown as BasePayload)
  })

  describe('checkMappingHealth', () => {
    it('should identify orphaned fields when ContentType schema changes', async () => {
      // 1. Mock ContentType (missing 'legacy_field')
      mockPayload.findByID.mockImplementation(({ collection, id }: any) => {
        if (collection === 'content-types') {
          return Promise.resolve({
            id: 'ct-1',
            schema: {
              properties: {
                title: { type: 'string' },
                image: { type: 'string' },
              }
            }
          })
        }
        if (collection === 'page-templates') {
          return Promise.resolve({
            id: 'temp-1',
            contentType: 'ct-1',
            layout: [
              {
                instanceId: 'inst-1',
                block: { id: 'b1', name: 'Hero' },
                mappings: {
                  headline: 'title', // valid
                  subtext: 'legacy_field', // ORPHAN
                }
              }
            ]
          })
        }
        return Promise.resolve(null)
      })

      const result = await templateService.checkMappingHealth('temp-1')

      expect(result?.hasOrphans).toBe(true)
      expect(result?.orphans['inst-1']).toContain('subtext')
      
      // Verify payload update was called with correct metadata
      expect(mockPayload.update).toHaveBeenCalledWith(expect.objectContaining({
        collection: 'page-templates',
        id: 'temp-1',
        data: expect.objectContaining({
          validationMetadata: expect.objectContaining({
            hasOrphans: true,
            orphans: { 'inst-1': ['subtext'] }
          })
        })
      }))
    })

    it('should return no orphans if all mappings are valid', async () => {
      mockPayload.findByID.mockImplementation(({ collection }: any) => {
        if (collection === 'content-types') {
          return Promise.resolve({
            id: 'ct-1',
            schema: { properties: { title: {} } }
          })
        }
        if (collection === 'page-templates') {
          return Promise.resolve({
            id: 'temp-1',
            contentType: 'ct-1',
            layout: [{ instanceId: 'inst-1', mappings: { h: 'title' } }]
          })
        }
        return Promise.resolve(null)
      })

      const result = await templateService.checkMappingHealth('temp-1')
      expect(result?.hasOrphans).toBe(false)
    })
  })

  describe('getUsageStats', () => {
    it('should return block usage counts isolated by tenant', async () => {
      mockPayload.find.mockResolvedValue({
        docs: [
          {
            layout: [
              { block: { id: 'block-a' } },
              { block: 'block-b' }
            ]
          },
          {
            layout: [
              { block: { id: 'block-a' } }
            ]
          }
        ]
      })

      const stats = await templateService.getUsageStats('tenant-1')

      expect(stats['block-a']).toBe(2)
      expect(stats['block-b']).toBe(1)
      
      // Verify tenant filtering
      expect(mockPayload.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenant: { equals: 'tenant-1' } }
      }))
    })
  })
})
