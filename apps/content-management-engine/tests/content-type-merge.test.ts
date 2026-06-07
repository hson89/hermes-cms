// @ts-ignore
import { describe, it, expect } from '@jest/globals'
import { mergeContentTypes } from '../src/utils/contentTypes'

describe('mergeContentTypes state updater helper', () => {
  it('should return [newCT] if prev is empty and no altList is provided', () => {
    const newCT = { id: '1', slug: 'blog-post', fields: [] }
    const result = mergeContentTypes([], newCT)
    expect(result).toEqual([newCT])
  })

  it('should return [newCT, ...altList] if prev is empty and altList is provided', () => {
    const newCT = { id: '1', slug: 'blog-post' }
    const altList = [
      { id: '2', slug: 'page' },
      { id: '3', slug: 'product' }
    ]
    const result = mergeContentTypes([], newCT, altList)
    expect(result).toEqual([newCT, ...altList])
  })

  it('should update/replace existing content type in prev if IDs match', () => {
    const prev = [
      { id: '1', slug: 'blog-post', title: 'Old Title' },
      { id: '2', slug: 'page' }
    ]
    const newCT = { id: '1', slug: 'blog-post', title: 'New Title' }
    const result = mergeContentTypes(prev, newCT)
    expect(result).toEqual([
      { id: '1', slug: 'blog-post', title: 'New Title' },
      { id: '2', slug: 'page' }
    ])
  })

  it('should prepend newCT if not already in prev', () => {
    const prev = [
      { id: '2', slug: 'page' }
    ]
    const newCT = { id: '1', slug: 'blog-post' }
    const result = mergeContentTypes(prev, newCT)
    expect(result).toEqual([newCT, ...prev])
  })

  it('should merge alternative content types from altList that are not in prev, without duplicates', () => {
    const prev = [
      { id: '1', slug: 'blog-post' },
      { id: '2', slug: 'page' }
    ]
    const newCT = { id: '1', slug: 'blog-post', updated: true }
    const altList = [
      { id: '2', slug: 'page' }, // Duplicate, should not be duplicated
      { id: '3', slug: 'product' } // New, should be added
    ]
    const result = mergeContentTypes(prev, newCT, altList)
    expect(result).toEqual([
      { id: '1', slug: 'blog-post', updated: true },
      { id: '2', slug: 'page' },
      { id: '3', slug: 'product' }
    ])
  })
})
