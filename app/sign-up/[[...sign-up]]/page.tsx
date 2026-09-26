'use client'

import { SignUp } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { agentDebugIngestJson } from '@/lib/agentDebugIngest'

export default function SignUpPage() {
  const [mounted, setMounted] = useState(false)
  
  // #region agent log
  useEffect(() => {
    setMounted(true)
    if (process.env.NODE_ENV !== 'development') return

    // Check if Clerk is available in window (client-side)
    const clerkAvailable = typeof window !== 'undefined' && !!(window as any).Clerk
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    agentDebugIngestJson({location:'app/sign-up/[[...sign-up]]/page.tsx:11',message:'Sign-up page mounted',data:{clerkPublishableKey:clerkPublishableKey?.substring(0,20) || 'MISSING',hasKey:!!clerkPublishableKey,clerkAvailable,currentPath:window.location.pathname},runId:'run1',hypothesisId:'C'})
    
    // Check if SignUp component container exists after a delay
    setTimeout(() => {
      const signUpContainer = document.querySelector('[data-clerk-element="sign-up"]') || document.querySelector('.cl-signUp-root')
      agentDebugIngestJson({location:'app/sign-up/[[...sign-up]]/page.tsx:15',message:'SignUp component render check',data:{hasContainer:!!signUpContainer,bodyChildren:document.body.children.length},runId:'run1',hypothesisId:'F'})
    }, 2000)
    
    // Track all failed resource loads (404s) - enhanced tracking
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      // Handle different types: string, URL, or Request
      let url = 'unknown'
      if (typeof args[0] === 'string') {
        url = args[0]
      } else if (args[0] instanceof URL) {
        url = args[0].toString()
      } else if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
        url = (args[0] as Request).url
      }
      return originalFetch.apply(this, args)
        .then((response) => {
          // Track 404 responses
          if (response.status === 404) {
            agentDebugIngestJson({location:'app/sign-up/[[...sign-up]]/page.tsx:24',message:'404 response detected',data:{url,status:response.status,statusText:response.statusText},runId:'run1',hypothesisId:'D'})
          }
          return response
        })
        .catch((error) => {
          agentDebugIngestJson({location:'app/sign-up/[[...sign-up]]/page.tsx:30',message:'Failed fetch detected',data:{url,error:error.message || String(error)},runId:'run1',hypothesisId:'D'})
          throw error
        })
    }
    
    // Track JavaScript errors and resource load errors
    const errorHandler = (event: ErrorEvent) => {
      const target = event.target as HTMLElement
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG')) {
        const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || (target as HTMLImageElement).src || ''
        // Log ALL resource load errors
        agentDebugIngestJson({location:'app/sign-up/[[...sign-up]]/page.tsx:40',message:'Resource load error',data:{tagName:target.tagName,src,errorMessage:event.message,isClerk:src.includes('clerk') || src.includes('sign-in') || src.includes('sign-up')},runId:'run1',hypothesisId:'D'})
      } else {
        // JavaScript error
        agentDebugIngestJson({location:'app/sign-up/[[...sign-up]]/page.tsx:45',message:'JavaScript error on sign-up page',data:{errorMessage:event.message,errorSource:event.filename || 'NONE',errorLine:event.lineno || 'NONE',errorCol:event.colno || 'NONE',errorStack:event.error?.stack || 'NONE'},runId:'run1',hypothesisId:'E'})
      }
    }
    
    window.addEventListener('error', errorHandler, true)
    
    // Also track PerformanceObserver for failed network requests
    if ('PerformanceObserver' in window) {
      try {
        const perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Type guard for PerformanceResourceTiming
            if ('responseStatus' in entry) {
              const resourceEntry = entry as PerformanceEntry & { responseStatus?: number; name?: string; initiatorType?: string }
              if (resourceEntry.responseStatus === 404 || resourceEntry.responseStatus === 0) {
                agentDebugIngestJson({location:'app/sign-up/[[...sign-up]]/page.tsx:57',message:'Performance entry 404',data:{name:resourceEntry.name || 'unknown',responseStatus:resourceEntry.responseStatus,initiatorType:resourceEntry.initiatorType || 'unknown'},runId:'run1',hypothesisId:'D'})
              }
            }
          }
        })
        perfObserver.observe({ entryTypes: ['resource'] })
      } catch (e) {
        // PerformanceObserver might not be supported
      }
    }
    
    return () => {
      window.fetch = originalFetch
      window.removeEventListener('error', errorHandler, true)
    }
  }, [])
  // #endregion
  
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg"
          }
        }}
      />
    </div>
  )
}
