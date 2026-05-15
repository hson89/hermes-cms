"use client"

import React from 'react'
import { Gutter } from '@payloadcms/ui'
import { Heading } from '../ui/atoms/Heading'
import { Text } from '../ui/atoms/Text'
import { Icon } from '../ui/atoms/Icon'

export const Dashboard: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[calc(100vh-100px)] font-body text-on-surface bg-background pb-12">
      <div className="w-full relative overflow-hidden bg-surface-dim p-8 md:p-16 mb-8 rounded-b-xl lg:rounded-xl lg:mx-8 lg:mt-8 lg:w-[calc(100%-4rem)] ring-1 ring-outline-variant/15">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30" 
          style={{ 
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDjUF9t8MTSyx_Cb7ZbO42YnzjOT45cQhgaXHVtbR5P6bsoGvCFOAOj0bmE3-6-T8CdqyFuHElVFbXdvxRkCfx1ggHDY779slG14u5TNjKhrY4SwSLTd7p40qip7NqRWZQR_cjknXaojL1KZ-HZg5cop6RIKA3ukMqKO8hAYW66dUWR3APXMmUZC4Ab5cWe3NFvepF64y1kuN3l4dp87dNB0HbeF9bVBc6ETZkL45693rQqNQBVdSxrUZA6POUAZqgx3LE-7SKsTF5F')" 
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-dim via-surface-dim/80 to-transparent"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <Icon name="dataset" filled className="text-primary text-3xl" />
            <span className="font-label text-sm font-bold uppercase tracking-widest text-on-surface-variant">Admin Workspace</span>
          </div>
          <Heading level={1} className="text-on-surface mb-4">
            The Digital Curator
          </Heading>
          <Text variant="large" className="text-on-surface-variant max-w-2xl">
            Welcome to the Hermes AI administrative interface. Manage your structured content, configure AI behavior, and oversee your multi-tenant environments.
          </Text>
        </div>
      </div>

      <Gutter className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <a href="/admin/collections/content-items" className="group p-6 bg-surface-container-lowest rounded-xl ring-1 ring-outline-variant/15 hover:ring-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer block no-underline text-on-surface">
            <div className="h-12 w-12 bg-primary-fixed text-on-primary-fixed flex items-center justify-center rounded-lg mb-4 group-hover:scale-105 transition-transform">
              <Icon name="article" size={24} />
            </div>
            <Heading level={3} className="text-lg mb-2">Content Items</Heading>
            <Text className="text-sm text-on-surface-variant m-0">Manage and curate rich text content and AI-generated articles.</Text>
          </a>

          <a href="/admin/collections/content-types" className="group p-6 bg-surface-container-lowest rounded-xl ring-1 ring-outline-variant/15 hover:ring-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer block no-underline text-on-surface">
            <div className="h-12 w-12 bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center rounded-lg mb-4 group-hover:scale-105 transition-transform">
              <Icon name="schema" size={24} />
            </div>
            <Heading level={3} className="text-lg mb-2">Content Types</Heading>
            <Text className="text-sm text-on-surface-variant m-0">Define the schema and structure of your headless data models.</Text>
          </a>

          <a href="/admin/collections/tenants" className="group p-6 bg-surface-container-lowest rounded-xl ring-1 ring-outline-variant/15 hover:ring-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer block no-underline text-on-surface">
            <div className="h-12 w-12 bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center rounded-lg mb-4 group-hover:scale-105 transition-transform">
              <Icon name="domain" size={24} />
            </div>
            <Heading level={3} className="text-lg mb-2">Tenants</Heading>
            <Text className="text-sm text-on-surface-variant m-0">Configure isolated workspaces and logical domains.</Text>
          </a>
        </div>
      </Gutter>
    </div>
  )
}
