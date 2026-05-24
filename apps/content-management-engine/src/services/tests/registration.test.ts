import { jest } from '@jest/globals'
import { TemplateService } from '../template_service'
import { BasePayload } from 'payload'

describe('TemplateService - Block Registration', () => {
  let templateService: TemplateService
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      find: jest.fn().mockResolvedValue({ docs: [] }),
      create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'new-id', ...args.data })),
      update: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: args.id, ...args.data })),
    }
    templateService = new TemplateService(mockPayload as unknown as BasePayload)
  })

  it('should register new blocks for a tenant', async () => {
    const blocks = [
      { name: 'Hero', slug: 'hero', schema: {} },
      { name: 'Footer', slug: 'footer', schema: {} },
    ]

    const result = await templateService.registerBlocks(1, blocks)

    expect(mockPayload.create).toHaveBeenCalledTimes(2)
    expect(result.registered).toBe(2)
    expect(result.deprecated).toBe(0)
  })

  it('should update existing blocks and reactivate them', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [{ id: 'hero-id', slug: 'hero', status: 'deprecated' }],
    })

    const blocks = [{ name: 'Hero Updated', slug: 'hero', schema: { updated: true } }]

    const result = await templateService.registerBlocks(1, blocks)

    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'hero-id',
        data: expect.objectContaining({ status: 'active', name: 'Hero Updated' }),
      }),
    )
    expect(result.registered).toBe(1)
  })

  it('should deprecate orphaned blocks', async () => {
    mockPayload.find.mockResolvedValue({
      docs: [
        { id: 'hero-id', slug: 'hero', status: 'active' },
        { id: 'old-id', slug: 'old-block', status: 'active' },
      ],
    })

    const blocks = [{ name: 'Hero', slug: 'hero', schema: {} }]

    const result = await templateService.registerBlocks(1, blocks)

    expect(mockPayload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'old-id',
        data: { status: 'deprecated' },
      }),
    )
    expect(result.deprecated).toBe(1)
  })
})
