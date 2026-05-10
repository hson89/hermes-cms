import React from 'react'
import '../globals.css'

export const metadata = {
  title: 'Hermes CMS',
  description: 'Multi-tenant AI-powered Headless CMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
