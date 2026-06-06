export interface ContentItem {
	id: string | number;
	title: string;
	excerpt: string;
	category: string;
	createdAt: string;
	content?: any;
    slug?: string;
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
			};
		}
	} catch (error) {
		console.error(`[Astro CMS] Error fetching project "${projectSlug}" for tenant ${tenantId}:`, error);
	}

	return null;
}
