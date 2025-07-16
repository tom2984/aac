import { Inter } from 'next/font/google'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { UserProvider } from './UserProvider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AAC - Construction Forms Platform',
  description: 'Internal form management platform for construction company',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.markerConfig = {
                project: '6877c535023390f021d37be52',
                source: 'snippet'
              };
            `
          }}
        />
        <script
          async
          src="https://edge.marker.io/latest/shim.js"
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
