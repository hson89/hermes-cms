import { getPayload } from 'payload'
import config from '../payload.config'

async function check() {
  const payload = await getPayload({ config: await config })
  const keys = await payload.find({
    collection: 'api-keys',
    overrideAccess: true,
  })
  console.log('--- API KEYS ---')
  console.log(JSON.stringify(keys.docs.map(k => ({ label: (k as any).label, email: (k as any).email, enableAPIKey: (k as any).enableAPIKey, globalAccess: (k as any).globalAccess })), null, 2))
  
  const tenants = await payload.find({
    collection: 'tenants',
    overrideAccess: true,
  })
  console.log('--- TENANTS ---')
  console.log(JSON.stringify(tenants.docs.map(t => ({ id: t.id, slug: t.slug, name: t.name })), null, 2))

  const sites = await payload.find({
    collection: 'hosted-sites',
    overrideAccess: true,
  })
  console.log('--- HOSTED SITES ---')
  console.log(JSON.stringify(sites.docs.map(s => ({ id: s.id, name: s.name, template: s.template, tenant: typeof s.tenant === 'object' ? s.tenant?.id : s.tenant, status: s.status, deployedUrl: s.deployedUrl })), null, 2))
}

check().catch(console.error)
