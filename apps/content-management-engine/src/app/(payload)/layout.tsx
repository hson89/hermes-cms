/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT DIRECTLY. */
import React from 'react'
import '../globals.css'
import { RootLayout } from '@payloadcms/next/layouts'
import configPromise from '@/payload.config'
import { importMap as realImportMap } from './admin/importMap.js'
import { handleServerFunctions } from './server-functions'
import { BRANDING } from '@/constants/branding'

export const metadata = {
  title: BRANDING.adminTitle,
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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;500;700&family=Inter:wght@400;500;700&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" 
      />
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
      />
      {children}
    </RootLayout>
  )
}

export default Layout
