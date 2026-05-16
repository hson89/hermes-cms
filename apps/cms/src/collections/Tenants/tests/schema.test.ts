import { Tenants } from '../index'

describe('Tenants Schema Validation', () => {
  const slugField: any = Tenants.fields.find((f: any) => f.name === 'slug')

  it('should validate correct slugs', () => {
    const result = slugField.validate('my-tenant-123')
    expect(result).toBe(true)
  })

  it('should reject uppercase slugs', () => {
    const result = slugField.validate('My-Tenant')
    expect(typeof result).toBe('string')
  })

  it('should reject slugs with spaces', () => {
    const result = slugField.validate('my tenant')
    expect(typeof result).toBe('string')
  })

  it('should reject slugs with special characters', () => {
    const result = slugField.validate('my_tenant!')
    expect(typeof result).toBe('string')
  })

  it('should reject empty slugs', () => {
    const result = slugField.validate('')
    expect(typeof result).toBe('string')
  })
})
