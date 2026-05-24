export interface ContentItem {
  id: string | number
  title: string
  slug?: string
  content?: any
  createdAt: string
  excerpt?: string
}

export interface Tenant {
  id: string | number
  name: string
  slug: string
}

/**
 * Resolves a tenant slug into its internal database ID.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const PAYLOAD_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
  const API_KEY = process.env.PAYLOAD_API_KEY

  console.log(`[CMS] Resolving tenant: ${slug} (API_KEY present: ${!!API_KEY})`)
  if (!API_KEY) return null

  try {
    const url = `${PAYLOAD_URL}/api/tenants?where[slug][equals]=${slug}`
    console.log(`[CMS] Fetching: ${url}`)
    const res = await fetch(url, {
      headers: {
        'Authorization': `API-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // Cache tenant resolution for 5 minutes
    })

    console.log(`[CMS] Response status: ${res.status}`)
    if (!res.ok) {
      const err = await res.text()
      console.error(`[CMS] Error response: ${err}`)
      return null
    }
    const data = await res.json()
    
    if (data.docs && data.docs.length > 0) {
      return {
        id: data.docs[0].id,
        name: data.docs[0].name,
        slug: data.docs[0].slug,
      }
    }
  } catch (error) {
    console.error(`[CMS] Error resolving tenant slug "${slug}":`, error)
  }

  return null
}

/**
 * Fetches content items scoped to a specific tenant.
 */
export async function fetchContentItems(tenantId: string | number): Promise<ContentItem[]> {
  const PAYLOAD_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
  const API_KEY = process.env.PAYLOAD_API_KEY
  
  if (!API_KEY) return []

  try {
    const res = await fetch(`${PAYLOAD_URL}/api/content-items?where[tenant][equals]=${tenantId}&limit=10&sort=-createdAt`, {
      headers: {
        'Authorization': `API-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) throw new Error(`CMS returned ${res.status}`)
    const data = await res.json()

    return (data.docs || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      slug: doc.fieldsData?.slug || doc.slug,
      excerpt: doc.fieldsData?.excerpt || doc.fieldsData?.summary || doc.excerpt || doc.summary || 'A thoughtfully constructed entry compiled through Hermes CMS.',
      createdAt: doc.createdAt,
    }))
  } catch (error) {
    console.error(`[CMS] Error fetching items for tenant ${tenantId}:`, error)
    return []
  }
}

/**
 * Fetches a single article by its slug and tenant ID.
 */
export async function fetchArticleBySlug(tenantId: string | number, articleSlug: string): Promise<ContentItem | null> {
  const PAYLOAD_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
  const API_KEY = process.env.PAYLOAD_API_KEY

  if (!API_KEY) return null

  try {
    const res = await fetch(`${PAYLOAD_URL}/api/content-items?where[tenant][equals]=${tenantId}&where[fieldsData.slug][equals]=${articleSlug}&limit=1`, {
      headers: {
        'Authorization': `API-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) return null
    const data = await res.json()

    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0]
      return {
        id: doc.id,
        title: doc.title,
        slug: doc.fieldsData?.slug || doc.slug,
        excerpt: doc.fieldsData?.excerpt || doc.fieldsData?.summary || doc.excerpt || doc.summary,
        content: doc.content, // This will be Lexical JSON or similar
        createdAt: doc.createdAt,
      }
    }
  } catch (error) {
    console.error(`[CMS] Error fetching article "${articleSlug}" for tenant ${tenantId}:`, error)
  }

  return null
}
