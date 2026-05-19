"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '../ui/atoms/Icon'
import { useAuth } from '@payloadcms/ui'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [stats, setStats] = useState({
    tenants: 0,
    contentItems: 0,
    apiCalls: 32891, // Placeholder for now
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch Tenant count
        const tenantRes = await fetch('/api/tenants?limit=1')
        const tenantData = await tenantRes.json()
        
        // Fetch Content Items count
        const contentRes = await fetch('/api/content-items?limit=1')
        const contentData = await contentRes.json()

        setStats({
          tenants: tenantData.totalDocs || 0,
          contentItems: contentData.totalDocs || 0,
          apiCalls: 32891, // Simulated
        })
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user])

  // If user is not yet loaded, show a loading skeleton or simple message
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-[#faf9fa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container-high" />
          <div className="h-4 w-32 bg-surface-container-high rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-background pb-12 overflow-x-hidden">
      {/* Canvas */}
      <main className="px-10 py-6 max-w-[1600px] mx-auto w-full flex flex-col gap-8">
        {/* Hero Section */}
        <section 
          className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-on-primary-fixed flex items-center px-12"
          style={{ 
            backgroundImage: "linear-gradient(to right, rgba(0, 25, 70, 0.95) 40%, rgba(0, 25, 70, 0.4) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCILWcicQgEEr4DroKdlpM0DvG97X579aFRklA8VHIfR2MaFlxZyXaMHFxV6KGCHkiaeI7eirzAUY0_yjM2ZdQPJpYcBZLPbfJZ6RV3m18slIgoNG5l0xM_Ek3s4flBZvRpMwP-ZE1cvlcuOsPuPSRWPnNIHTsdVQ84WB3aTaLdHguizJGZNE_9-DUavvPHfdUkHM0X0DC1vbmr32TYvgxb8HOf8OhzLoeumU5gP4ft9b0HCR2OImVZpvSi-4WnykPXP-isTIwApKya')",
            backgroundSize: 'cover',
            backgroundPosition: 'right center'
          }}
        >
          <div className="max-w-2xl relative z-10 text-on-primary">
            <h1 className="font-headline text-5xl font-bold mb-6 tracking-tight leading-tight">The Digital Curator.</h1>
            <p className="font-body text-lg text-primary-fixed-dim leading-relaxed">
              Welcome to the Hermes AI administrative interface. Manage your structured content, configure AI behavior, and oversee your multi-tenant environments.
            </p>
          </div>
        </section>

        {/* Alexandria AI — Primary Entry Point */}
        <section className="relative w-full">
          <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full -z-10" />
          <div className="bg-surface/60 backdrop-blur-[20px] rounded-2xl p-10 border border-outline-variant/15 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-center gap-8 group transition-all hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="auto_awesome" className="text-primary" size={20} />
                </div>
                <h2 className="font-headline text-2xl font-bold text-on-surface m-0">Alexandria AI</h2>
              </div>
              <p className="font-body text-on-surface-variant text-lg leading-relaxed mb-0 max-w-xl">
                I am your scholarly co-author. Tell me what you want to create, and I will find the right schema and draft it for you instantly.
              </p>
            </div>
            
            <div className="w-full md:w-[480px] relative">
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  if (prompt.trim()) {
                    router.push(`/admin/draft/new?prompt=${encodeURIComponent(prompt)}`)
                  }
                }}
                className="relative"
              >
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Draft a blog post about the future of AI..."
                  className="w-full h-16 pl-6 pr-16 bg-surface-container-lowest rounded-xl border border-outline-variant/20 font-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                />
                <button 
                  type="submit"
                  className="absolute right-3 top-3 w-10 h-10 bg-primary text-on-primary rounded-lg flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm cursor-pointer border-none"
                >
                  <Icon name="arrow_forward" size={20} />
                </button>
              </form>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-label text-xs text-on-surface-variant/60 uppercase tracking-wider">Suggested:</span>
                {['Technical Article', 'Press Release', 'Product Page'].map((type) => (
                  <button 
                    key={type}
                    onClick={() => setPrompt(`Draft a ${type} about...`)}
                    className="bg-surface-container-high hover:bg-primary/10 hover:text-primary text-on-surface-variant px-3 py-1.5 rounded-full font-label text-[11px] font-semibold transition-all border-none cursor-pointer"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between h-full transition-all hover:bg-surface-container-low hover:-translate-y-1 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-sm">
                  <Icon name="corporate_fare" filled />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface m-0">Manage Tenants</h3>
              </div>
              <p className="font-body text-on-surface-variant text-base leading-relaxed mb-8">
                Configure isolated workspaces and logical domains for different clients or projects.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/admin/collections/tenants" className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline">
                Go to Tenants
              </Link>
              {user?.role === 'super-admin' && (
                <Link href="/admin/collections/tenants/create" className="w-full bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline">
                  + Create Tenant
                </Link>
              )}
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between h-full transition-all hover:bg-surface-container-low hover:-translate-y-1 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-sm">
                  <Icon name="account_tree" filled />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface m-0">Define Content Types</h3>
              </div>
              <p className="font-body text-on-surface-variant text-base leading-relaxed mb-8">
                Define the schema and structure of your headless data models with AI assistance.
              </p>
            </div>
            <Link href="/admin/collections/content-types" className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline">
              Create Types
            </Link>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between h-full transition-all hover:bg-surface-container-low hover:-translate-y-1 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-sm">
                  <Icon name="edit_square" filled />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface m-0">Curate Content</h3>
              </div>
              <p className="font-body text-on-surface-variant text-base leading-relaxed mb-8">
                Manage and curate rich text content and AI-generated articles across all sites.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/admin/collections/content-items" className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline">
                View All Items
              </Link>
              <Link href="/admin/draft/new" className="w-full bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline flex items-center justify-center gap-2">
                <Icon name="auto_awesome" size={16} className="text-primary" />
                Start AI Drafting
              </Link>
            </div>
          </div>
        </section>

        {/* System Overview */}
        <section className="bg-surface-container-lowest rounded-xl overflow-hidden">
          <div className="p-6 bg-surface-container-low">
            <h2 className="font-headline text-xl font-bold text-on-surface m-0">System Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3">
            {/* Metric 1 */}
            <div className="p-8 flex justify-between items-end bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
              <div>
                <p className="font-label text-sm text-on-surface-variant font-medium mb-2">Active Tenants</p>
                <p className="font-headline text-4xl font-bold text-on-surface m-0">
                  {loading ? '...' : stats.tenants}
                </p>
              </div>
              <div aria-hidden="true" className="w-24 h-12 opacity-80">
                <svg className="w-full h-full stroke-primary fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 40">
                  <path d="M0,35 L20,25 L40,30 L60,15 L80,20 L100,5"></path>
                </svg>
              </div>
            </div>
            {/* Metric 2 */}
            <div className="p-8 flex justify-between items-end bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
              <div>
                <p className="font-label text-sm text-on-surface-variant font-medium mb-2">Total Content Items</p>
                <p className="font-headline text-4xl font-bold text-on-surface m-0">
                  {loading ? '...' : stats.contentItems.toLocaleString()}
                </p>
              </div>
              <div aria-hidden="true" className="w-24 h-12 opacity-80">
                <svg className="w-full h-full stroke-primary fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 40">
                  <path d="M0,30 L15,35 L35,20 L55,25 L75,10 L100,20"></path>
                </svg>
              </div>
            </div>
            {/* Metric 3 */}
            <div className="p-8 flex justify-between items-end bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
              <div>
                <p className="font-label text-sm text-on-surface-variant font-medium mb-2">API Calls Today</p>
                <p className="font-headline text-4xl font-bold text-on-surface m-0">
                  {stats.apiCalls.toLocaleString()}
                </p>
              </div>
              <div aria-hidden="true" className="w-24 h-12 opacity-80">
                <svg className="w-full h-full stroke-primary fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 40">
                  <path d="M0,25 L20,20 L40,35 L60,15 L80,25 L100,5"></path>
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
