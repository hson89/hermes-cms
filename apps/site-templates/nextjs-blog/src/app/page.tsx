import React from 'react'

interface ContentItem {
  id: string | number
  title: string
  slug?: string
  content?: any
  createdAt: string
  excerpt?: string
}

async function fetchContentItems(): Promise<ContentItem[]> {
  const payloadUrl = process.env.PAYLOAD_URL
  const apiKey = process.env.PAYLOAD_API_KEY

  if (!payloadUrl || !apiKey) {
    console.warn('[Nextjs Blog] PAYLOAD_URL or PAYLOAD_API_KEY is missing. Using mock data.')
    return getMockData()
  }

  try {
    const res = await fetch(`${payloadUrl}/api/content-items?limit=10&sort=-createdAt`, {
      headers: {
        'Authorization': `API-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache and revalidate every 60 seconds
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch content: ${res.statusText}`)
    }

    const data = await res.json()
    if (data.docs && data.docs.length > 0) {
      return data.docs.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        excerpt: doc.excerpt || doc.summary || 'A thoughtfully constructed entry compiled through Hermes AI Headless CMS.',
        createdAt: doc.createdAt,
      }))
    }
  } catch (error) {
    console.error('[Nextjs Blog] Error fetching content from Hermes CMS:', error)
  }

  return getMockData()
}

function getMockData(): ContentItem[] {
  return [
    {
      id: 'mock-1',
      title: 'The Digital Monolith and the Rise of Conversational CMS',
      excerpt: 'Exploring how standard headless workflows are evolving with deep semantic LLM engines to create dynamic schema-on-demand architectures.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      title: 'Architectures of Content: The Alexandria Philosophy',
      excerpt: 'A treatise on high-end editorial design system tokens, scholarly reading experiences, and why borders are a relic of early web engineering.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'mock-3',
      title: 'Logical Multi-Tenancy via Post-Modern RDBMS Schema Design',
      excerpt: 'How Postgres 18 combined with advanced application-layer ACLs delivers absolute tenant isolation without microservice sprawl.',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ]
}

export default async function BlogIndexPage() {
  const articles = await fetchContentItems()

  return (
    <div>
      <section className="hero-section">
        <h1 className="hero-title">The Digital Curator</h1>
        <p className="hero-subtitle">
          An archival journal of technology, editorial aesthetics, and high-end software orchestration. Powered by Hermes AI.
        </p>
      </section>

      <section className="content-grid">
        {articles.map((article) => (
          <article key={article.id} className="article-card">
            <span className="article-meta">
              {new Date(article.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <h2 className="article-title">{article.title}</h2>
            <p className="article-excerpt">{article.excerpt}</p>
            <a href="#" className="article-link">
              READ ARCHIVE ↗
            </a>
          </article>
        ))}
      </section>
    </div>
  )
}
