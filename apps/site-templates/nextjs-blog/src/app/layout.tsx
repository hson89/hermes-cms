import React from 'react'
import '@fontsource/material-symbols-outlined'
import './globals.css'

export const metadata = {
  title: 'The Digital Curator — Hermes AI Blog',
  description: 'A premium, high-end editorial reading experience powered by Hermes CMS.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts: Inter, Noto Serif, Public Sans (imported via global CSS) */}
        {/* Material Symbols Outlined imported via @fontsource/material-symbols-outlined npm package */}
      </head>
      <body>
        <header className="navbar-container">
          <nav className="navbar">
            <span className="navbar-brand">HERMES AI</span>
            <div className="navbar-links">
              <span className="navbar-tag">ARCHIVAL FEEDS</span>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <p>© 2026 Hermes AI. The Digital Curator. All Rights Reserved.</p>
        </footer>
      </body>
    </html>
  )
}
