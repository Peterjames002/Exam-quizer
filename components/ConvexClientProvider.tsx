'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useMemo } from 'react'

function isValidConvexUrl(url: string | undefined): boolean {
  if (!url) return false
  // Valid Convex URLs should contain .convex.cloud or .convex.site
  return url.includes('.convex.cloud') || url.includes('.convex.site')
}

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    const isServer = typeof window === 'undefined'
    
    // Only create client if we have a valid Convex URL
    if (!isValidConvexUrl(convexUrl)) {
      if (!isServer) {
        console.warn('NEXT_PUBLIC_CONVEX_URL is not set or invalid. Convex features will not work.')
      }
      
      // Always provide a placeholder client to prevent hook errors
      // This allows components to render without crashing, even if Convex isn't configured
      // The placeholder URL format is valid but won't actually connect
      return new ConvexReactClient('https://build-time-placeholder.convex.cloud')
    }
    
    try {
      // convexUrl is guaranteed to be defined here due to isValidConvexUrl check
      return new ConvexReactClient(convexUrl!)
    } catch (error) {
      console.error('Failed to initialize Convex client:', error)
      // Always provide a placeholder client to prevent crashes
      return new ConvexReactClient('https://build-time-placeholder.convex.cloud')
    }
  }, [])

  // Always render ConvexProvider to prevent hook errors
  // Components using Convex hooks will work, but mutations/queries will fail gracefully
  // The error boundary will catch and display configuration messages when needed
  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
