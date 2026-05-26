import { useEffect, RefObject } from 'react'

/**
 * Custom React hook that triggers a callback when a click or touch event
 * occurs outside the referenced DOM element.
 * Useful for closing modals, dropdowns, and context menus.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>, 
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking the target element or its children
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler()
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
