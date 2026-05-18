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

  const domainsField: any = Tenants.fields.find((f: any) => f.name === 'domains')
  const hostnameField: any = domainsField.fields.find((f: any) => f.name === 'hostname')

  describe('Domains Field Limit Validation', () => {
    it('should allow standard tier to have up to 10 domains', () => {
      const domains = Array.from({ length: 10 }).map((_, i) => ({ hostname: `domain-${i}.com` }))
      const result = domainsField.validate(domains, { data: { tier: 'standard' } })
      expect(result).toBe(true)
    })

    it('should reject standard tier having more than 10 domains', () => {
      const domains = Array.from({ length: 11 }).map((_, i) => ({ hostname: `domain-${i}.com` }))
      const result = domainsField.validate(domains, { data: { tier: 'standard' } })
      expect(typeof result).toBe('string')
      expect(result).toBe('Standard tier is limited to 10 domains')
    })

    it('should allow premium tier to have up to 50 domains', () => {
      const domains = Array.from({ length: 50 }).map((_, i) => ({ hostname: `domain-${i}.com` }))
      const result = domainsField.validate(domains, { data: { tier: 'premium' } })
      expect(result).toBe(true)
    })

    it('should reject premium tier having more than 50 domains', () => {
      const domains = Array.from({ length: 51 }).map((_, i) => ({ hostname: `domain-${i}.com` }))
      const result = domainsField.validate(domains, { data: { tier: 'premium' } })
      expect(typeof result).toBe('string')
      expect(result).toBe('Premium tier is limited to 50 domains')
    })

    it('should allow enterprise tier to have unlimited domains', () => {
      const domains = Array.from({ length: 100 }).map((_, i) => ({ hostname: `domain-${i}.com` }))
      const result = domainsField.validate(domains, { data: { tier: 'enterprise' } })
      expect(result).toBe(true)
    })
  })

  describe('Hostname Syntax Validation', () => {
    it('should validate correct hostnames', () => {
      const valid = ['example.com', 'sub.domain.co.uk', 'my-domain.net', 'tenant1.brand.com']
      for (const host of valid) {
        const result = hostnameField.validate(host)
        expect(result).toBe(true)
      }
    })

    it('should reject invalid hostnames', () => {
      const invalid = ['', 'example', 'http://example.com', 'example.c', 'example.', 'ex ample.com', 'ex_ample.com!']
      for (const host of invalid) {
        const result = hostnameField.validate(host)
        expect(typeof result).toBe('string')
      }
    })
  })
})

