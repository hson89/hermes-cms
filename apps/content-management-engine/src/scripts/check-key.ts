import { getPayload } from 'payload'
import config from '../payload.config'

async function check() {
  const payload = await getPayload({ config: await config })
  const keys = await payload.find({
    collection: 'api-keys',
    overrideAccess: true,
  })
  const match = keys.docs.some(k => (k as any).apiKey === 'demo-api-key-123456789')
  console.log('API Key Match:', match)
}

check().catch(console.error)
