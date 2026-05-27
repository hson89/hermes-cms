import { describe, it, expect } from '@jest/globals'
import { MAIN_NAV_LINKS, CONTENT_SUB_LINKS } from '../src/constants/navigation'

describe('Navigation Constants Structure', () => {
  it('should verify that Content Types has been removed from MAIN_NAV_LINKS', () => {
    const contentTypeLink = MAIN_NAV_LINKS.find(link => link.label === 'Content Types')
    expect(contentTypeLink).toBeUndefined()
  })

  it('should verify that CONTENT_SUB_LINKS is defined and has the correct items', () => {
    expect(CONTENT_SUB_LINKS).toBeDefined()
    expect(Array.isArray(CONTENT_SUB_LINKS)).toBe(true)
    expect(CONTENT_SUB_LINKS.length).toBe(3)

    const labels = CONTENT_SUB_LINKS.map(link => link.label)
    expect(labels).toContain('Content List')
    expect(labels).toContain('Create Content')
    expect(labels).toContain('Content Types')
  })

  it('should verify correct paths and structures for content sub-links', () => {
    const listLink = CONTENT_SUB_LINKS.find(link => link.label === 'Content List')
    expect(listLink).toBeDefined()
    expect(listLink?.path).toBe('/admin/collections/content-items')

    const createLink = CONTENT_SUB_LINKS.find(link => link.label === 'Create Content')
    expect(createLink).toBeDefined()
    expect(createLink?.path).toBe('/admin/draft')

    const typesLink = CONTENT_SUB_LINKS.find(link => link.label === 'Content Types')
    expect(typesLink).toBeDefined()
    expect(typesLink?.path).toBe('/admin/collections/content-types')
  })
})
