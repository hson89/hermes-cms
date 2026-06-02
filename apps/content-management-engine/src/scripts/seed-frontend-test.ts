import { getPayload } from 'payload'
import config from '../payload.config'

async function seed() {
  console.log('Initializing Payload...')
  const payload = await getPayload({ config: await config })
  console.log('Payload initialized.')

  try {
    // 1. Create a Test Tenant
    console.log('Creating Test Tenant...')
    const uniqueSuffix = Date.now().toString().slice(-4)
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: `Frontend Demo Tenant ${uniqueSuffix}`,
        slug: `frontend-demo-${uniqueSuffix}`,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: `frontend-${uniqueSuffix}.demo.local`, isPrimary: true }
        ],
      },
      overrideAccess: true,
    })
    console.log(`Tenant created: ${tenant.id}`)

    // 2. Create an API Key for this tenant
    console.log('Creating API Key...')
    const apiKey = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Global Frontend Key',
        email: 'demo@hermes-ai.com',
        tenant: tenant.id,
        enableAPIKey: true,
        globalAccess: true,
        apiKey: 'demo-api-key-123456789',
      } as any,
      overrideAccess: true,
    })
    
    console.log('API Key Response:', JSON.stringify(apiKey, null, 2))
    const actualKey = (apiKey as any).apiKey || 'demo-api-key-123456789'
    console.log(`API Key created for tenant ${tenant.id}. Key: ${actualKey}`)

    // 3. Create a Blog Post Content Type
    console.log('Creating Blog Post Content Type...')
    const contentType = await (payload.create as any)({
      collection: 'content-types',
      data: {
        name: 'Blog Post',
        slug: 'blog-post',
        status: 'published',
        schema: {
          fields: [
            { name: 'excerpt', label: 'Excerpt', type: 'text', required: true },
            { name: 'slug', label: 'URL Slug', type: 'text', required: true, unique: true },
          ],
        },
        tenant: tenant.id,
      },
      overrideAccess: true,
    })
    console.log(`Content Type created: ${contentType.id}`)

    // 4. Create a sample Blog Post
    console.log('Creating sample content item...')
    await payload.create({
      collection: 'content-items',
      data: {
        title: 'Welcome to Hermes AI',
        contentType: contentType.id,
        tenant: tenant.id,
        status: 'published',
        fieldsData: {
          slug: 'welcome-to-hermes-ai',
          excerpt: 'This is the first post delivered dynamically from the Hermes Headless CMS to our Next.js frontend.',
        },
      },
      overrideAccess: true,
    })
    console.log('Sample content item created.')

    console.log('--- SEEDING COMPLETE ---')
    console.log(`PAYLOAD_URL=http://localhost:3000`)
    console.log(`PAYLOAD_API_KEY=${actualKey}`)
    console.log('-------------------------')

  } catch (err) {
    console.error('Seeding failed:', err)
  }
}

seed().catch(console.error)
