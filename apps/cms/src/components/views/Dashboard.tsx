"use client"

import React from 'react'
import { Gutter } from '@payloadcms/ui'
import { Icon } from '../ui/atoms/Icon'
export const Dashboard: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-background pb-12 overflow-x-hidden">
      {/* Hero Section */}
      <section 
        className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-on-primary-fixed flex items-center px-12 mb-10 mx-auto max-w-[1600px] shadow-2xl shadow-primary/10"
        style={{ 
          backgroundImage: "linear-gradient(to right, rgba(0, 25, 70, 0.95) 40%, rgba(0, 25, 70, 0.4) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCILWcicQgEEr4DroKdlpM0DvG97X579aFRklA8VHIfR2MaFlxZyXaMHFxV6KGCHkiaeI7eirzAUY0_yjM2ZdQPJpYcBZLPbfJZ6RV3m18slIgoNG5l0xM_Ek3s4flBZvRpMwP-ZE1cvlcuOsPuPSRWPnNIHTsdVQ84WB3aTaLdHguizJGZNE_9-DUavvPHfdUkHM0X0DC1vbmr32TYvgxb8HOf8OhzLoeumU5gP4ft9b0HCR2OImVZpvSi-4WnykPXP-isTIwApKya')",
          backgroundSize: 'cover',
          backgroundPosition: 'right center'
        }}
      >
        <div className="max-w-2xl relative z-10 text-white">
          <h1 className="font-headline text-5xl font-bold mb-6 tracking-tight leading-tight drop-shadow-sm">The Digital Curator.</h1>
          <p className="font-body text-lg text-primary-fixed-dim leading-relaxed opacity-90">
            Welcome to the Hermes AI administrative interface. Manage your structured content, configure AI behavior, and oversee your multi-tenant environments.
          </p>
        </div>
      </section>

      <Gutter className="max-w-[1600px] mx-auto w-full px-4 md:px-8">
        {/* Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col justify-between h-full ring-1 ring-outline-variant/15 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Icon name="corporate_fare" filled size={28} />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface m-0">Manage Tenants</h3>
              </div>
              <p className="font-body text-on-surface-variant text-base leading-relaxed mb-8">
                Configure isolated workspaces and logical domains for different clients or projects.
              </p>
            </div>
            <a href="/admin/collections/tenants" className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all py-4 rounded-xl font-label font-bold text-sm tracking-widest uppercase text-center no-underline">
              Go to Tenants
            </a>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col justify-between h-full ring-1 ring-outline-variant/15 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Icon name="account_tree" filled size={28} />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface m-0">Define Content Types</h3>
              </div>
              <p className="font-body text-on-surface-variant text-base leading-relaxed mb-8">
                Define the schema and structure of your headless data models with AI assistance.
              </p>
            </div>
            <a href="/admin/collections/content-types" className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all py-4 rounded-xl font-label font-bold text-sm tracking-widest uppercase text-center no-underline">
              Create Types
            </a>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col justify-between h-full ring-1 ring-outline-variant/15 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 duration-300">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Icon name="edit_square" filled size={28} />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface m-0">Curate Content</h3>
              </div>
              <p className="font-body text-on-surface-variant text-base leading-relaxed mb-8">
                Manage and curate rich text content and AI-generated articles across all sites.
              </p>
            </div>
            <a href="/admin/collections/content-items" className="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all py-4 rounded-xl font-label font-bold text-sm tracking-widest uppercase text-center no-underline">
              Start Curating
            </a>
          </div>
        </section>

        {/* System Overview */}
        <section className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/15 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-surface-dim/30 bg-surface-container-lowest">
            <h2 className="font-headline text-2xl font-bold text-on-surface m-0">System Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-dim/30">
            {/* Metric 1 */}
            <div className="p-10 flex justify-between items-end bg-surface-container-lowest hover:bg-surface-container-low/50 transition-colors">
              <div>
                <p className="font-label text-xs text-on-surface-variant font-bold mb-3 uppercase tracking-widest opacity-70">Active Tenants</p>
                <p className="font-headline text-5xl font-extrabold text-on-surface m-0">24</p>
              </div>
              <div aria-hidden="true" className="w-28 h-14 opacity-90">
                <svg className="w-full h-full stroke-primary fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 100 40">
                  <path d="M0,35 L20,25 L40,30 L60,15 L80,20 L100,5"></path>
                </svg>
              </div>
            </div>
            {/* Metric 2 */}
            <div className="p-10 flex justify-between items-end bg-surface-container-lowest hover:bg-surface-container-low/50 transition-colors">
              <div>
                <p className="font-label text-xs text-on-surface-variant font-bold mb-3 uppercase tracking-widest opacity-70">Total Content Items</p>
                <p className="font-headline text-5xl font-extrabold text-on-surface m-0">15.4k</p>
              </div>
              <div aria-hidden="true" className="w-28 h-14 opacity-90">
                <svg className="w-full h-full stroke-primary fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 100 40">
                  <path d="M0,30 L15,35 L35,20 L55,25 L75,10 L100,20"></path>
                </svg>
              </div>
            </div>
            {/* Metric 3 */}
            <div className="p-10 flex justify-between items-end bg-surface-container-lowest hover:bg-surface-container-low/50 transition-colors">
              <div>
                <p className="font-label text-xs text-on-surface-variant font-bold mb-3 uppercase tracking-widest opacity-70">API Calls Today</p>
                <p className="font-headline text-5xl font-extrabold text-on-surface m-0">32.9k</p>
              </div>
              <div aria-hidden="true" className="w-28 h-14 opacity-90">
                <svg className="w-full h-full stroke-primary fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 100 40">
                  <path d="M0,25 L20,20 L40,35 L60,15 L80,25 L100,5"></path>
                </svg>
              </div>
            </div>
          </div>
        </section>
      </Gutter>
    </div>
  )
}
