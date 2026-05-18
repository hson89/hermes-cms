"use client"

import React, { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/(frontend)/login/actions'
import { Heading } from '../ui/atoms/Heading'
import { Text } from '../ui/atoms/Text'
import { Button } from '../ui/atoms/Button'
import { FormField } from '../ui/molecules/FormField'
import { Icon } from '../ui/atoms/Icon'

export const LoginPage: React.FC = () => {
  const [state, formAction, isPending] = useActionState(loginAction, null)

  useEffect(() => {
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
          <Heading level={1} className="text-on-primary">
            Welcome back to the future of content.
          </Heading>
          <Text variant="large" className="text-surface-container-low mt-6 max-w-xl">
            Experience the scholarly curation of information powered by enterprise-grade headless architecture.
          </Text>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-surface-container-lowest p-8 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <div className="font-headline text-2xl font-black text-on-surface mb-8 tracking-tight flex items-center gap-2">
              <Icon name="dataset" filled className="text-primary" />
              Hermes AI
            </div>
            <Heading level={2} data-custom-view="v2">Sign In</Heading>
            <Text className="text-on-surface-variant mt-2">Access your editorial workspace.</Text>
          </div>

          <form action={formAction} className="space-y-6 w-full">
            {state?.error && (
              <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {state.error}
              </div>
            )}
            
            <FormField 
              label="Professional Email"
              id="email"
              name="email"
              type="email"
              placeholder="curator@publication.com"
              required
            />

            <div className="space-y-2">
              <FormField 
                label="Password"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••••••"
                required
              />
              <div className="flex justify-end">
                <button 
                  type="button"
                  className="font-label text-xs text-primary hover:text-primary-container transition-colors font-medium bg-transparent border-0 p-0 cursor-pointer"
                  onClick={() => alert('Password reset functionality is coming soon.')}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                isLoading={isPending}
                className="w-full"
                type="submit"
              >
                {isPending ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="mt-12 text-center border-t border-outline-variant/20 pt-8">
            <Link 
              className="font-body text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1 group no-underline" 
              href="/signup"
            >
              Sign up for a new workspace
              <Icon name="arrow_right_alt" size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}



