'use server'

import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return {
      error: 'Please enter both email and password.',
    }
  }

  try {
    const config = (await import('@/payload.config')).default
    const payload = await getPayload({ config })
    
    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    if (result.token) {
      // Set the payload-token cookie manually if needed, 
      // but payload.login usually handles it if called in a way that can access headers.
      // In Payload 3.x server actions, we might need to set it.
      const cookieStore = await cookies()
      cookieStore.set('payload-token', result.token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      return {
        success: true,
      }
    }

    return {
      error: 'Invalid email or password.',
    }
  } catch (err: any) {
    console.error('Login error:', err)
    return {
      error: err.message || 'An error occurred during login.',
    }
  }
}
