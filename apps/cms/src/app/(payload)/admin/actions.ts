'use server'

import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

export async function setupInitialAdmin(formData: FormData) {
  // Use dynamic import to break the circular dependency:
  // config -> InitPage -> actions -> config
  const config = (await import('@/payload.config')).default
  const payload = await getPayload({ config })

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const workspaceName = formData.get('workspaceName') as string
  const workspaceSlug = formData.get('workspaceSlug') as string

  // 1. Create the first tenant
  const tenant = await payload.create({
    collection: 'tenants',
    data: {
      name: workspaceName,
      slug: workspaceSlug,
    },
  })

  // 2. Create the first user (super-admin)
  await payload.create({
    collection: 'users',
    data: {
      name,
      email,
      password,
      role: 'super-admin',
      tenantId: tenant.id, // Optional: super-admins can also belong to a tenant
    },
  })

  // 3. Redirect to login or dashboard
  // Payload's login session might not be active yet, so we redirect to /admin
  redirect('/admin')
}
