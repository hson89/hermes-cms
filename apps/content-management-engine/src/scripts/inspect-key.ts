import { getPayload } from 'payload'
import config from '../payload.config'

async function check() {
  const payload = await getPayload({ config: await config })
  const keys = await payload.find({
    collection: 'api-keys',
    overrideAccess: true,
  })
  const key = keys.docs.find(k => (k as any).apiKey === 'demo-api-key-123456789')
  console.log('--- API KEY ---')
  console.log(JSON.stringify(key, null, 2))
}

check().catch(console.error)
