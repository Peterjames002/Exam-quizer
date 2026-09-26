'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ConvexErrorBoundary extends Component<Props, State> {
  private unhandledRejectionHandler?: (event: PromiseRejectionEvent) => void
  private errorHandler?: (event: ErrorEvent) => void

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  componentDidMount() {
    // Catch unhandled promise rejections (like WebSocket errors)
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      // Don't catch Convex errors on auth pages
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        if (path.startsWith('/sign-in') || path.startsWith('/sign-up')) {
          return // Let errors pass through on auth pages
        }
      }
      
      const reason = event.reason
      const errorMessage = reason?.message || String(reason) || ''
      
      if (
        errorMessage.includes('Convex') ||
        errorMessage.includes('deployment name') ||
        errorMessage.includes('CONVEX FATAL ERROR') ||
        errorMessage.includes('Couldn\'t parse')
      ) {
        event.preventDefault()
        this.setState({ 
          hasError: true, 
          error: reason instanceof Error ? reason : new Error(errorMessage) 
        })
      }
    }
    
    // Catch unhandled errors
    this.errorHandler = (event: ErrorEvent) => {
      // Don't catch Convex errors on auth pages
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        if (path.startsWith('/sign-in') || path.startsWith('/sign-up')) {
          return // Let errors pass through on auth pages
        }
      }
      
      const errorMessage = event.message || ''
      if (
        errorMessage.includes('Convex') ||
        errorMessage.includes('deployment name') ||
        errorMessage.includes('CONVEX FATAL ERROR') ||
        errorMessage.includes('Couldn\'t parse')
      ) {
        event.preventDefault()
        this.setState({ 
          hasError: true, 
          error: event.error || new Error(errorMessage) 
        })
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler)
      window.addEventListener('error', this.errorHandler)
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      if (this.unhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler)
      }
      if (this.errorHandler) {
        window.removeEventListener('error', this.errorHandler)
      }
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if error is related to Convex provider
    const isConvexError = 
      error.message?.includes('Convex') ||
      error.message?.includes('useMutation') ||
      error.message?.includes('useQuery') ||
      error.message?.includes('ConvexProvider') ||
      error.message?.includes('deployment name') ||
      error.message?.includes('CONVEX FATAL ERROR')
    
    // Don't catch Convex errors on auth pages - let them render normally
    // Auth pages don't need Convex, so errors there shouldn't block rendering
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path.startsWith('/sign-in') || path.startsWith('/sign-up')) {
        // On auth pages, don't catch Convex errors - they shouldn't need Convex anyway
        throw error
      }
    }
    
    if (isConvexError) {
      return { hasError: true, error }
    }
    
    // Re-throw non-Convex errors
    throw error
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Convex error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      const isConfigured = convexUrl && (convexUrl.includes('.convex.cloud') || convexUrl.includes('.convex.site'))
      
      if (!isConfigured) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Configuration Required</h1>
              <p className="text-gray-600 mb-4">
                The Convex database is not configured. Please set the <code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_CONVEX_URL</code> environment variable.
              </p>
              <p className="text-sm text-gray-500">
                If you're deploying to Vercel, add this environment variable in your project settings.
              </p>
            </div>
          </div>
        )
      }
      
      // If configured but still erroring, show generic error
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Database Connection Error</h1>
            <p className="text-gray-600 mb-4">
              Unable to connect to the Convex database. Please check your configuration.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
