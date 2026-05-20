import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })
  
  const user = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: 'admin@hermes-ai.com',
      },
    },
  })
  
  if (user.totalDocs > 0) {
    console.log('User admin@hermes-ai.com already exists.')
    process.exit(0)
  }
  
  console.log('Creating root tenant...')
  let tenant = await payload.find({
    collection: 'tenants',
    where: {
      slug: {
        equals: 'root',
      },
    },
  })
  
  let tenantId
  if (tenant.totalDocs === 0) {
    const createdTenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Hermes Root',
        slug: 'root',
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          {
            hostname: 'localhost.hermes-cms.com',
          },
        ],
      },
    })
    tenantId = createdTenant.id
  } else {
    tenantId = tenant.docs[0].id
  }
  
  console.log('Creating super-admin user admin@hermes-ai.com...')
  await payload.create({
    collection: 'users',
    data: {
      email: 'admin@hermes-ai.com',
      password: 'password123',
      name: 'Super Admin',
      role: 'super-admin',
      tenants: [
        {
          tenant: tenantId,
        },
      ],
    },
  })
  
  console.log('User admin@hermes-ai.com created successfully!')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
