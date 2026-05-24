/**
 * Type-safe Browser Pub/Sub Event Bus
 * Uses standard CustomEvent API.
 */

export type MarketplaceEventMap = {
  CONFIGURATOR_UPDATED: {
    options: Record<string, any>
    totalPrice: number
    currency: string
  }
  APP_LOADED: {
    appId: string
    status: 'success' | 'error'
  }
}

export type MarketplaceEventName = keyof MarketplaceEventMap

export const EventBus = {
  /**
   * Dispatches a custom event with type-safe payload.
   */
  dispatch<K extends MarketplaceEventName>(
    eventName: K,
    payload: MarketplaceEventMap[K]
  ) {
    if (typeof window === 'undefined') return

    const event = new CustomEvent(eventName, {
      detail: payload,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)
  },

  /**
   * Subscribes to a custom event.
   * Returns an unsubscribe function.
   */
  subscribe<K extends MarketplaceEventName>(
    eventName: K,
    callback: (data: MarketplaceEventMap[K]) => void
  ) {
    if (typeof window === 'undefined') return () => {}

    const wrapper = (event: Event) => {
      const customEvent = event as CustomEvent<MarketplaceEventMap[K]>
      callback(customEvent.detail)
    }

    window.addEventListener(eventName, wrapper)
    return () => window.removeEventListener(eventName, wrapper)
  },
}

/**
 * Asynchronous Script Loader with Timeout
 */
export const loadMarketplaceScript = async (
  src: string,
  timeoutMs: number = 3000
): Promise<void> => {
  return Promise.race([
    new Promise<void>((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.async = true
      
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      
      document.head.appendChild(script)
    }),
    new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error(`Script timeout after ${timeoutMs}ms: ${src}`)), timeoutMs)
    )
  ])
}
