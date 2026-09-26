import type { AuthConfig } from "convex/server";

// Lets Convex verify Clerk session tokens. CLERK_JWT_ISSUER_DOMAIN is set on the
// Convex deployment (npx convex env set), and is the Clerk app's Frontend API URL.
const authConfig: AuthConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
