import { CollectionBeforeChangeHook } from 'payload'

/**
 * FIFO trimming version history to 10 versions max.
 */
export const capVersionsHook: CollectionBeforeChangeHook = async ({ data }) => {
  if (data.versions && Array.isArray(data.versions) && data.versions.length > 10) {
    data.versions = data.versions.slice(-10)
  }
  return data
}
