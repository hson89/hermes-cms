'use client'

import React, { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)

  React.useEffect(() => {
    if (state?.success) {
      window.location.href = '/admin'
    }
  }, [state])

  return (
    <main className="bg-background text-on-surface font-body antialiased min-h-screen flex w-full overflow-hidden">
      {/* Left side: Hero Image */}
      <div className="hidden lg:flex w-[55%] relative bg-surface-dim overflow-hidden flex-col justify-end">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ 
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDjUF9t8MTSyx_Cb7ZbO42YnzjOT45cQhgaXHVtbR5P6bsoGvCFOAOj0bmE3-6-T8CdqyFuHElVFbXdvxRkCfx1ggHDY779slG14u5TNjKhrY4SwSLTd7p40qip7NqRWZQR_cjknXaojL1KZ-HZg5cop6RIKA3ukMqKO8hAYW66dUWR3APXMmUZC4Ab5cWe3NFvepF64y1kuN3l4dp87dNB0HbeF9bVBc6ETZkL45693rQqNQBVdSxrUZA6POUAZqgx3LE-7SKsTF5F')" 
          }}
          aria-label="A highly sophisticated, premium editorial workspace viewed from a dynamic angle."
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-on-background/90 via-on-background/40 to-transparent"></div>
        <div className="relative z-10 p-16 pb-24 max-w-3xl">
          <h1 className="font-headline text-5xl md:text-6xl text-on-primary font-bold leading-tight tracking-tight">
            Welcome back to the future of content.
          </h1>
          <p className="font-body text-surface-container-low text-lg mt-6 max-w-xl leading-relaxed">
            Experience the scholarly curation of information powered by enterprise-grade headless architecture.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-surface-container-lowest p-8 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <div className="font-headline text-2xl font-black text-on-surface mb-8 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                dataset
              </span>
              Hermes AI
            </div>
            <h2 className="font-headline text-4xl text-on-surface font-bold tracking-tight">Sign In</h2>
            <p className="font-body text-on-surface-variant mt-2 text-base">Access your editorial workspace.</p>
          </div>

          <form action={formAction} className="space-y-6 w-full">
            {state?.error && (
              <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {state.error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="font-label text-sm text-on-surface font-semibold tracking-wide" htmlFor="email">
                Professional Email
              </label>
              <input 
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3.5 font-body text-on-surface text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm" 
                id="email" 
                name="email"
                placeholder="curator@publication.com" 
                type="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-label text-sm text-on-surface font-semibold tracking-wide" htmlFor="password">
                  Password
                </label>
                <button 
                  type="button"
                  className="font-label text-xs text-primary hover:text-primary-container transition-colors font-medium bg-transparent border-0 p-0 cursor-pointer"
                  onClick={() => alert('Password reset functionality is coming soon.')}
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3.5 font-body text-on-surface text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm" 
                id="password" 
                name="password"
                placeholder="••••••••••••" 
                type="password"
                required
              />
            </div>

            <div className="pt-4">
              <button 
                disabled={isPending}
                className="w-full btn-primary-gradient font-label font-bold tracking-wide rounded-full py-4 px-6 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base disabled:opacity-70 disabled:cursor-not-allowed" 
                type="submit"
              >
                {isPending ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-12 text-center border-t border-outline-variant/20 pt-8">
            <Link 
              className="font-body text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1 group no-underline" 
              href="/signup"
            >
              Sign up for a new workspace
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_right_alt
              </span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
