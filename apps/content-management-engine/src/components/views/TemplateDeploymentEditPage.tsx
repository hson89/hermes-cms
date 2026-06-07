"use client"

import React, { useState, useEffect } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Badge } from '@/components/ui/atoms/Badge'
import { Label } from '@/components/ui/atoms/Label'
import { Card } from '@/components/ui/molecules/Card'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'

interface DeploymentRecord {
  id: string
  template: { id: string; name?: string; slug?: string } | string
  site: { id: string; name?: string; url?: string } | string
  tenant: { id: string; name?: string } | string
  triggeredBy: { id: string; email?: string } | string
  status: 'pending' | 'success' | 'failed'
  payload: any
  createdAt: string
}

export const TemplateDeploymentEditPage: React.FC = () => {
  const { id, doc } = useDocumentInfo() as any
  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // If doc is already available from useDocumentInfo, use it
    if (doc && Object.keys(doc).length > 0) {
      setDeployment(doc as unknown as DeploymentRecord)
      setIsLoading(false)
      return
    }

    if (!id) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/template-deployments/${id}?depth=1`)
        if (!response.ok) throw new Error('Failed to fetch deployment details')
        const data = await response.json()
        setDeployment(data)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, doc])

  if (isLoading) {
    return (
      <div className="custom-deployment-view p-12 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <Text className="text-on-surface-variant font-label animate-pulse">RETRACING ARCHIVAL RECORD...</Text>
        </div>
      </div>
    )
  }

  if (error || !deployment) {
    return (
      <div className="custom-deployment-view p-12">
        <Card className="p-8 border-error/20 bg-error-container/5">
          <Heading level={2} className="text-error mb-4">Registry Retrieval Failed</Heading>
          <Text>{error || 'The requested deployment record could not be found in the archival system.'}</Text>
        </Card>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success'
      case 'failed': return 'error'
      default: return 'gold'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return 'check_circle'
      case 'failed': return 'error'
      default: return 'pending'
    }
  }

  return (
    <div className="custom-deployment-view min-h-screen bg-surface-container-lowest text-on-surface">
      <div className="p-8 max-w-7xl mx-auto">
        <RegistryHeader 
          title={`Deployment #${deployment.id}`}
          subtitle="Historical deployment record for template orchestration."
          breadcrumbs={['Registry', 'Deployments', String(deployment.id)]}
        />
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8 pt-0">
        {/* Status Section */}
        <section className="flex items-center justify-between p-6 rounded-xl bg-surface-container-low border-ghost border-opacity-10">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-full ${deployment.status === 'pending' ? 'bg-tertiary-container/20 text-tertiary animate-pulse' : deployment.status === 'success' ? 'bg-success-container/20 text-success' : 'bg-error-container/20 text-error'}`}>
              <Icon name={getStatusIcon(deployment.status)} className="!text-3xl" />
            </div>
            <div>
              <Heading level={3} className="font-serif !mb-1 capitalize">
                {deployment.status}
              </Heading>
              <Text className="text-on-surface-variant text-sm font-label uppercase tracking-widest">
                Current Operational State
              </Text>
            </div>
          </div>
          <Badge 
            color={getStatusColor(deployment.status) as any} 
            size="lg" 
            className={deployment.status === 'pending' ? 'animate-shimmer' : ''}
          >
            {deployment.status.toUpperCase()}
          </Badge>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Metadata Cards */}
          <Card className="md:col-span-1 p-6 space-y-6">
            <div>
              <Label className="text-on-surface-variant text-[10px] uppercase tracking-tighter mb-2 block">Source Template</Label>
              <Text className="font-bold text-primary">
                {deployment.template && typeof deployment.template === 'object' 
                  ? (deployment.template.name || deployment.template.slug) 
                  : (deployment.template || 'N/A')}
              </Text>
            </div>
            <div>
              <Label className="text-on-surface-variant text-[10px] uppercase tracking-tighter mb-2 block">Target Site</Label>
              <Text className="font-bold">
                {deployment.site && typeof deployment.site === 'object' 
                  ? deployment.site.name 
                  : (deployment.site || 'N/A')}
              </Text>
            </div>
            <div>
              <Label className="text-on-surface-variant text-[10px] uppercase tracking-tighter mb-2 block">Orchestrator</Label>
              <Text className="text-sm">
                {deployment.triggeredBy && typeof deployment.triggeredBy === 'object' 
                  ? deployment.triggeredBy.email 
                  : (deployment.triggeredBy || 'System')}
              </Text>
            </div>
            <div>
              <Label className="text-on-surface-variant text-[10px] uppercase tracking-tighter mb-2 block">Archival Timestamp</Label>
              <Text className="text-xs text-on-surface-variant font-label">
                {new Date(deployment.createdAt).toLocaleString(undefined, { 
                  dateStyle: 'full', 
                  timeStyle: 'medium' 
                })}
              </Text>
            </div>
          </Card>

          {/* Payload JSON View */}
          <Card className="md:col-span-2 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <Heading level={4} className="font-serif">Deployment Manifest</Heading>
              <Badge color="neutral" size="sm" icon="code">JSON</Badge>
            </div>
            <div className="flex-grow bg-surface-dim rounded-lg p-6 overflow-auto border border-outline-variant/10">
              <pre className="text-xs font-mono text-on-surface-variant leading-relaxed">
                {JSON.stringify(deployment.payload, null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        .custom-deployment-view .animate-shimmer {
          background-image: linear-gradient(90deg, transparent, rgba(109, 94, 0, 0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
