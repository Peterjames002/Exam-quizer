import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/form(.*)',
]);

// Only use Clerk middleware if publishable key is configured
// This prevents 500 errors when env vars aren't set
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default clerkPublishableKey
  ? clerkMiddleware(async (auth, request: NextRequest) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : // Fallback middleware when Clerk isn't configured
    async (request: NextRequest) => {
      // Allow all requests to pass through when Clerk isn't configured
      // This prevents 500 errors during deployment before env vars are set
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
