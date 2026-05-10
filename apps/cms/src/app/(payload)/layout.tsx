/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT DIRECTLY. */
import React from 'react'
import { RootLayout } from '@payloadcms/next/layouts'
import configPromise from '@/payload.config'
import { importMap } from './admin/importMap'
import { handleServerFunctions } from './server-functions'

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => (
  <RootLayout 
    config={configPromise} 
    importMap={importMap} 
    serverFunction={handleServerFunctions}
  >
    {children}
  </RootLayout>
)

export default Layout
