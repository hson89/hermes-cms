import { AuditLogs } from '../index'
import { Access, PayloadRequest } from 'payload'

describe('AuditLogs Access Control', () => {
  const superAdminUser = { role: 'super-admin' }
  const editorUser = { role: 'editor' }

  describe('read', () => {
    const readAccess = AuditLogs.access?.read as Access

    it('should allow super-admin to read', async () => {
      const result = await readAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should deny editor to read', async () => {
      const result = await readAccess({ req: { user: editorUser } as PayloadRequest })
      expect(result).toBe(false)
    })

    it('should deny unauthenticated to read', async () => {
      const result = await readAccess({ req: { user: null } as any })
      expect(result).toBe(false)
    })
  })

  describe('create', () => {
    const createAccess = AuditLogs.access?.create as Access

    it('should allow super-admin to create', async () => {
      const result = await createAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(true)
    })

    it('should deny editor to create', async () => {
      const result = await createAccess({ req: { user: editorUser } as PayloadRequest })
      expect(result).toBe(false)
    })
  })

  describe('update', () => {
    const updateAccess = AuditLogs.access?.update as Access

    it('should deny update for everyone', async () => {
      const result = await updateAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    const deleteAccess = AuditLogs.access?.delete as Access

    it('should deny delete for everyone', async () => {
      const result = await deleteAccess({ req: { user: superAdminUser } as PayloadRequest })
      expect(result).toBe(false)
    })
  })
})
