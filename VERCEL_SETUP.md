# Vercel Deployment Setup

## Required Environment Variables

To deploy this application to Vercel, you need to configure the following environment variables in your Vercel project settings.

### Step-by-Step Instructions:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** (Quiz-App or Form)
3. **Click "Settings"** in the top navigation
4. **Click "Environment Variables"** in the left sidebar
5. **Add each variable** by clicking "Add New"

### 1. Clerk Authentication Variables

Add these two variables:

**Variable 1:**
- **Name**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Value**: `<your Clerk publishable key>`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**Variable 2:**
- **Name**: `CLERK_SECRET_KEY`
- **Value**: `<your Clerk secret key>`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**Note:** Replace with your actual Clerk keys from your Clerk dashboard if different.

### 2. Convex Database Variable (REQUIRED - This fixes the error you're seeing!)

**Variable:**
- **Name**: `NEXT_PUBLIC_CONVEX_URL`
- **Value**: `<your Convex deployment URL>`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**Note:** Replace with your actual Convex deployment URL if different.

## After Adding Variables

**IMPORTANT:** After adding all environment variables:

1. **Go to the "Deployments" tab** in your Vercel project
2. **Click the three dots (⋯)** on your latest deployment
3. **Click "Redeploy"**
4. **Wait for the deployment to complete**

Alternatively, you can push a new commit to trigger a redeploy automatically.

**The "Configuration Required" message will disappear once the environment variable is set and the site is redeployed.**

## Important Notes

- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- `CLERK_SECRET_KEY` should NOT be prefixed with `NEXT_PUBLIC_` (it's server-only)
- After adding environment variables, you must trigger a new deployment

## Verification

After setting up the environment variables and redeploying, check:
- The build completes successfully
- Authentication works (Clerk sign-in/sign-up)
- Database operations work (Convex queries/mutations)
