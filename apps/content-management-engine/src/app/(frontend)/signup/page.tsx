'use client'

import React, { useState, useActionState } from 'react'
import { signupAction } from './actions'
import { Icon } from '@/components/ui/atoms/Icon'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, isPending] = useActionState(signupAction, null)

  React.useEffect(() => {
    if (state?.success) {
      router.push('/login')
    }
  }, [state, router])

  return (
    <div className="flex h-screen w-full bg-background font-body text-on-surface antialiased overflow-hidden">
      {/* Left Side: Inspirational Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface-dim">
        <div className="absolute inset-0 z-0">
          <img 
            className="h-full w-full object-cover" 
            alt="An ethereal and high-end digital art piece"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9gO884ylPff3r5mFIC8IDBuhOrhoaBxSurowzXnMW1gVgIN69a37isPGgaOqYBy5FyIEWsP2T9udAbbaGKoCNikwIFu4DUerB9LD4BWWw8nbhiKkI1vGUMoiji6JHOKgkfCAFWYB1w7D3hhjBIMbv2uDmDkvQtTrSIU-rw5wJBWxkkOLYT7AqevvRGR8IKv_G7L3EP7J5MRq-f4eRq-WtboT0-c0SJvM6EuTzlIp2GiOlSQdIZF7UEYmRBXwTJ57C5b_mezbfDnkN"
          />
        </div>
        {/* Overlay Content on Image */}
        <div className="absolute inset-0 bg-gradient-to-t from-on-primary-fixed/40 to-transparent z-10 flex flex-col justify-end p-20">
          <div className="max-w-md">
            <h2 className="font-headline text-5xl text-white leading-tight mb-6">The future of autonomous intelligence is here.</h2>
            <p className="font-body text-white/80 text-lg">Curate your workspace with Alexandria's editorial precision and Hermes AI's powerful orchestration.</p>
          </div>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col relative overflow-y-auto bg-surface-bright">
        {/* Minimal Header */}
        <nav className="sticky top-0 z-30 px-8 py-6 flex items-center justify-between">
          <Link 
            href="/login"
            className="flex items-center gap-2 text-primary font-label font-semibold uppercase tracking-widest text-xs hover:opacity-70 transition-opacity no-underline"
          >
            <Icon name="arrow_back" size={20} />
            Back to login
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-6 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" fill="currentColor"></path>
              </svg>
            </div>
            <span className="font-headline font-bold text-lg tracking-tight">Hermes AI</span>
          </div>
        </nav>

        <main className="flex-grow flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-xl">
            {/* Welcome Text */}
            <div className="mb-10">
              <h1 className="font-headline text-4xl lg:text-5xl text-on-surface leading-tight mb-4">Create your workspace</h1>
              <p className="font-body text-on-surface-variant text-lg">Get started with Hermes AI. Enter your details to register your new editorial environment.</p>
            </div>

            {/* Form Container */}
            <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-xl ring-1 ring-outline-variant/15">
              <form action={formAction} className="space-y-6">
                {state?.error && (
                  <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium">
                    {state.error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="name">Full Name</label>
                  <input 
                    id="name"
                    name="name"
                    required
                    className="w-full bg-white border-0 ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all" 
                    placeholder="e.g. Alex Rivera" 
                    type="text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="email">Professional Email</label>
                  <input 
                    id="email"
                    name="email"
                    required
                    className="w-full bg-white border-0 ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all" 
                    placeholder="alex@company.ai" 
                    type="email"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="password">Password</label>
                  <div className="relative">
                    <input 
                      id="password"
                      name="password"
                      required
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all pr-12" 
                      placeholder="••••••••" 
                      type={showPassword ? 'text' : 'password'}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors border-0 bg-transparent"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="workspaceName">Workspace Name</label>
                    <input 
                      id="workspaceName"
                      name="workspaceName"
                      required
                      onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))}
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all" 
                      placeholder="Research Ops" 
                      type="text"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1" htmlFor="workspaceSlug">Workspace Slug</label>
                    <input 
                      id="workspaceSlug"
                      name="workspaceSlug"
                      required
                      value={workspaceSlug}
                      onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase())}
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all font-mono text-sm" 
                      placeholder="research-ops" 
                      type="text"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-3 text-white font-body font-bold py-5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all group bg-gradient-to-br from-primary to-primary-container disabled:opacity-70 disabled:cursor-not-allowed border-0"
                  >
                    {isPending ? 'Creating Workspace...' : 'Register Workspace'}
                    <Icon name="arrow_forward" className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        {/* Footer Meta */}
        <footer className="p-8 flex justify-center lg:justify-start">
          <div className="flex items-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            <span className="font-label text-[10px] font-bold uppercase tracking-widest">Trusted by leading publications</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
