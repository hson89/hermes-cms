import { beforeChangeHook } from '../../../src/collections/ContentTypes/hooks'

describe('ContentTypes Optimistic Concurrency Checks', () => {
  const mockPayload: any = {
    find: async () => ({ docs: [] }),
  }

  const originalDoc = {
    id: 'ct-123',
    slug: 'posts',
    tenant: 'tenant-123',
    updatedAt: '2026-05-17T12:00:00.000Z',
    schema: {
      fields: [{ name: 'title', type: 'text', required: true }]
    }
  }

  it('should succeed if no base version header is provided (backwards compatibility / normal saving)', async () => {
    const mockReq: any = {
      payload: mockPayload,
      headers: new Map(),
      user: { id: 'user-123' },
    }

    const incomingData = {
      slug: 'posts',
      tenant: 'tenant-123',
      schema: {
        fields: [{ name: 'title', type: 'text', required: true }]
      }
    }

    const result = await beforeChangeHook({
      data: incomingData,
      req: mockReq,
      originalDoc,
      operation: 'update',
    })

    expect(result).toBe(incomingData)
  })

  it('should succeed if the client-submitted header matches the database updatedAt timestamp exactly', async () => {
    const headers = new Map()
    headers.set('if-unmodified-since', '2026-05-17T12:00:00.000Z')

    const mockReq: any = {
      payload: mockPayload,
      headers,
      user: { id: 'user-123' },
    }

    const incomingData = {
      slug: 'posts',
      tenant: 'tenant-123',
      schema: {
        fields: [{ name: 'title', type: 'text', required: true }]
      }
    }

    const result = await beforeChangeHook({
      data: incomingData,
      req: mockReq,
      originalDoc,
      operation: 'update',
    })

    expect(result).toBe(incomingData)
  })

  it('should reject with 412 Precondition Failed if the database has a newer updatedAt timestamp', async () => {
    const headers = new Map()
    headers.set('if-unmodified-since', '2026-05-17T11:30:00.000Z')

    const mockReq: any = {
      payload: mockPayload,
      headers,
      user: { id: 'user-123' },
    }

    const incomingData = {
      slug: 'posts',
      tenant: 'tenant-123',
      schema: {
        fields: [{ name: 'title', type: 'text', required: true }]
      }
    }

    await expect(
      beforeChangeHook({
        data: incomingData,
        req: mockReq,
        originalDoc,
        operation: 'update',
      })
    ).rejects.toThrow('Precondition Failed: The Content Type was modified by another user. Please reload and try again.')
  })
})
