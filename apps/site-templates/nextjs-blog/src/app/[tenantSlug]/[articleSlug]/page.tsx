import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantBySlug, fetchArticleBySlug } from '../../../lib/cms'

type Args = {
  params: Promise<{
    tenantSlug: string
    articleSlug: string
  }>
}

export default async function ArticlePage({ params }: Args) {
  const { tenantSlug, articleSlug } = await params

  // 1. Resolve Tenant
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) {
    return notFound()
  }

  // 2. Fetch Article
  const article = await fetchArticleBySlug(tenant.id, articleSlug)
  if (!article) {
    return notFound()
  }

  return (
    <article className="max-w-4xl mx-auto px-6 py-12 lg:py-24 font-body animate-soft-blur-in">
      {/* Article Header */}
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href={`/${tenantSlug}`} 
            className="flex items-center gap-1.5 text-xs font-label font-bold uppercase tracking-widest text-primary hover:text-primary-container transition-colors no-underline"
          >
             <span className="material-symbols-outlined !text-sm">arrow_back</span>
             Back to {tenant.name}
          </Link>
          <div className="h-px flex-1 bg-outline-variant/15" />
          <span className="text-[10px] font-mono text-outline uppercase">
            Archived {new Date(article.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        <h1 className="font-headline text-5xl md:text-6xl font-bold text-on-surface leading-tight tracking-tight mb-6">
          {article.title}
        </h1>
        
        {article.excerpt && (
          <p className="text-xl text-on-surface-variant font-body leading-relaxed max-w-2xl border-l-2 border-primary/20 pl-6 italic">
            {article.excerpt}
          </p>
        )}
      </header>

      {/* Article Body */}
      <div className="prose prose-lg prose-indigo max-w-none font-body leading-relaxed text-on-surface space-y-6">
        {/* Placeholder for actual content rendering if it's Lexical JSON */}
        {article.content ? (
           typeof article.content === 'string' ? (
             <div dangerouslySetInnerHTML={{ __html: article.content }} />
           ) : (
             /* Fallback for JSON structure */
             <div className="p-8 bg-surface-container-low rounded-2xl border border-outline-variant/15 font-mono text-xs">
                <p className="text-outline mb-4">Structured Content Format detected. Rendering as raw preview:</p>
                <pre className="whitespace-pre-wrap">{JSON.stringify(article.content, null, 2)}</pre>
             </div>
           )
        ) : (
          <p className="italic text-outline">The narrative for this entry is currently unavailable.</p>
        )}
      </div>

      <footer className="mt-20 pt-12 border-t border-outline-variant/15 flex flex-col items-center text-center space-y-4">
         <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <span className="material-symbols-outlined">auto_awesome</span>
         </div>
         <p className="font-label text-[10px] uppercase font-bold tracking-[0.2em] text-outline">
           Curated through Hermes Headless Orchestration
         </p>
         <Link href={`/${tenantSlug}`} className="text-sm font-medium text-primary hover:underline">
            Explore more from {tenant.name}
         </Link>
      </footer>
    </article>
  )
}
