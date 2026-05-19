import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-drafting/sessions/[id]/lock
 * Explicitly releases or updates a session lock.
 * Satisfies T024.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth(req)
  const { id } = await params

  // Note: navigator.sendBeacon might not include auth cookies in some browsers
  // but we should still try to verify if possible.
  
  try {
    const { status } = await req.json()
    
    await payload.update({
      collection: 'drafting-sessions',
      id,
      data: {
        status: status || 'expired',
      },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
