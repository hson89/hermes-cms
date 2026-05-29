import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/api-keys/validate
 * 
 * Validates external API keys against Payload CMS storage using X-Internal-Secret.
 */
export async function POST(req: NextRequest) {
  // 1. Validate Internal Secret
  const secret = req.headers.get('X-Internal-Secret')
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret'

  if (secret !== internalSecret) {
    return NextResponse.json(
      { error: 'Internal authentication failed' },
      { status: 401 }
    )
  }

  // 2. Parse Request Body
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 }
    )
  }

  const apiKey = typeof body === 'object' && body !== null && typeof body.apiKey === 'string'
    ? body.apiKey
    : undefined

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API Key is required' },
      { status: 400 }
    )
  }

  try {
    const payload = await getPayload({ config: await config })

    // Hash the API Key using HMAC-SHA256 with payload.secret
    const hashedKey = crypto.createHmac('sha256', payload.secret).update(apiKey).digest('hex')

    // Find the API Key doc using apiKeyIndex
    const result = await payload.find({
      collection: 'api-keys',
      where: {
        apiKeyIndex: {
          equals: hashedKey,
        },
      },
      overrideAccess: true,
    })

    if (!result || result.docs.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API Key or expired.' },
        { status: 401 }
      )
    }

    const keyDoc = result.docs[0]

    // Verify if it is enabled
    if (keyDoc.enableAPIKey === false) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API Key or expired.' },
        { status: 401 }
      )
    }

    // Verify expiration
    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API Key or expired.' },
        { status: 401 }
      )
    }

    // Extract tenant ID as string
    const tenantId = typeof keyDoc.tenant === 'object' && keyDoc.tenant !== null
      ? keyDoc.tenant.id
      : keyDoc.tenant

    return NextResponse.json({
      valid: true,
      apiKey: {
        id: String(keyDoc.id),
        label: keyDoc.label,
        email: keyDoc.email,
        tenant: String(tenantId),
      },
    })

  } catch (error) {
    console.error('API key validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
