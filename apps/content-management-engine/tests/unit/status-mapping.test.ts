import { describe, it, expect } from '@jest/globals'
import { getStatusBadgeColor } from '../../src/components/views/TemplateHistoryPage/utils'

describe('Deployment Status Mapping', () => {
  it('should map success to success color', () => {
    expect(getStatusBadgeColor('success')).toBe('success')
  })

  it('should map failed to danger color', () => {
    expect(getStatusBadgeColor('failed')).toBe('danger')
  })

  it('should map pending to gold color', () => {
    expect(getStatusBadgeColor('pending')).toBe('gold')
  })

  it('should map unknown status to neutral color', () => {
    expect(getStatusBadgeColor('unknown')).toBe('neutral')
  })
})
