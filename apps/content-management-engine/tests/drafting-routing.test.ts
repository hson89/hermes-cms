import { describe, it, expect } from '@jest/globals'

describe('AI Content Drafting Bootstrapping Logic', () => {
  const isBootstrap = (contentTypeId: string | string[] | undefined): boolean => {
    return !contentTypeId || contentTypeId === 'new' || contentTypeId === 'undefined'
  }

  it('should treat undefined, "undefined", and "new" as bootstrap states', () => {
    expect(isBootstrap('undefined')).toBe(true)
    expect(isBootstrap('new')).toBe(true)
    expect(isBootstrap(undefined)).toBe(true)
    expect(isBootstrap('')).toBe(true)
  })

  it('should treat actual contentType IDs as standard non-bootstrap states', () => {
    expect(isBootstrap('12345')).toBe(false)
    expect(isBootstrap('blog-post')).toBe(false)
    expect(isBootstrap('contact-page')).toBe(false)
  })
})

describe('Date Field Parser Safe Logic', () => {
  const parseSafeDate = (value: any): string => {
    let dateVal = ''
    if (value) {
      try {
        dateVal = new Date(value).toISOString().split('T')[0]
      } catch (e) {
        dateVal = value
      }
    }
    return dateVal
  }

  it('should format valid ISO strings and date objects into YYYY-MM-DD', () => {
    expect(parseSafeDate('2026-05-21T12:00:00Z')).toBe('2026-05-21')
    expect(parseSafeDate('2024-01-01')).toBe('2024-01-01')
  })

  it('should return the original value on invalid date strings without crashing', () => {
    expect(parseSafeDate('not-a-date')).toBe('not-a-date')
  })

  it('should return empty string when date value is null or undefined', () => {
    expect(parseSafeDate(null)).toBe('')
    expect(parseSafeDate(undefined)).toBe('')
  })
})
