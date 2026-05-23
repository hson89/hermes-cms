import { CollectionBeforeChangeHook } from 'payload'

/**
 * Enforces single-user active lock unique constraints.
 * Dynamically treats any lock as expired if now - lastActivityAt > 10 minutes.
 */
export const validateLockHook: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation === 'create' && data.status === 'active' && data.contentType) {
    const { payload } = req
    
    // Find active sessions for the same tenant and content type
    const existingSessions = await payload.find({
      collection: 'drafting-sessions',
      where: {
        and: [
          {
            tenant: {
              equals: data.tenant,
            },
          },
          {
            contentType: {
              equals: data.contentType,
            },
          },
          {
            status: {
              equals: 'active',
            },
          },
        ],
      },
      overrideAccess: true,
    })

    if (existingSessions.docs.length > 0) {
      const session = existingSessions.docs[0] as any
      const lastActivity = new Date(session.lastActivityAt).getTime()
      const now = Date.now()
      
      // If active for less than 10 minutes, reject
      if (now - lastActivity < 10 * 60 * 1000) {
        throw new Error('A drafting session is already in progress for this content type.')
      }
      
      // Otherwise, transition the old session to 'expired' to release the lock
      await payload.update({
        collection: 'drafting-sessions',
        id: session.id,
        data: {
          status: 'expired',
        },
        overrideAccess: true,
      })
    }
  }

  return data
}
