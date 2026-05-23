'use server'

import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

export async function setupInitialAdmin(formData: FormData) {
  // Use dynamic import to break the circular dependency:
  // config -> InitPage -> actions -> config
  const config = (await import('@/payload.config')).default
  const payload = await getPayload({ config: await config })

  const name = (formData.get('name') as string || '').trim()
  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const password = formData.get('password') as string
  const workspaceName = (formData.get('workspaceName') as string || '').trim()
  const workspaceSlug = (formData.get('workspaceSlug') as string || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  const workspaceDomain = (formData.get('workspaceDomain') as string || '').trim().toLowerCase()

  // 1. Create the first tenant
  const tenant = await payload.create({
    collection: 'tenants',
    data: {
      name: workspaceName,
      slug: workspaceSlug,
      status: 'active',
      tier: 'standard',
      defaultLocale: 'en',
      domains: workspaceDomain ? [{ hostname: workspaceDomain, isPrimary: true }] : [],
    },
    draft: false,
  })

  // 2. Create the first user (super-admin)
  await payload.create({
    collection: 'users',
    data: {
      name,
      email,
      password,
      role: 'super-admin',
      tenants: [
        {
          tenant: tenant.id,
        },
      ],
    },
    draft: false,
  })

  // 3. Redirect to login or dashboard
  // Payload's login session might not be active yet, so we redirect to /admin
  redirect('/admin')
}
