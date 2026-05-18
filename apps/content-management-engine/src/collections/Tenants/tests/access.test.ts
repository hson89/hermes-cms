import { Tenants } from '../index'
import { Access, PayloadRequest } from 'payload'

describe('Tenants Access Control', () => {
  const superAdminUser = { role: 'super-admin' }
  const editorUser = { role: 'editor' }

  describe('read', () => {
    const readAccess = Tenants.access?.read as Access

    it('should allow super-admin to read', async () => {
      const result = await readAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should allow editor to read', async () => {
      const result = await readAccess({ req: { user: editorUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should deny unauthenticated users to read', async () => {
      const result = await readAccess({ req: { user: null } as any })
      expect(result).toBe(false)
    })
  })

  describe('create', () => {
    const createAccess = Tenants.access?.create as Access

    it('should allow super-admin to create', async () => {
      const result = await createAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should deny editor to create', async () => {
      const result = await createAccess({ req: { user: editorUser } as PayloadRequest })
      expect(result).toBe(false)
    })

    it('should deny unauthenticated to create', async () => {
      const result = await createAccess({ req: { user: null } as any })
      expect(result).toBeFalsy()
    })
  })

  describe('update', () => {
    const updateAccess = Tenants.access?.update as Access

    it('should allow super-admin to update', async () => {
      const result = await updateAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should deny editor to update', async () => {
      const result = await updateAccess({ req: { user: editorUser } as PayloadRequest })
      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    const deleteAccess = Tenants.access?.delete as Access

    it('should allow super-admin to delete', async () => {
      const result = await deleteAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should deny editor to delete', async () => {
      const result = await deleteAccess({ req: { user: editorUser } as PayloadRequest })
      expect(result).toBe(false)
    })
  })
})

