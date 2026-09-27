import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { ConvexErrorBoundary } from '@/components/ConvexErrorBoundary'
import { ClerkProvider } from '@clerk/nextjs'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Exam Builder — Set, share and mark exams online',
  description:
    'Build objective and essay exams from a Word document, share a time-limited link, mark objective answers instantly and essays from one dashboard — with camera monitoring and anti-cheating built in.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || undefined}>
      <html lang="en">
        <body className={`${inter.className} min-h-screen flex flex-col overflow-x-hidden bg-gray-50 text-gray-900`}>
          <ConvexErrorBoundary>
            <ConvexClientProvider>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </ConvexClientProvider>
          </ConvexErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
