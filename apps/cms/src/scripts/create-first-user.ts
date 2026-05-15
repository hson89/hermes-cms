import { getPayload } from 'payload'
import config from '../payload.config'

async function createFirstUser() {
  const payload = await getPayload({ config })

  console.log('Checking for existing users...')
  const existingUsers = await payload.find({
    collection: 'users',
    limit: 1,
  })

  if (existingUsers.totalDocs > 0) {
    console.log('Users already exist. Skipping creation.')
    process.exit(0)
  }

  console.log('Creating super-admin tenant...')
  const tenant = await payload.create({
    collection: 'tenants',
    data: {
      name: 'Hermes Root',
      slug: 'root',
      domains: [
        {
          domain: 'localhost',
        },
      ],
    },
  })

  console.log('Creating super-admin user...')
  await payload.create({
    collection: 'users',
    data: {
      email: 'admin@hermes-ai.com',
      password: 'password123',
      name: 'Super Admin',
      role: 'super-admin',
      tenants: [
        {
          tenant: tenant.id,
          roles: ['admin'],
        },
      ],
    },
  })

  console.log('First user created successfully!')
  process.exit(0)
}

createFirstUser().catch((err) => {
  console.error('Error creating first user:', err)
  process.exit(1)
})
