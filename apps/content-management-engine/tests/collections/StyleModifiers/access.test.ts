import { StyleModifiers } from '../../../src/collections/StyleModifiers'

describe('StyleModifiers Access Control', () => {
  const mockUser = (role: string) => ({ id: 'user-1', role })

  describe('read', () => {
    it('should allow authenticated users', () => {
      const access = StyleModifiers.access?.read
      if (typeof access !== 'function') throw new Error('Access is not a function')
      
      expect(access({ req: { user: mockUser('editor') } as any })).toBe(true)
    })

    it('should deny unauthenticated users', () => {
      const access = StyleModifiers.access?.read
      if (typeof access !== 'function') throw new Error('Access is not a function')
      
      expect(access({ req: { user: null } as any })).toBe(false)
    })
  })

  describe('create/update/delete', () => {
    it('should allow tenant admins', () => {
      const access = StyleModifiers.access?.create
      if (typeof access !== 'function') throw new Error('Access is not a function')
      
      expect(access({ req: { user: mockUser('tenant-admin') } as any })).toBe(true)
    })

    it('should deny editors', () => {
      const access = StyleModifiers.access?.create
      if (typeof access !== 'function') throw new Error('Access is not a function')
      
      expect(access({ req: { user: mockUser('editor') } as any })).toBe(false)
    })
  })
})
