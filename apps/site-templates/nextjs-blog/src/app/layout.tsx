import React from 'react'
import './globals.css'

export const metadata = {
  title: 'The Digital Curator — Hermes AI Blog',
  description: 'A premium, high-end editorial reading experience powered by Hermes AI Headless CMS.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Noto+Serif:ital,wght@0,300;0,400;0,600;1,400&family=Public+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
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
