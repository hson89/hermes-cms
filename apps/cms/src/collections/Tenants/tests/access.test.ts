import { Tenants } from '../index'
import { Access, PayloadRequest } from 'payload'

describe('Tenants Access Control', () => {
  const superAdminUser = { role: 'super-admin' }
  const editorUser = { role: 'editor' }

  describe('mutation', () => {
    it('should allow super-admin to create', async () => {
      const createAccess = Tenants.access?.create as Access
      const result = await createAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should deny editor to create', async () => {
      const createAccess = Tenants.access?.create as Access
      const result = await createAccess({ req: { user: editorUser } as PayloadRequest })
      expect(result).toBe(false)
    })
  })
})
