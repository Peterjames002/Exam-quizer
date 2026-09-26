import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get a short-lived URL the client can POST a file to directly
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Resolve a stored file's id to a fetchable URL
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
