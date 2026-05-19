import { CollectionBeforeChangeHook } from 'payload'

/**
 * Auto-updates lastActivityAt on every change.
 */
export const refreshActivityHook: CollectionBeforeChangeHook = async ({ data }) => {
  data.lastActivityAt = new Date().toISOString()
  return data
}
