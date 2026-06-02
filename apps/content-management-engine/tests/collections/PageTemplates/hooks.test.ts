import { beforeChangeHook } from '../../../src/collections/PageTemplates'

describe('PageTemplates Collection Hooks', () => {
  const mockReq: any = {
    user: {
      id: 'user-123',
    }
  }

  it('should automatically set createdBy on creation', async () => {
    const incomingData: any = {
      name: 'Test Template',
    }

    const result = await beforeChangeHook({
      data: incomingData,
      req: mockReq,
      operation: 'create',
      originalDoc: undefined,
    } as any)

    expect(result.createdBy).toBe('user-123')
    expect(result.version).toBe(1)
  })

  it('should increment version on update', async () => {
    const originalDoc: any = {
      id: 'template-1',
      version: 1,
    }
    const incomingData: any = {
      name: 'Updated Template',
      version: 1,
    }

    const result = await beforeChangeHook({
      data: incomingData,
      req: mockReq,
      operation: 'update',
      originalDoc,
    } as any)

    expect(result.version).toBe(2)
  })

  it('should throw error on version conflict', async () => {
    const originalDoc: any = {
      id: 'template-1',
      version: 2,
    }
    const incomingData: any = {
      name: 'Updated Template',
      version: 1, // Stale version
    }

    await expect(
      beforeChangeHook({
        data: incomingData,
        req: mockReq,
        operation: 'update',
        originalDoc,
      } as any)
    ).rejects.toThrow('CONFLICT')
  })

  it('should allow isGlobal to be true and not require tenant or contentType', async () => {
    const incomingData: any = {
      name: 'Global Automotive',
      isGlobal: true,
      htmlContent: '<h1>Aurelian</h1>',
    }

    const result = await beforeChangeHook({
      data: incomingData,
      req: mockReq,
      operation: 'create',
      originalDoc: undefined,
    } as any)

    expect(result.isGlobal).toBe(true)
    expect(result.htmlContent).toBe('<h1>Aurelian</h1>')
    expect(result.createdBy).toBe('user-123')
  })
})
