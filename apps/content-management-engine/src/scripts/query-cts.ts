import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  try {
    const cts = await payload.find({
      collection: 'content-types',
      limit: 100,
    })
    console.log('--- CONTENT TYPES ---')
    console.log(JSON.stringify(cts.docs.map((d: any) => ({ id: d.id, name: d.name, tenant: d.tenant, isGlobal: d.isGlobal })), null, 2))
  } catch (e) {
    console.error(e)
  }
}

run()
