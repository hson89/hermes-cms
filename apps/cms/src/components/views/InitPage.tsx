"use client"

import React, { useState, useEffect } from 'react'
import { setupInitialAdmin } from '@/app/(payload)/admin/actions'

const InitPage: React.FC = () => {
  console.log('--- InitPage Rendering (New Design) ---')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Inject font and styles to ensure icons work regardless of global CSS loading state
  useEffect(() => {
    if (!document.getElementById('material-symbols-font')) {
      const link = document.createElement('link')
      link.id = 'material-symbols-font'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
      document.head.appendChild(link)
    }

    const styleId = 'material-symbols-custom-style'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined' !important;
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

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

      {/* Right Side: Setup Form */}
      <div className="w-full lg:w-1/2 flex flex-col relative overflow-y-auto bg-surface-bright">
        {/* Minimal Back Header (Process View) */}
        <nav className="sticky top-0 z-30 px-8 py-6 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-primary font-label font-semibold uppercase tracking-widest text-xs hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back
          </button>
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
            {/* Progress Bar */}
            <div className="mb-12">
              <div className="flex justify-between items-end mb-3">
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-bold">Step 01 / 04</span>
                <span className="font-body text-sm font-medium text-primary">25% Complete</span>
              </div>
              <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: '25%' }}></div>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-10">
              <h1 className="font-headline text-4xl lg:text-5xl text-on-surface leading-tight mb-4">Welcome to Hermes AI</h1>
              <p className="font-body text-on-surface-variant text-lg">Let's get your workspace ready in just a few minutes. Enter your details to initialize the admin profile.</p>
            </div>

            {/* Linear-style Glassmorphic Form Container */}
            <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-xl ring-1 ring-outline-variant/15 shadow-2xl shadow-on-surface/5">
              <form action={setupInitialAdmin} className="space-y-6">
                <div className="space-y-1">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Full Name</label>
                  <div className="relative">
                    <input 
                      name="name"
                      required
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all" 
                      placeholder="e.g. Alex Rivera" 
                      type="text"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Professional Email</label>
                  <div className="relative">
                    <input 
                      name="email"
                      required
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all" 
                      placeholder="alex@company.ai" 
                      type="email"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Password</label>
                  <div className="relative">
                    <input 
                      name="password"
                      required
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all pr-12" 
                      placeholder="••••••••" 
                      type={showPassword ? 'text' : 'password'}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Workspace Name</label>
                    <input 
                      name="workspaceName"
                      required
                      onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))}
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all" 
                      placeholder="Research Ops" 
                      type="text"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Workspace Slug</label>
                    <input 
                      name="workspaceSlug"
                      required
                      value={workspaceSlug}
                      onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase())}
                      className="w-full bg-white border-0 ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all font-mono text-sm" 
                      placeholder="research-ops" 
                      type="text"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 text-white font-body font-bold py-5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 group bg-gradient-to-br from-primary to-primary-container"
                  >
                    Initialize Workspace
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </button>
                </div>
                <p className="text-center font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 pt-4">
                  Secure Initialization Protocol Active
                </p>
              </form>
            </div>
          </div>
        </main>

        {/* Footer Meta */}
        <footer className="p-8 flex justify-center lg:justify-start">
          <div className="flex items-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            <span className="font-label text-[10px] font-bold uppercase tracking-widest">Trusted by</span>
            <div className="flex gap-4">
              <span className="material-symbols-outlined">token</span>
              <span className="material-symbols-outlined">shield</span>
              <span className="material-symbols-outlined">cloud_done</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default InitPage
