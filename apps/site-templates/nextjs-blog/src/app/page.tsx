import React from 'react'
import Link from 'next/link'

export default function RootIndexPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-background font-body text-on-surface">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="font-headline text-5xl font-bold tracking-tight text-primary">Hermes AI Archive</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          Welcome to the multi-tenant digital journal. Please navigate to a specific tenant workspace to view curated content.
        </p>
        <div className="pt-8 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/15 text-sm space-y-4">
          <p className="font-semibold uppercase tracking-widest text-[10px] text-outline">Active Discovery</p>
          <p className="italic text-on-surface-variant">
            Example: <Link href="/frontend-demo" className="text-primary hover:underline">/frontend-demo</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
