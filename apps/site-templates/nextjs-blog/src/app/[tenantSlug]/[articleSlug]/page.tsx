import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { getTenantBySlug, fetchArticleBySlug, fetchActiveTemplateForSite } from '../../../lib/cms'

type Args = {
  params: Promise<{
    tenantSlug: string
    articleSlug: string
  }>
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { tenantSlug, articleSlug } = await params
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) return {}
  const article = await fetchArticleBySlug(tenant.id, articleSlug)
  if (!article) return {}

  const contentTypeInput = typeof article.contentType === 'object' && article.contentType !== null
    ? (article.contentType.slug || article.contentType.id)
    : article.contentType
  const templateHtml = await fetchActiveTemplateForSite(tenant.id, contentTypeInput || 'blogpost')

  if (templateHtml) {
    const titleMatch = templateHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (titleMatch) {
      let title = titleMatch[1]
      title = title.replace(/\{\{\s*title\s*\}\}/g, article.title || '')
      return {
        title,
      }
    }
  }

  return {
    title: article.title,
    description: article.excerpt || '',
  }
}

function parseTemplateHtml(html: string) {
  // Use a more robust regex that allows for any characters inside the tag including newlines and attributes
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''

  // Attempt to find body content, falling back to full HTML if <body> is missing
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  let bodyContent = bodyMatch ? bodyMatch[1] : html

  // Clean up structural tags to prevent nesting issues when injected into Layout
  bodyContent = bodyContent
    .replace(/<!DOCTYPE html>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')

  // Extract classes with support for single or double quotes
  const htmlClassMatch = html.match(/<html[^>]*class=["']([^"']+)["']/i)
  const htmlClasses = htmlClassMatch ? htmlClassMatch[1] : ''

  const bodyClassMatch = html.match(/<body[^>]*class=["']([^"']+)["']/i)
  const bodyClasses = bodyClassMatch ? bodyClassMatch[1] : ''

  return {
    headContent,
    bodyContent,
    htmlClasses,
    bodyClasses,
  }
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

  // 3. Fetch deployed template if any
  const contentTypeInput = typeof article.contentType === 'object' && article.contentType !== null
    ? (article.contentType.slug || article.contentType.id)
    : article.contentType
  const templateHtml = await fetchActiveTemplateForSite(tenant.id, contentTypeInput || 'blogpost')

  if (templateHtml) {
    // Render the article content to HTML format
    let contentHtml = ''
    if (article.content) {
      if (typeof article.content === 'string') {
        contentHtml = article.content
      } else {
        // Fallback for JSON structure
        contentHtml = `
          <div class="p-8 bg-surface-container-low rounded-2xl border border-outline-variant/15 font-mono text-xs text-left max-w-2xl mx-auto">
             <p class="text-outline mb-4">Structured Content Format detected. Rendering as raw preview:</p>
             <pre class="whitespace-pre-wrap">${JSON.stringify(article.content, null, 2)}</pre>
          </div>
        `
      }
    } else {
      contentHtml = `<p class="italic text-outline text-center">The narrative for this entry is currently unavailable.</p>`
    }

    const formattedDate = new Date(article.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Interpolate placeholders in the HTML template
    let compiledHtml = templateHtml

    // Resolve custom fields for rendering
    let featuredImageUrl = ''
    if (article.fieldsData && article.fieldsData.featuredImage) {
      const img = article.fieldsData.featuredImage
      if (typeof img === 'object' && img !== null) {
        featuredImageUrl = img.url || ''
      } else {
        featuredImageUrl = String(img)
      }
    }
    if (!featuredImageUrl) {
      featuredImageUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8TFItxn5bgAyRZuJFDyCJGo1f45JYN2uTtJIY9hHlpDqA3ItX9VqhvUf0dud24FTjuzv2XLn4Jutr0wnQ1fR5LVdhQOKbC1x53mOeDihcY3JqH3S4TQGYu-s0l0NQbdLQW37jcBmEjGmuovPZeXzeva1ycMp2tOOZshmx9xSq60H_9jgxPqCAeVfPtmmaxzAvk8HhYW3zrKp4z2dmJPJeOjnde6RISD2Zy1rn2qZbzhcpM2xTLFd00_HzPgCd60-gHlFepCjIwlnA'
    }

    let authorName = 'Aurelian Automotive'
    const author = article.fieldsData?.author
    if (author) {
      if (typeof author === 'object' && author !== null) {
        authorName = author.name || author.email || 'Aurelian Automotive'
      } else {
        const PAYLOAD_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
        const API_KEY = process.env.PAYLOAD_API_KEY
        if (API_KEY) {
          try {
            const userRes = await fetch(`${PAYLOAD_URL}/api/users/${author}`, {
              headers: {
                'Authorization': `api-keys API-Key ${API_KEY}`,
                'Content-Type': 'application/json',
              },
              next: { revalidate: 300 },
            })
            if (userRes.ok) {
              const userData = await userRes.json()
              authorName = userData.name || userData.email || 'Aurelian Automotive'
            } else {
              console.error(`Error fetching author details: status ${userRes.status} ${userRes.statusText}`)
            }
          } catch (e) {
            console.error('Error fetching author details:', e)
          }
        }
      }
    }

    let tagsHtml = ''
    if (Array.isArray(article.fieldsData?.tags)) {
      tagsHtml = article.fieldsData.tags
        .map((t: any) => {
          const name = typeof t === 'object' && t !== null ? t.name : String(t)
          return `<span class="bg-surface-container hover:bg-surface-variant text-on-surface px-4 py-2 rounded-full text-xs font-label-md transition-colors duration-300 border border-outline-variant/10">${name}</span>`
        })
        .join('\n')
    }
    
    // Replace standard placeholders
    compiledHtml = compiledHtml.replace(/\{\{\s*title\s*\}\}/g, article.title || '')
    compiledHtml = compiledHtml.replace(/\{\{\s*excerpt\s*\}\}/g, article.excerpt || '')
    compiledHtml = compiledHtml.replace(/\{\{\s*date\s*\}\}/g, formattedDate)
    compiledHtml = compiledHtml.replace(/\{\{\s*content\s*\}\}/g, contentHtml)
    compiledHtml = compiledHtml.replace(/\{\{\s*featuredImage\s*\}\}/g, featuredImageUrl)
    compiledHtml = compiledHtml.replace(/\{\{\s*author\s*\}\}/g, authorName)
    compiledHtml = compiledHtml.replace(/\{\{\s*tags\s*\}\}/g, tagsHtml)

    // Dynamic replacement for custom fields (e.g. model, engine, horsepower, topSpeed, price, etc.)
    if (article.fieldsData && typeof article.fieldsData === 'object') {
      Object.entries(article.fieldsData).forEach(([key, val]) => {
        // Skip keys that we manually resolved to prevent overriding with raw IDs/JSON
        if (['featuredImage', 'author', 'tags'].includes(key)) return

        const stringVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g')
        compiledHtml = compiledHtml.replace(regex, stringVal)
      })
    }

    const parsed = parseTemplateHtml(compiledHtml)

    return (
      <>
        {/* Inject CSS to hide default layout header/footer and reset body background for the custom page */}
        <style dangerouslySetInnerHTML={{ __html: `
          header.navbar-container, footer.footer {
            display: none !important;
          }
          body {
            background-color: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
        ` }} />

        {/* Inject template's head elements (Next.js automatically hoists these) */}
        {parsed.headContent && (
          <div dangerouslySetInnerHTML={{ __html: parsed.headContent }} style={{ display: 'none' }} />
        )}

        {/* Apply theme classes from <html> */}
        {parsed.htmlClasses ? (
          <script dangerouslySetInnerHTML={{ __html: `
            document.documentElement.className = "${parsed.htmlClasses}";
          ` }} />
        ) : (
          <script dangerouslySetInnerHTML={{ __html: `
            document.documentElement.className = "";
          ` }} />
        )}

        {/* Render template's body content wrapped in a div with the template's body classes */}
        <div 
          className={parsed.bodyClasses || undefined} 
          dangerouslySetInnerHTML={{ __html: parsed.bodyContent }} 
        />
      </>
    )
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
