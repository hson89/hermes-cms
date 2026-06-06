// @ts-ignore
import { describe, it, expect } from '@jest/globals'
import { getTenantAndGlobalContentTypesQuery } from '../src/utils/contentTypes'

describe('Content Types Query Builder Utility', () => {
  it('should return isGlobal query when tenantId is not provided', () => {
    const query = getTenantAndGlobalContentTypesQuery(undefined)
    expect(query).toBe('where[isGlobal][equals]=true&limit=100')
  })

  it('should return isGlobal query with custom limit when tenantId is not provided', () => {
    const query = getTenantAndGlobalContentTypesQuery(undefined, 50)
    expect(query).toBe('where[isGlobal][equals]=true&limit=50')
  })

  it('should return combined OR query (tenant OR isGlobal) when tenantId is provided', () => {
    const query = getTenantAndGlobalContentTypesQuery('tenant-123')
    expect(query).toBe('where[or][0][tenant][equals]=tenant-123&where[or][1][isGlobal][equals]=true&limit=100')
  })

  it('should return combined OR query with custom limit when tenantId is provided', () => {
    const query = getTenantAndGlobalContentTypesQuery('tenant-123', 25)
    expect(query).toBe('where[or][0][tenant][equals]=tenant-123&where[or][1][isGlobal][equals]=true&limit=25')
  })
})
