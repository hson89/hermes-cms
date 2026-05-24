import type { Endpoint } from 'payload'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getPayload } from 'payload'
import configPromise from '../../payload.config'

/**
 * Story 1: Scoped Marketplace Token Generation
 * POST /api/marketplace/generate-token
 * 
 * Generates an HS256 JWT for a specific tenant and app.
 * Persists the SHA-256 hash in the jwt-tokens collection.
 */
export const generateMarketplaceTokenEndpoint: Endpoint = {
  path: '/api/marketplace/generate-token',
  method: 'post',
  handler: async (req) => {
    try {
      const user = req.user
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Access Control: Only admins or super-admins
      if ((user as any).role !== 'admin' && (user as any).role !== 'super-admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      const body = (req.json ? await req.json() : req.data) || {}
      const { tenantId, appId, scopes } = body

      if (!tenantId || !appId) {
        return Response.json(
          { error: 'Missing required fields: tenantId, appId' },
          { status: 400 },
        )
      }

      // Verify that the user has access to the requested tenant
      if ((user as any).role !== 'super-admin') {
        const userTenants = (user as any).tenants?.map((t: any) => 
          typeof t.tenant === 'object' ? t.tenant.id : t.tenant
        ) || []
        
        if (!userTenants.includes(tenantId)) {
          return Response.json({ error: 'Forbidden: You do not have access to this tenant' }, { status: 403 })
        }
      }

      const secret = process.env.MARKETPLACE_JWT_SECRET
      if (!secret) {
        console.error('MARKETPLACE_JWT_SECRET is not defined')
        return Response.json({ error: 'Internal Server Error: Secret missing' }, { status: 500 })
      }

      // 1. Sign the JWT
      const payload = {
        sub: user.id,
        tenant_id: tenantId,
        app_id: appId,
        scopes: scopes || [],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365), // 1 year expiry
      }

      const token = jwt.sign(payload, secret, { algorithm: 'HS256' })

      // 2. Hash the token for tracking
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // 3. Persist the hash
      const { payload: payloadAPI } = req
      await payloadAPI.create({
        collection: 'jwt-tokens',
        data: {
          tokenHash,
          tenant: tenantId,
          appId: appId,
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          isRevoked: false,
          scopes: (scopes || []).map((s: string) => ({ scope: s })),
        },
        overrideAccess: true,
      })

      return Response.json({ token })
    } catch (error) {
      console.error('Marketplace token generation error:', error)
      return Response.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  },
}
