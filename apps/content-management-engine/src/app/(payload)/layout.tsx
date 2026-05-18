/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT DIRECTLY. */
import React from 'react'
import '../globals.css'
import { RootLayout } from '@payloadcms/next/layouts'
import configPromise from '@/payload.config'
import { importMap as realImportMap } from './admin/importMap.js'
import { handleServerFunctions } from './server-functions'

export const metadata = {
  title: 'Hermes AI Admin',
}

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => {
  return (
    <RootLayout 
      config={configPromise} 
      importMap={realImportMap} 
      serverFunction={handleServerFunctions}
    >
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
      />
      {children}
    </RootLayout>
  )
}

export default Layout
