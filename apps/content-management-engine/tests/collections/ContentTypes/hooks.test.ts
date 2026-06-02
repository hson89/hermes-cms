import { beforeChangeHook } from '../../../src/collections/ContentTypes/hooks'

describe('ContentTypes Collection Hooks', () => {
  let findCalls: any[] = []
  let findResults: any[] = []

  const mockPayload: any = {
    find: async (query: any) => {
      findCalls.push(query)
      return findResults.shift() || { docs: [] }
    },
  }

  const mockReq: any = {
    payload: mockPayload,
    user: {
      id: 'user-123',
      role: 'tenant-admin',
    }
  }

  beforeEach(() => {
    findCalls = []
    findResults = []
  })

  describe('Uniqueness and Schema Validation', () => {
    it('should reject if another ContentType exists with the same slug inside the same tenant', async () => {
      findResults = [
        { docs: [{ id: 'other-ct-id', slug: 'posts', tenant: 'tenant-123' }] }
      ]

      const incomingData = {
        name: 'Posts',
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
          originalDoc: undefined,
          operation: 'create',
        } as any)
      ).rejects.toThrow('A Content Type with slug "posts" already exists for this tenant.')
    })

    it('should accept if duplicate slug belongs to a different tenant', async () => {
      findResults = [{ docs: [] }]

      const incomingData = {
        name: 'Posts',
        slug: 'posts',
        tenant: 'tenant-123',
        schema: {
          fields: [{ name: 'title', type: 'text', required: true }]
        }
      }

      const result = await beforeChangeHook({
        data: incomingData,
        req: mockReq,
        originalDoc: undefined,
        operation: 'create',
      } as any)

      expect(result).toBe(incomingData)
    })

    it('should reject if schema contains duplicate internal field names', async () => {
      findResults = [{ docs: [] }]

      const incomingData = {
        name: 'Articles',
        slug: 'articles',
        tenant: 'tenant-123',
        schema: {
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'title', type: 'number', required: false }
          ]
        }
      }

      await expect(
        beforeChangeHook({
          data: incomingData,
          req: mockReq,
          originalDoc: undefined,
          operation: 'create',
        } as any)
      ).rejects.toThrow('Duplicate field name "title" detected in schema definition.')
    })

    it('should bypass tenant uniqueness check and query globally for global content types', async () => {
      findResults = [{ docs: [] }]

      const incomingData = {
        name: 'Global Blog',
        slug: 'global-blog',
        isGlobal: true,
        schema: {
          fields: [{ name: 'title', type: 'text', required: true }]
        }
      }

      const result = await beforeChangeHook({
        data: incomingData,
        req: mockReq,
        originalDoc: undefined,
        operation: 'create',
      } as any)

      expect(result).toBe(incomingData)
      expect(findCalls[0].where.and).toContainEqual({ isGlobal: { equals: true } })
    })
  })

  describe('Destructive Modification Protection', () => {
    const originalDoc = {
      id: 'ct-123',
      name: 'Luxury Watches',
      slug: 'luxury-watches',
      tenant: 'tenant-123',
      schema: {
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'price', type: 'number', required: false },
        ]
      }
    }

    it('should block updates that delete a field when content items already exist', async () => {
      findResults = [
        { docs: [] }, // duplicate slug check -> none
        { docs: [{ id: 'item-1' }] } // content items exist check -> true
      ]

      const incomingData = {
        name: 'Luxury Watches',
        slug: 'luxury-watches',
        tenant: 'tenant-123',
        schema: {
          fields: [
            { name: 'title', type: 'text', required: true },
          ]
        }
      }

      await expect(
        beforeChangeHook({
          data: incomingData,
          req: mockReq,
          originalDoc,
          operation: 'update',
        } as any)
      ).rejects.toThrow('Cannot delete field "price" because existing Content Items depend on this Content Type.')
    })

    it('should block updates that add a required field without a default value when content items exist', async () => {
      findResults = [
        { docs: [] }, // duplicate check -> none
        { docs: [{ id: 'item-1' }] } // content items exist check -> true
      ]

      const incomingData = {
        name: 'Luxury Watches',
        slug: 'luxury-watches',
        tenant: 'tenant-123',
        schema: {
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'price', type: 'number', required: false },
            { name: 'serial_number', type: 'text', required: true }
          ]
        }
      }

      await expect(
        beforeChangeHook({
          data: incomingData,
          req: mockReq,
          originalDoc,
          operation: 'update',
        } as any)
      ).rejects.toThrow('Required field "serial_number" cannot be added without a defaultValue because existing Content Items exist.')
    })

    it('should allow updates that add a required field with a default value even if content items exist', async () => {
      findResults = [
        { docs: [] }, // duplicate check -> none
        { docs: [{ id: 'item-1' }] } // content items exist check -> true
      ]

      const incomingData = {
        name: 'Luxury Watches',
        slug: 'luxury-watches',
        tenant: 'tenant-123',
        schema: {
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'price', type: 'number', required: false },
            { name: 'serial_number', type: 'text', required: true, defaultValue: 'GENERIC' }
          ]
        }
      }

      const result = await beforeChangeHook({
        data: incomingData,
        req: mockReq,
        originalDoc,
        operation: 'update',
      } as any)

      expect(result).toBe(incomingData)
    })
  })
})
