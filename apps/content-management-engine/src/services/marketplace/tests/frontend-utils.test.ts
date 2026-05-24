/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from '@jest/globals'
import { EventBus } from '../frontend-utils'

describe('EventBus', () => {
  it('should dispatch and subscribe to events', () => {
    const callback = jest.fn()
    const payload = {
      options: { color: 'blue' },
      totalPrice: 25000,
      currency: 'USD',
    }

    EventBus.subscribe('CONFIGURATOR_UPDATED', callback)
    EventBus.dispatch('CONFIGURATOR_UPDATED', payload)

    expect(callback).toHaveBeenCalledWith(payload)
  })

  it('should allow unsubscribing', () => {
    const callback = jest.fn()
    const unsubscribe = EventBus.subscribe('APP_LOADED', callback)
    
    unsubscribe()
    EventBus.dispatch('APP_LOADED', { appId: 'test', status: 'success' })

    expect(callback).not.toHaveBeenCalled()
  })
})
