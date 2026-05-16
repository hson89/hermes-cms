"use client"

import React from 'react'
import Link from 'next/link'
import { Icon } from '../ui/atoms/Icon'
import { useAuth } from '@payloadcms/ui'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()

  // If user is not yet loaded, show a loading skeleton or simple message
  // instead of returning null which might make the page look empty.
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
    <div className="w-full min-h-screen bg-[#faf9fa] pb-12 overflow-x-hidden">
      {/* Canvas */}
      <main className="px-10 py-6 max-w-[1600px] mx-auto w-full flex flex-col gap-8">
        {/* Hero Section */}
        <section 
          className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-[#001946] flex items-center px-12"
          style={{ 
            backgroundImage: "linear-gradient(to right, rgba(0, 25, 70, 0.95) 40%, rgba(0, 25, 70, 0.4) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCILWcicQgEEr4DroKdlpM0DvG97X579aFRklA8VHIfR2MaFlxZyXaMHFxV6KGCHkiaeI7eirzAUY0_yjM2ZdQPJpYcBZLPbfJZ6RV3m18slIgoNG5l0xM_Ek3s4flBZvRpMwP-ZE1cvlcuOsPuPSRWPnNIHTsdVQ84WB3aTaLdHguizJGZNE_9-DUavvPHfdUkHM0X0DC1vbmr32TYvgxb8HOf8OhzLoeumU5gP4ft9b0HCR2OImVZpvSi-4WnykPXP-isTIwApKya')",
            backgroundSize: 'cover',
            backgroundPosition: 'right center'
          }}
        >
          <div className="max-w-2xl relative z-10 text-white">
            <h1 className="font-headline text-5xl font-bold mb-6 tracking-tight leading-tight">The Digital Curator.</h1>
            <p className="font-body text-lg text-[#b1c5ff] leading-relaxed">
              Welcome to the Hermes AI administrative interface. Manage your structured content, configure AI behavior, and oversee your multi-tenant environments.
            </p>
          </div>
        </section>

        {/* Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-8 flex flex-col justify-between h-full ring-1 ring-[#c3c6d5]/15 transition-transform hover:-translate-y-1 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-[#094cb2] text-white flex items-center justify-center shadow-sm">
                  <Icon name="corporate_fare" filled />
                </div>
                <h3 className="font-headline text-xl font-bold text-[#1b1c1d] m-0">Manage Tenants</h3>
              </div>
              <p className="font-body text-[#434653] text-base leading-relaxed mb-8">
                Configure isolated workspaces and logical domains for different clients or projects.
              </p>
            </div>
            <Link href="/admin/collections/tenants" className="w-full bg-[#3366cc] text-[#e7ebff] hover:bg-[#094cb2] hover:text-white transition-colors py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline">
              Go to Tenants
            </Link>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-8 flex flex-col justify-between h-full ring-1 ring-[#c3c6d5]/15 transition-transform hover:-translate-y-1 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-[#094cb2] text-white flex items-center justify-center shadow-sm">
                  <Icon name="account_tree" filled />
                </div>
                <h3 className="font-headline text-xl font-bold text-[#1b1c1d] m-0">Define Content Types</h3>
              </div>
              <p className="font-body text-[#434653] text-base leading-relaxed mb-8">
                Define the schema and structure of your headless data models with AI assistance.
              </p>
            </div>
            <Link href="/admin/collections/content-types" className="w-full bg-[#3366cc] text-[#e7ebff] hover:bg-[#094cb2] hover:text-white transition-colors py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline">
              Create Types
            </Link>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-8 flex flex-col justify-between h-full ring-1 ring-[#c3c6d5]/15 transition-transform hover:-translate-y-1 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-lg bg-[#094cb2] text-white flex items-center justify-center shadow-sm">
                  <Icon name="edit_square" filled />
                </div>
                <h3 className="font-headline text-xl font-bold text-[#1b1c1d] m-0">Curate Content</h3>
              </div>
              <p className="font-body text-[#434653] text-base leading-relaxed mb-8">
                Manage and curate rich text content and AI-generated articles across all sites.
              </p>
            </div>
            <Link href="/admin/collections/content-items" className="w-full bg-[#3366cc] text-[#e7ebff] hover:bg-[#094cb2] hover:text-white transition-colors py-3 rounded-lg font-label font-semibold text-sm tracking-wide text-center no-underline">
              Start Curating
            </Link>
          </div>
        </section>

        {/* System Overview */}
        <section className="bg-white rounded-xl ring-1 ring-[#c3c6d5]/15 overflow-hidden">
          <div className="p-6 border-b border-[#dbdadb]/50 bg-white">
            <h2 className="font-headline text-xl font-bold text-[#1b1c1d] m-0">System Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#dbdadb]/50">
            {/* Metric 1 */}
            <div className="p-8 flex justify-between items-end bg-white hover:bg-[#f5f3f4] transition-colors">
              <div>
                <p className="font-label text-sm text-[#434653] font-medium mb-2">Active Tenants</p>
                <p className="font-headline text-4xl font-bold text-[#1b1c1d] m-0">24</p>
              </div>
              <div aria-hidden="true" className="w-24 h-12 opacity-80">
                <svg className="w-full h-full stroke-[#094cb2] fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 40">
                  <path d="M0,35 L20,25 L40,30 L60,15 L80,20 L100,5"></path>
                </svg>
              </div>
            </div>
            {/* Metric 2 */}
            <div className="p-8 flex justify-between items-end bg-white hover:bg-[#f5f3f4] transition-colors">
              <div>
                <p className="font-label text-sm text-[#434653] font-medium mb-2">Total Content Items</p>
                <p className="font-headline text-4xl font-bold text-[#1b1c1d] m-0">15,450</p>
              </div>
              <div aria-hidden="true" className="w-24 h-12 opacity-80">
                <svg className="w-full h-full stroke-[#094cb2] fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 40">
                  <path d="M0,30 L15,35 L35,20 L55,25 L75,10 L100,20"></path>
                </svg>
              </div>
            </div>
            {/* Metric 3 */}
            <div className="p-8 flex justify-between items-end bg-white hover:bg-[#f5f3f4] transition-colors">
              <div>
                <p className="font-label text-sm text-[#434653] font-medium mb-2">API Calls Today</p>
                <p className="font-headline text-4xl font-bold text-[#1b1c1d] m-0">32,891</p>
              </div>
              <div aria-hidden="true" className="w-24 h-12 opacity-80">
                <svg className="w-full h-full stroke-[#094cb2] fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 40">
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
