'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { redirect } from 'next/navigation'

export type SignupState = {
  error?: string
  success?: boolean
}

export async function signupAction(prevState: any, formData: FormData): Promise<SignupState> {
  const payload = await getPayload({ config })

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const workspaceName = formData.get('workspaceName') as string
  const workspaceSlug = formData.get('workspaceSlug') as string

  try {
    // 1. Check if user already exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
    })

    if (existingUsers.totalDocs > 0) {
      return { error: 'A user with this email already exists.' }
    }

    // 2. Check if slug is taken
    const existingTenants = await payload.find({
      collection: 'tenants',
      where: {
        slug: {
          equals: workspaceSlug,
        },
      },
    })

    if (existingTenants.totalDocs > 0) {
      return { error: 'This workspace slug is already taken.' }
    }

    // 3. Determine if this is the first user (Super Admin)
    const allUsers = await payload.find({
      collection: 'users',
      limit: 1,
    })
    
    const isFirstUser = allUsers.totalDocs === 0
    const role = isFirstUser ? 'super-admin' : 'tenant-admin'

    // 4. Create the tenant
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: workspaceName,
        slug: workspaceSlug,
      },
    })

    // 5. Create the user
    await payload.create({
      collection: 'users',
      data: {
        name,
        email,
        password,
        role,
      },
    })

    return { success: true }
  } catch (err: any) {
    console.error('Signup error:', err)
    return { error: err.message || 'An unexpected error occurred during signup.' }
  }
}
