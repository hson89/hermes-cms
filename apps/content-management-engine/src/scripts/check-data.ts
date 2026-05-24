import { getPayload } from 'payload'
import config from '../payload.config'

async function check() {
  const payload = await getPayload({ config: await config })
  const keys = await payload.find({
    collection: 'api-keys',
    overrideAccess: true,
  })
  console.log('--- API KEYS ---')
  console.log(JSON.stringify(keys.docs.map(k => ({ label: k.label, email: k.email, enableAPIKey: k.enableAPIKey, globalAccess: k.globalAccess })), null, 2))
  
  const tenants = await payload.find({
    collection: 'tenants',
    overrideAccess: true,
  })
  console.log('--- TENANTS ---')
  console.log(JSON.stringify(tenants.docs.map(t => ({ id: t.id, slug: t.slug, name: t.name })), null, 2))
}

check().catch(console.error)
