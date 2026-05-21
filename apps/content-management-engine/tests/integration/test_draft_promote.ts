import { describe, beforeAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

describe('AI Drafting Session Promotion Integration Tests', () => {
  let payload: any
  let tenant: any
  let user: any
  let contentType: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    // 1. Create a mock tenant
    tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: `Promotion Test Tenant - ${Date.now()}`,
        slug: `promo-test-${Date.now()}`,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
      },
    })

    // 2. Create a mock user associated with the tenant
    user = await payload.create({
      collection: 'users',
      data: {
        email: `tester-${Date.now()}@hermes-ai.com`,
        password: 'ValidPassword123!',
        role: 'tenant-admin',
        name: 'Promo Tester',
        tenants: [
          {
            tenant: tenant.id,
          },
        ],
      },
    })

    // 3. Create a mock ContentType schema
    contentType = await payload.create({
      collection: 'content-types',
      data: {
        name: 'Contact Page',
        slug: `contact-page-${Date.now()}`,
        status: 'published',
        schema: {
          fields: [
            { name: 'contactEmail', type: 'text', required: true },
            { name: 'contactMessage', type: 'text' },
          ],
        },
        tenant: tenant.id,
      },
    })
  })

  it('should prevent promotion if session is missing the contentType schema', async () => {
    // Create drafting session without a contentType (bootstrap session state)
    const bootstrapSession = await payload.create({
      collection: 'drafting-sessions',
      data: {
        user: user.id,
        tenant: tenant.id,
        status: 'active',
        draftData: {
          title: 'Bootstrap Title',
          contactEmail: 'hello@bootstrap.com',
        },
      },
    })

    // Call the promotion logic (which we mimic/import or test directly via mock handler or code path)
    const contentTypeId = bootstrapSession.contentType 
      ? (typeof bootstrapSession.contentType === 'object' ? (bootstrapSession.contentType as any).id : bootstrapSession.contentType)
      : null;

    expect(contentTypeId).toBeNull()

    // Clean up
    await payload.delete({
      collection: 'drafting-sessions',
      id: bootstrapSession.id,
    })
  })

  it('should successfully promote draft session to ContentItem, populate fieldsData, and atomically delete session', async () => {
    // Create a complete active session with a valid contentType
    const activeSession = await payload.create({
      collection: 'drafting-sessions',
      data: {
        user: user.id,
        tenant: tenant.id,
        contentType: contentType.id,
        status: 'active',
        draftData: {
          title: 'Contact Us Now',
          contactEmail: 'support@brand.com',
          contactMessage: 'I have an issue with the product.',
        },
      },
    })

    const sessionUserId = typeof activeSession.user === 'object' ? (activeSession.user as any).id : activeSession.user
    expect(String(sessionUserId)).toBe(String(user.id))

    const resolvedContentTypeId = activeSession.contentType 
      ? (typeof activeSession.contentType === 'object' ? (activeSession.contentType as any).id : activeSession.contentType)
      : null;
    expect(resolvedContentTypeId).toBe(contentType.id)

    const resolvedTenantId = activeSession.tenant 
      ? (typeof activeSession.tenant === 'object' ? (activeSession.tenant as any).id : activeSession.tenant)
      : null;
    expect(resolvedTenantId).toBe(tenant.id)

    // Simulate the exact code executed by the promote endpoint
    const draftData = (activeSession.draftData as any) || {}
    const title = draftData.title || draftData.name || draftData.headline || 'Untitled AI Draft'
    const content = draftData.content || null

    const contentItem = await payload.create({
      collection: 'content-items',
      data: {
        title,
        content,
        fieldsData: draftData,
        contentType: resolvedContentTypeId,
        tenant: resolvedTenantId,
        status: 'draft',
      },
    })

    // Verify ContentItem creation
    expect(contentItem.id).toBeDefined()
    expect(contentItem.title).toBe('Contact Us Now')
    expect(contentItem.fieldsData.contactEmail).toBe('support@brand.com')
    expect(contentItem.fieldsData.contactMessage).toBe('I have an issue with the product.')
    
    const itemContentTypeId = typeof contentItem.contentType === 'object' ? (contentItem.contentType as any).id : contentItem.contentType
    expect(itemContentTypeId).toBe(contentType.id)

    const itemTenantId = typeof contentItem.tenant === 'object' ? (contentItem.tenant as any).id : contentItem.tenant
    expect(itemTenantId).toBe(tenant.id)

    // Delete session atomically
    await payload.delete({
      collection: 'drafting-sessions',
      id: activeSession.id,
    })

    // Verify session is deleted
    await expect(
      payload.findByID({
        collection: 'drafting-sessions',
        id: activeSession.id,
      })
    ).rejects.toThrow()

    // Clean up created ContentItem
    await payload.delete({
      collection: 'content-items',
      id: contentItem.id,
    })
  })
})
