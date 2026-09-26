import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { ConvexErrorBoundary } from '@/components/ConvexErrorBoundary'
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Form Builder - Create Forms Like Google Forms',
  description: 'Build forms manually or upload Word documents to create forms automatically',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // #region agent log
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const clerkSecretKey = process.env.CLERK_SECRET_KEY ? 'SET' : 'MISSING'
  // Server-side logging (this runs on server)
  if (typeof window === 'undefined') {
    // Use console for server-side since fetch might not work in all server contexts
    console.log('[DEBUG] Clerk env check:', {
      hasPublishableKey: !!clerkPublishableKey,
      publishableKeyLength: clerkPublishableKey?.length || 0,
      publishableKeyPrefix: clerkPublishableKey?.substring(0, 20) || 'NONE',
      hasSecretKey: clerkSecretKey === 'SET'
    })
  }
  // #endregion

  return (
    <ClerkProvider publishableKey={clerkPublishableKey || undefined}>
      <html lang="en">
        <body className={`${inter.className} min-h-screen overflow-x-hidden bg-gray-50`}>
          <ConvexErrorBoundary>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ConvexErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
