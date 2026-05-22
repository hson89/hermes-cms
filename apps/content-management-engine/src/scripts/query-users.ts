import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  console.log('Initializing Payload...')
  const payload = await getPayload({ config })
  console.log('Payload initialized.')

  try {
    const users = await payload.find({
      collection: 'users',
    })
    console.log('--- ALL USERS ---')
    console.log(JSON.stringify(users.docs, null, 2))

    if (users.docs.length > 0) {
      const tenantId = users.docs[0].tenants?.[0]?.tenant?.id || users.docs[0].tenants?.[0]?.tenant
      console.log('Using tenantId for query test:', tenantId)

      if (tenantId) {
        const filteredUsers = await payload.find({
          collection: 'users',
          where: {
            'tenants.tenant': {
              equals: tenantId,
            },
          },
        })
        console.log(`--- USERS FILTERED BY TENANT ${tenantId} ---`)
        console.log(JSON.stringify(filteredUsers.docs, null, 2))
      }
    }
  } catch (err) {
    console.error('Failed to query users:', err)
  }
}

run()
