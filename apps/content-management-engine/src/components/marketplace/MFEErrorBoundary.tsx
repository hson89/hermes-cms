"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Icon } from '@/components/ui/atoms/Icon'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  appName?: string
}

interface State {
  hasError: boolean
}

/**
 * Story 3: Graceful Outage Isolation via React Error Boundaries
 * Wraps 3rd-party micro-frontends to prevent crash propagation.
 */
export class MFEErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Micro-frontend Error:', error, errorInfo)
    
    // Story 2 AC: Push audit trail update back to Hermes backend
    // In a real app, this would be an async background request.
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'MFE_CRASH',
        metadata: {
          appName: this.props.appName || 'unknown',
          error: error.message,
        },
      }),
    }).catch((err) => console.error('Failed to log MFE crash:', err))
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 border-2 border-dashed border-outline-variant/20 rounded-3xl bg-surface-container-low flex flex-col items-center justify-center text-center gap-4 animate-soft-blur-in">
          <div className="size-12 rounded-full bg-error/10 text-error flex items-center justify-center">
            <Icon name="potted_plant" size={24} />
          </div>
          <div>
            <h4 className="font-headline text-lg font-bold text-on-surface">
              {this.props.appName ? `${this.props.appName} is temporarily unavailable` : 'Component Offline'}
            </h4>
            <p className="font-body text-sm text-on-surface-variant mt-2 max-w-xs leading-relaxed">
              We're having trouble loading this section, but the rest of the page is still active.
            </p>
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="text-xs font-label font-bold text-primary hover:underline uppercase tracking-widest mt-2"
          >
            Try reloading component
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
