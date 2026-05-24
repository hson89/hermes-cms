import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantBySlug, fetchContentItems } from '../../lib/cms'

type Args = {
  params: Promise<{
    tenantSlug: string
  }>
}

export default async function TenantIndexPage({ params }: Args) {
  const { tenantSlug } = await params
  
  // 1. Resolve Tenant
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) {
    return notFound()
  }

  // 2. Fetch Articles for this Tenant
  const articles = await fetchContentItems(tenant.id)

  return (
    <div>
      <section className="hero-section">
        <h1 className="hero-title">{tenant.name}</h1>
        <p className="hero-subtitle">
          An archival journal of technology, editorial aesthetics, and high-end software orchestration. Powered by Hermes AI.
        </p>
      </section>

      <section className="content-grid">
        {articles.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-outline-variant/15 rounded-3xl bg-surface-container-low/20">
             <p className="text-outline italic">No archival entries found for this workspace.</p>
          </div>
        ) : (
          articles.map((article) => (
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
              <Link href={`/${tenantSlug}/${article.slug}`} className="article-link">
                READ ARCHIVE ↗
              </Link>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
