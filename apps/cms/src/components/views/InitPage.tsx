"use client"

import React, { useState, useEffect } from 'react'
import { setupInitialAdmin } from '@/app/(payload)/admin/actions'
import { Icon } from '../ui/atoms/Icon'

export const InitPage: React.FC = () => {
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
            <Icon name="arrow_back" size={20} />
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
            <div className="bg-surface-container-lowest backdrop-blur-2xl p-8 rounded-xl shadow-2xl shadow-on-surface/5">
              <form action={setupInitialAdmin} className="space-y-6">
                <div className="space-y-1">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Full Name</label>
                  <div className="relative">
                    <input 
                      name="name"
                      required
                      className="w-full bg-surface-container-low border-0 focus:bg-surface-container-high rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all outline-none" 
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
                      className="w-full bg-surface-container-low border-0 focus:bg-surface-container-high rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all outline-none" 
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
                      className="w-full bg-surface-container-low border-0 focus:bg-surface-container-high rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all pr-12 outline-none" 
                      placeholder="••••••••" 
                      type={showPassword ? 'text' : 'password'}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
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
                      className="w-full bg-surface-container-low border-0 focus:bg-surface-container-high rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all outline-none" 
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
                      className="w-full bg-surface-container-low border-0 focus:bg-surface-container-high rounded-lg py-4 px-5 font-body text-on-surface placeholder:text-outline transition-all font-mono text-sm outline-none" 
                      placeholder="research-ops" 
                      type="text"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 text-on-primary font-body font-bold py-5 rounded-lg hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all bg-primary no-underline border-none cursor-pointer"
                  >
                    Initialize Workspace
                    <Icon name="arrow_forward" className="transition-transform group-hover:translate-x-1" />
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
              <Icon name="token" size={20} />
              <Icon name="shield" size={20} />
              <Icon name="cloud_done" size={20} />
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}


