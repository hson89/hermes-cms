export interface ContentItem {
	id: string | number;
	title: string;
	excerpt: string;
	category: string;
	createdAt: string;
	content?: any;
    slug?: string;
	contentType?: any;
	fieldsData?: any;
}

export interface Tenant {
	id: string | number;
	name: string;
	slug: string;
}

/**
 * Resolves a tenant slug into its internal database ID.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
	const PAYLOAD_URL = import.meta.env.PAYLOAD_URL || 'http://localhost:3000';
	const API_KEY = import.meta.env.PAYLOAD_API_KEY;

	if (!API_KEY) return null;

	try {
		const res = await fetch(`${PAYLOAD_URL}/api/tenants?where[or][0][slug][equals]=${slug}&where[or][1][id][equals]=${slug}`, {
			headers: {
				'Authorization': `API-Key ${API_KEY}`,
				'Content-Type': 'application/json',
			}
		});

		if (!res.ok) return null;
		const data = await res.json();
		
		if (data.docs && data.docs.length > 0) {
			return {
				id: data.docs[0].id,
				name: data.docs[0].name,
				slug: data.docs[0].slug,
			};
		}
	} catch (error) {
		console.error(`[Astro CMS] Error resolving tenant slug "${slug}":`, error);
	}

	return null;
}

/**
 * Fetches portfolio items scoped to a specific tenant.
 */
export async function fetchPortfolioItems(tenantId: string | number): Promise<ContentItem[]> {
	const PAYLOAD_URL = import.meta.env.PAYLOAD_URL || 'http://localhost:3000';
	const API_KEY = import.meta.env.PAYLOAD_API_KEY;

	if (!API_KEY) return [];

	try {
		const res = await fetch(`${PAYLOAD_URL}/api/content-items?where[tenant][equals]=${tenantId}&limit=10&sort=-createdAt`, {
			headers: {
				'Authorization': `API-Key ${API_KEY}`,
				'Content-Type': 'application/json',
			}
		});

		if (!res.ok) throw new Error(`CMS returned ${res.status}`);
		const data = await res.json();

		return (data.docs || []).map((doc: any) => ({
			id: doc.id,
			title: doc.title,
			category: doc.fieldsData?.category || doc.category || doc.type || 'DIGITAL WORK',
			excerpt: doc.fieldsData?.excerpt || doc.fieldsData?.summary || doc.excerpt || doc.summary || 'A dynamic project compiled within the Hermes AI architecture.',
			createdAt: doc.createdAt,
            slug: doc.fieldsData?.slug || doc.slug,
		}));
	} catch (error) {
		console.error(`[Astro CMS] Error fetching items for tenant ${tenantId}:`, error);
		return [];
	}
}

/**
 * Fetches a single project by its slug and tenant ID.
 */
export async function fetchProjectBySlug(tenantId: string | number, projectSlug: string): Promise<ContentItem | null> {
	const PAYLOAD_URL = import.meta.env.PAYLOAD_URL || 'http://localhost:3000';
	const API_KEY = import.meta.env.PAYLOAD_API_KEY;

	if (!API_KEY) return null;

	try {
		const res = await fetch(`${PAYLOAD_URL}/api/content-items?where[tenant][equals]=${tenantId}&where[fieldsData.slug][equals]=${projectSlug}&limit=1`, {
			headers: {
				'Authorization': `API-Key ${API_KEY}`,
				'Content-Type': 'application/json',
			}
		});

		if (!res.ok) return null;
		const data = await res.json();

		if (data.docs && data.docs.length > 0) {
			const doc = data.docs[0];
			return {
				id: doc.id,
				title: doc.title,
				category: doc.fieldsData?.category || doc.category || doc.type || 'DIGITAL WORK',
				excerpt: doc.fieldsData?.excerpt || doc.fieldsData?.summary || doc.excerpt || doc.summary,
				content: doc.content,
				createdAt: doc.createdAt,
				slug: doc.fieldsData?.slug || doc.slug,
				contentType: doc.contentType,
				fieldsData: doc.fieldsData,
			};
		}
	} catch (error) {
		console.error(`[Astro CMS] Error fetching project "${projectSlug}" for tenant ${tenantId}:`, error);
	}

	return null;
}

/**
 * Fetches the active page template HTML content for a specific site and content type.
 */
export async function fetchActiveTemplateForSite(
  tenantId: string | number,
  contentTypeInput: string | number
): Promise<string | null> {
  const PAYLOAD_URL = import.meta.env.PAYLOAD_URL || 'http://localhost:3000';
  const API_KEY = import.meta.env.PAYLOAD_API_KEY;

  if (!API_KEY) return null;

  try {
    // 1. Fetch hosted site for this tenant using astro-portfolio
    const siteUrl = `${PAYLOAD_URL}/api/hosted-sites?where[tenant][equals]=${tenantId}&where[template][equals]=astro-portfolio&limit=1`;
    const siteRes = await fetch(siteUrl, {
      headers: {
        'Authorization': `API-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!siteRes.ok) return null;
    const siteData = await siteRes.json();
    if (!siteData.docs || siteData.docs.length === 0) return null;
    const siteId = siteData.docs[0].id;

    // 2. Fetch successful deployments for this site
    const depUrl = `${PAYLOAD_URL}/api/template-deployments?where[site][equals]=${siteId}&where[status][equals]=success&sort=-createdAt&limit=5`;
    const depRes = await fetch(depUrl, {
      headers: {
        'Authorization': `API-Key ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!depRes.ok) return null;
    const depData = await depRes.json();
    const deployments = depData.docs || [];

    for (const dep of deployments) {
      const templateId = typeof dep.template === 'object' && dep.template !== null ? dep.template.id : dep.template;
      if (!templateId) continue;

      // Fetch template details
      const tempUrl = `${PAYLOAD_URL}/api/page-templates/${templateId}`;
      const tempRes = await fetch(tempUrl, {
        headers: {
          'Authorization': `API-Key ${API_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (!tempRes.ok) continue;
      const template = await tempRes.json();

      // Check if template contentType slug or ID matches
      let matches = false;
      if (template.contentType) {
        const tempCtId = typeof template.contentType === 'object' && template.contentType !== null ? template.contentType.id : template.contentType;
        const tempCtSlug = typeof template.contentType === 'object' && template.contentType !== null ? template.contentType.slug : null;

        if (String(tempCtId) === String(contentTypeInput) || String(tempCtSlug) === String(contentTypeInput)) {
          matches = true;
        } else {
          // If template.contentType is just an ID, fetch the contentType object to compare slug
          const ctId = tempCtId;
          const ctUrl = `${PAYLOAD_URL}/api/content-types/${ctId}`;
          const ctRes = await fetch(ctUrl, {
            headers: {
              'Authorization': `API-Key ${API_KEY}`,
              'Content-Type': 'application/json',
            }
          });
          if (ctRes.ok) {
            const ct = await ctRes.json();
            if (String(ct.slug) === String(contentTypeInput) || String(ct.id) === String(contentTypeInput)) {
              matches = true;
            }
          }
        }
      }

      if (matches && template.htmlContent) {
        return template.htmlContent;
      }
    }
  } catch (error) {
    console.error('[Astro CMS] Error fetching active template:', error);
  }

  return null;
}
