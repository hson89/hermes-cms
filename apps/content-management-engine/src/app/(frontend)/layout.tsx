import React from 'react'
import '../globals.css'

export const metadata = {
  title: 'Hermes AI',
  description: 'Multi-tenant AI-powered Headless CMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
