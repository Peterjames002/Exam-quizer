import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// The Clerk user id of the caller, taken from the verified session token —
// never from function arguments, which any caller can forge.
export async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export async function requireUserId(ctx: QueryCtx): Promise<string> {
  const userId = await getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// Returns the form only if the signed-in caller owns it, otherwise null.
export async function getOwnedForm(ctx: QueryCtx, formId: Id<"forms">) {
  const userId = await getUserId(ctx);
  if (!userId) return null;
  const form = await ctx.db.get(formId);
  return form && form.userId === userId ? form : null;
}

export async function requireOwnedForm(ctx: QueryCtx, formId: Id<"forms">) {
  const form = await getOwnedForm(ctx, formId);
  if (!form) throw new Error("Unauthorized");
  return form;
}
